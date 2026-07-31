#!/usr/bin/env node
/**
 * CRM Gestion connectivity check — verifies the real integration WITHOUT touching
 * infra/.env, restarting Docker, or going through Stripe.
 *
 * Reads CRM_CLIENT_ID / CRM_CLIENT_SECRET from infra/.env (they're git-ignored,
 * never pass secrets on the command line).
 *
 *   node api-gateway/scripts/crm-check.js
 *       Step 1 only: fetch an OAuth2 client_credentials token and decode it.
 *       Creates NOTHING on the CRM side — safe to run any time.
 *
 *   node api-gateway/scripts/crm-check.js --send
 *       Step 2: also POST one sample payment (the exact JSON the CRM dev signed
 *       off on). ⚠️ This WRITES a real record in his CRM — coordinate first.
 *
 *   node api-gateway/scripts/crm-check.js --send --twice
 *       Sends it twice to prove idempotency. Both answers are 202 ("queued") —
 *       the proof is the SAME correlation_id, i.e. one record, not two. Then it
 *       polls the status endpoint to confirm the recording really succeeded.
 *
 *   node api-gateway/scripts/crm-check.js --status <correlation_id>
 *       Poll the CRM's async status endpoint for a payment we already sent.
 *       The webhook only QUEUES the payment (202 + correlation_id), so this is
 *       the only way to confirm it was really recorded.
 *
 * Options: --env <path> --token-url <url> --url <url> --base <url>
 */

const fs = require('node:fs');
const path = require('node:path');

const BASE_DEFAULT = 'https://api-gestion.winaity.com';
const TOKEN_URL_DEFAULT = 'https://api-gestion.winaity.com/oauth/token';
// ⚠️ api-gestion.winaity.com, NEVER gestion.winaity.com — that host answers 307
// and the POST body is dropped on the redirect.
const API_URL_DEFAULT = 'https://api-gestion.winaity.com/api/webhook/abonnement';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
const has = (name) => process.argv.includes(`--${name}`);

// Minimal .env reader — no dotenv dependency, and it must not choke on the
// `#` comments and blank lines the real file is full of.
function readEnv(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    if (!/^[A-Z0-9_]+$/.test(key)) continue; // skips comments and blank lines
    out[key] = line
      .slice(eq + 1)
      .trim()
      .replace(/^["']|["']$/g, '');
  }
  return out;
}

// The payload the CRM dev validated, field for field. Amounts are in CENTIMES
// (6000 = 60,00 €) and every date carries an explicit Z offset.
function samplePayload(eventId) {
  return {
    event_id: eventId,
    event_type: 'payment.succeeded',
    occurred_at: new Date().toISOString(),
    tenant: {
      id: 'bf6f579f-bed0-4610-88d5-3c4ee277371c',
      name: 'Validation',
      phone: '+33 6 12 34 56 78',
      address: {
        line: '12 rue de la Paix',
        postal_code: '75002',
        city: 'Paris',
        country: 'France',
      },
    },
    admin: {
      id: 'a1b2c3d4-0000-0000-0000-000000000000',
      first_name: 'Ahmed',
      last_name: 'Boughdiri',
      email: 'a.boughdiri@finanssor.fr',
    },
    customer: {
      email: 'validation@gmail.com',
      stripe_customer_id: 'cus_UwBA92Wsmip4UM',
    },
    payment: {
      invoice_id: eventId,
      amount_ht: 5000,
      tva: 1000,
      amount_ttc: 6000,
      currency: 'eur',
      plan: 'pro_org',
      billing_cycle: 'annual',
      status: 'paid',
      subscription_status: 'active',
      paid_at: new Date().toISOString(),
      next_payment_at: new Date(Date.now() + 365 * 864e5).toISOString(),
      stripe_subscription_id: 'sub_1TwIoR3SDTmZuxcV9tiJdaNR',
      hosted_invoice_url: 'https://invoice.stripe.com/i/test',
      invoice_pdf: 'https://pay.stripe.com/invoice/test/pdf',
    },
  };
}

// The webhook is ASYNCHRONOUS: it answers 202 "queued for recording" and hands
// back a correlation_id + status_url. A payload the CRM can't process is
// therefore NOT reported in the HTTP response — this endpoint is the only place
// an async failure becomes visible. Always follow a send with this.
async function pollStatus(base, token, statusPath, attempts = 6, delayMs = 2500) {
  const url = statusPath.startsWith('http') ? statusPath : `${base}${statusPath}`;
  for (let n = 1; n <= attempts; n++) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    const body = await res.text();
    console.log(`    status poll ${n}: HTTP ${res.status} ${body.slice(0, 400)}`);
    if (res.status === 404) {
      console.warn('    ⚠️ 404 — status endpoint may need a different path/auth; ask the CRM dev.');
      return null;
    }
    // Stop as soon as it's no longer pending/queued/processing.
    let parsed = null;
    try {
      parsed = JSON.parse(body);
    } catch {
      /* non-JSON — just show it and keep polling */
    }
    const state = String(
      parsed?.status ?? parsed?.state ?? parsed?.data?.status ?? '',
    ).toLowerCase();
    if (state && !['pending', 'queued', 'processing', 'in_progress'].includes(state)) {
      return parsed;
    }
    if (n < attempts) await new Promise((r) => setTimeout(r, delayMs));
  }
  console.warn('    ⚠️ still not terminal after all polls — ask the CRM dev to confirm it landed.');
  return null;
}

function decodeJwt(token) {
  const part = token.split('.')[1];
  if (!part) return null;
  try {
    return JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

async function main() {
  const envFile = path.resolve(
    arg('env', path.join(__dirname, '..', '..', 'infra', '.env')),
  );
  const env = readEnv(envFile);
  const clientId = process.env.CRM_CLIENT_ID || env.CRM_CLIENT_ID || '';
  const clientSecret = process.env.CRM_CLIENT_SECRET || env.CRM_CLIENT_SECRET || '';
  const tokenUrl = arg('token-url', env.CRM_TOKEN_URL || TOKEN_URL_DEFAULT);
  const apiUrl = arg('url', API_URL_DEFAULT);

  console.log(`env file  : ${envFile}`);
  console.log(`client_id : ${clientId || '(missing!)'}`);
  console.log(`token url : ${tokenUrl}`);
  if (!clientId || !clientSecret) {
    console.error('\n✗ CRM_CLIENT_ID / CRM_CLIENT_SECRET not found — check the env file.');
    process.exit(1);
  }
  if (/\/\/gestion\.winaity\.com/.test(tokenUrl) || /\/\/gestion\.winaity\.com/.test(apiUrl)) {
    console.error('\n✗ Use api-gestion.winaity.com — gestion.winaity.com 307-redirects and drops the POST body.');
    process.exit(1);
  }

  // ── Step 1: OAuth2 client_credentials ──────────────────────────────────────
  // No `scope` param: the CRM ignores it and grants the client's configured
  // scopes. Credentials go in the form body AND as Basic auth (harmless, and
  // covers either server convention).
  console.log('\n[1] POST token endpoint (grant_type=client_credentials)…');
  const form = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  });
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const tRes = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basic}`,
      Accept: 'application/json',
    },
    body: form.toString(),
  });
  const tBody = await tRes.text();
  if (!tRes.ok) {
    console.error(`✗ token endpoint HTTP ${tRes.status}\n${tBody.slice(0, 800)}`);
    process.exit(1);
  }
  const tJson = JSON.parse(tBody);
  const token = tJson.access_token;
  if (!token) {
    console.error(`✗ no access_token in response\n${tBody.slice(0, 800)}`);
    process.exit(1);
  }
  console.log(`✓ token OK — type=${tJson.token_type || '?'} expires_in=${tJson.expires_in}s`);
  const claims = decodeJwt(token);
  if (claims) {
    console.log(
      `  claims: ${JSON.stringify({
        sub: claims.sub,
        scope: claims.scope ?? claims.scopes,
        exp: claims.exp ? new Date(claims.exp * 1000).toISOString() : undefined,
      })}`,
    );
  }
  if (Number(tJson.expires_in) !== 3600) {
    console.warn(`  ⚠️ expected expires_in=3600, got ${tJson.expires_in}`);
  }

  const base = arg('base', BASE_DEFAULT);

  // Standalone: check a correlation_id from an earlier send.
  const statusId = arg('status', '');
  if (statusId) {
    const p = statusId.startsWith('/') ? statusId : `/api/webhook/status/${statusId}`;
    console.log(`\n[2] GET ${base}${p}`);
    await pollStatus(base, token, p);
    return;
  }

  if (!has('send')) {
    console.log('\nStep 2 skipped (no --send). Nothing was written to the CRM.');
    console.log('Run with --send to POST one sample payment (writes a real record).');
    return;
  }

  // ── Step 2: one sample payment ─────────────────────────────────────────────
  // Same event_id on both attempts — that's the whole point: the 2nd must come
  // back 202 with no second record.
  const eventId = `in_crmcheck_${Date.now()}`;
  const attempts = has('twice') ? 2 : 1;
  console.log(`\n[2] POST ${apiUrl}\n    event_id=${eventId} (${attempts} attempt(s))`);

  const correlations = [];
  let statusPath = '';
  for (let n = 1; n <= attempts; n++) {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(samplePayload(eventId)),
    });
    const body = await res.text();
    console.log(`${res.ok ? '✓' : '✗'} attempt ${n}: HTTP ${res.status} ${body.slice(0, 500)}`);
    if (res.status === 400) {
      console.warn('  ⚠️ 400 = strict validation rejected a field. Compare the payload against the agreed schema.');
    }
    try {
      const j = JSON.parse(body);
      if (j.correlation_id) correlations.push(j.correlation_id);
      if (j.status_url) statusPath = j.status_url;
    } catch {
      /* non-JSON body — nothing to correlate */
    }
    if (n < attempts) await new Promise((r) => setTimeout(r, 1500));
  }

  // Dedup evidence: the endpoint answers 202 for BOTH the first send and the
  // replay, so the status code proves nothing. Identical correlation_ids are
  // what show the CRM matched the event_id instead of creating a second record.
  if (correlations.length === 2) {
    const same = correlations[0] === correlations[1];
    console.log(
      same
        ? `✓ dedup OK — both attempts share correlation_id ${correlations[0]}`
        : `✗ dedup PROBLEM — two different correlation_ids (${correlations.join(', ')}): the replay likely created a SECOND record. Flag this to the CRM dev.`,
    );
  }

  // 202 only means "queued". Confirm it actually got recorded.
  if (statusPath) {
    console.log(`\n[3] async status — GET ${base}${statusPath}`);
    await pollStatus(base, token, statusPath);
  } else {
    console.warn('\n[3] no status_url returned — cannot confirm the payment was recorded.');
  }
}

main().catch((err) => {
  console.error('\n✗ crm-check failed:', err?.message || err);
  process.exit(1);
});
