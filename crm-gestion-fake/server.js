// ─────────────────────────────────────────────────────────────────────────────
// Fake "CRM Gestion" — a stand-in for the real CRM while we build/test the
// Winaity payment webhook. It does exactly what the real CRM must do:
//
//   1. Expose ONE POST endpoint (default /webhook/payments).
//   2. Authenticate the caller with a static Bearer token (CRM_API_KEY).
//   3. Verify the HMAC signature (X-Winaity-Signature) over the RAW body, so it
//      knows the payload really came from Winaity and wasn't tampered with.
//   4. Be idempotent: the same event_id is only recorded once (Stripe/our retry
//      worker can deliver the same event more than once — that's expected).
//   5. Return 2xx on success so our side marks the delivery as done.
//
// Everything received is kept in memory and shown at http://localhost:5600 so you
// can watch payments land live. Nothing is persisted — restart = clean slate.
// ─────────────────────────────────────────────────────────────────────────────
require('dotenv').config();
const express = require('express');
const crypto = require('crypto');

const app = express();

const PORT = Number(process.env.PORT || 5600);
// Must match CRM_API_KEY / CRM_HMAC_SECRET set on the api-gateway side.
const API_KEY = process.env.CRM_API_KEY || 'dev-crm-api-key';
const HMAC_SECRET = process.env.CRM_HMAC_SECRET || 'dev-crm-hmac-secret';
const WEBHOOK_PATH = process.env.WEBHOOK_PATH || '/webhook/payments';

// In-memory log of everything we received (newest first) + idempotency set.
const received = [];
const seenEventIds = new Set();

// We need the RAW body to verify the HMAC, so capture it as a Buffer and also
// parse JSON from that same buffer (never re-serialize before verifying).
app.use(
  express.json({
    limit: '2mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf; // Buffer of the exact bytes we received
    },
  }),
);

// Timing-safe HMAC comparison (avoids leaking timing info; also guards against
// length-mismatch throwing inside timingSafeEqual).
function signatureIsValid(rawBody, provided) {
  if (!provided) return false;
  const expected = crypto
    .createHmac('sha256', HMAC_SECRET)
    .update(rawBody)
    .digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ── The endpoint the real CRM must implement ────────────────────────────────
app.post(WEBHOOK_PATH, (req, res) => {
  // 1) Bearer auth
  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (token !== API_KEY) {
    log('AUTH FAILED', { got: token ? '(wrong token)' : '(no token)' });
    return res.status(401).json({ ok: false, error: 'invalid_api_key' });
  }

  // 2) HMAC signature over the raw body
  const sig = req.headers['x-winaity-signature'] || '';
  if (!signatureIsValid(req.rawBody || Buffer.from(''), sig)) {
    log('SIGNATURE INVALID', { signature: sig });
    return res.status(400).json({ ok: false, error: 'invalid_signature' });
  }

  const body = req.body || {};
  const eventId = body.event_id || `(no-event_id)`;

  // 3) Idempotency — same event delivered twice = record once, still return 200
  //    so the sender stops retrying.
  if (seenEventIds.has(eventId)) {
    log('DUPLICATE (ignored)', { event_id: eventId, event_type: body.event_type });
    return res.status(200).json({ ok: true, duplicate: true });
  }
  seenEventIds.add(eventId);

  // 4) Store + print it so you can see exactly what Winaity sent.
  const entry = { received_at: new Date().toISOString(), headers_signature: sig, body };
  received.unshift(entry);
  if (received.length > 200) received.pop();

  log('PAYMENT RECEIVED', {
    event_type: body.event_type,
    event_id: eventId,
    tenant: body.tenant,
    payment: body.payment,
  });

  return res.status(200).json({ ok: true });
});

// ── Tiny dashboard to watch payments arrive ─────────────────────────────────
app.get('/', (_req, res) => {
  const rows = received
    .map(
      (e) => `
      <details>
        <summary>
          <b>${escapeHtml(e.body.event_type || '?')}</b>
          — ${escapeHtml((e.body.tenant && e.body.tenant.name) || '?')}
          — ${escapeHtml(String((e.body.payment && e.body.payment.amount_ttc) ?? ''))}
          ${escapeHtml((e.body.payment && e.body.payment.currency) || '')}
          <span class="ts">${escapeHtml(e.received_at)}</span>
        </summary>
        <pre>${escapeHtml(JSON.stringify(e.body, null, 2))}</pre>
      </details>`,
    )
    .join('');
  res.send(`<!doctype html><html><head><meta charset="utf-8">
    <meta http-equiv="refresh" content="5">
    <title>Fake CRM Gestion — payment webhooks</title>
    <style>
      body{font-family:system-ui,sans-serif;max-width:900px;margin:2rem auto;padding:0 1rem;color:#111}
      h1{font-size:1.25rem}
      .meta{color:#666;font-size:.85rem;margin-bottom:1.5rem}
      details{border:1px solid #e2e2e2;border-radius:8px;padding:.75rem 1rem;margin:.5rem 0;background:#fafafa}
      summary{cursor:pointer}
      .ts{color:#999;font-size:.8rem;float:right}
      pre{background:#111;color:#0f0;padding:1rem;border-radius:6px;overflow:auto;font-size:.8rem}
      code{background:#eee;padding:.1rem .3rem;border-radius:4px}
    </style></head><body>
    <h1>🧾 Fake CRM Gestion — payment webhook receiver</h1>
    <div class="meta">
      Listening on <code>POST ${escapeHtml(WEBHOOK_PATH)}</code> ·
      ${received.length} event(s) received · auto-refresh 5s<br>
      Auth: <code>Authorization: Bearer &lt;CRM_API_KEY&gt;</code> ·
      Signature: <code>X-Winaity-Signature: hmac-sha256(rawBody, CRM_HMAC_SECRET)</code>
    </div>
    ${received.length ? rows : '<p>No payments received yet. Trigger one from Winaity (or run the test script).</p>'}
  </body></html>`);
});

// JSON view for programmatic checks / the test script.
app.get('/events', (_req, res) => res.json({ count: received.length, events: received }));
app.get('/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`\n🧾 Fake CRM Gestion listening on http://localhost:${PORT}`);
  console.log(`   Webhook endpoint : POST ${WEBHOOK_PATH}`);
  console.log(`   Expected API key : ${API_KEY}`);
  console.log(`   HMAC secret      : ${HMAC_SECRET}`);
  console.log(`   Dashboard        : http://localhost:${PORT}\n`);
});

function log(label, obj) {
  console.log(`[${new Date().toISOString()}] ${label}:`, JSON.stringify(obj, null, 2));
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
