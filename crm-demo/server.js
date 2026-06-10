// ──────────────────────────────────────────────────────────────────────────
// CRM demo — a third-party app (with MANY organizations) integrating with
// WinTemplate (Winaity) in PROD.
//
// The whole point: ONE client_id/client_secret is shared by all of this CRM's
// organizations. Which org a request is for is sent as
//   custom_champ: { external_org_ref: "<org id>" }
// on /api/builder-sessions (create flow) and /oauth/token (list flow).
// The builder stores that ref on each template and filters by it, so Org Alpha
// never sees Org Beta's templates — even though they share one secret.
//
// Run: cp .env.example .env, fill keys, then `npm install && npm start`.
// ──────────────────────────────────────────────────────────────────────────

require('dotenv').config();
const express = require('express');

const PORT          = process.env.PORT || 5555;
const BUILDER_API   = process.env.BUILDER_API_URL || 'https://api-template-builder.winaity.com';
const CLIENT_ID     = process.env.BUILDER_CLIENT_ID || '';
const CLIENT_SECRET = process.env.BUILDER_CLIENT_SECRET || '';
const RETURN_URL    = process.env.CRM_RETURN_URL || `http://localhost:${PORT}/callback`;

// The CRM's organizations. In a real CRM these come from its own DB + login
// session; here we hardcode two so you can switch between them and see the
// isolation. The `ref` is what we send as external_org_ref.
const ORGS = [
  { ref: 'org-alpha', label: 'Alpha Industries' },
  { ref: 'org-beta',  label: 'Beta Corp' },
];

const app = express();
app.use(express.json());

// ── tiny helpers ────────────────────────────────────────────────────────────
const events = [];

function log(type, data) {
  events.push({ at: new Date().toISOString(), type, data });
  if (events.length > 50) events.shift();
}
const configured = () => Boolean(CLIENT_ID && CLIENT_SECRET);
const esc = (s) => String(s).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));

// "logged-in org" = a cookie. Defaults to the first org.
function currentOrg(req) {
  const m = /(?:^|;\s*)crm_org=([^;]+)/.exec(req.headers.cookie || '');
  const ref = m ? decodeURIComponent(m[1]) : ORGS[0].ref;
  return ORGS.find((o) => o.ref === ref) || ORGS[0];
}

const page = (title, body) => `<!doctype html>
<html><head>
<meta charset="utf-8"><title>${title} — CRM demo</title>
<style>
  body { font-family: system-ui, sans-serif; background: #0a0a0a; color: #e5e5e5; padding: 40px; max-width: 880px; margin: auto; }
  h1, h2 { color: white; }
  code, pre { background: #1a1a1a; padding: 2px 6px; border-radius: 4px; font-size: 13px; }
  pre { padding: 12px; overflow-x: auto; }
  a.btn, button { background: white; color: black; padding: 10px 18px; border-radius: 8px; border: none; cursor: pointer; font-weight: 600; text-decoration: none; display: inline-block; margin: 4px 4px 4px 0; font-size: 14px; }
  a.btn.ghost, button.ghost { background: transparent; color: white; border: 1px solid #333; }
  .card { background: #141414; border: 1px solid #222; border-radius: 12px; padding: 24px; margin: 16px 0; }
  .ok { color: #4ade80; } .bad { color: #f87171; }
  nav { display: flex; gap: 16px; margin-bottom: 24px; font-size: 14px; }
  nav a { color: #999; text-decoration: none; } nav a:hover { color: white; }
  .row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
  .pill { display:inline-block; background:#1e293b; color:#93c5fd; border:1px solid #334155; padding:3px 10px; border-radius:999px; font-size:12px; }
  small { color: #888; }
</style></head><body>
<nav>
  <a href="/">Dashboard</a>
  <a href="/settings">Settings</a>
  <a href="/log">Flow log</a>
</nav>
${body}
</body></html>`;

function orgSwitcher(org) {
  const opts = ORGS.map((o) =>
    `<a class="btn ${o.ref === org.ref ? '' : 'ghost'}" href="/switch?org=${encodeURIComponent(o.ref)}">${o.label}</a>`
  ).join('');
  return `<div class="card">
    <h2>Logged in as organization</h2>
    <p><span class="pill">${org.label}</span> &nbsp; <small>external_org_ref = <code>${org.ref}</code></small></p>
    <p><small>Switch org to prove isolation — each org only sees its own templates.</small></p>
    <div class="row">${opts}</div>
  </div>`;
}

// ── pages ─────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  const org = currentOrg(req);
  const status = configured()
    ? `<p class="ok">Configured. client_id: <code>${CLIENT_ID.slice(0, 8)}…</code> → ${esc(BUILDER_API)}</p>`
    : `<p class="bad">Not configured — put your keys in <code>.env</code>, then restart.</p>`;
  res.send(page('Dashboard', `
    <h1>CRM demo — integration with WinTemplate</h1>
    <p>Simulates a CRM whose organizations open the Winaity builder. One shared secret; the org is sent per request.</p>
    ${status}
    ${orgSwitcher(org)}
    <div class="card">
      <h2>Actions (as ${esc(org.label)})</h2>
      <div class="row">
        <form method="POST" action="/create-template"><button type="submit">Create a template</button></form>
        <form method="POST" action="/list-templates"><button class="ghost" type="submit">List ${esc(org.label)}'s templates</button></form>
      </div>
      <p><small>On save in the builder, the user returns to <code>${esc(RETURN_URL)}</code>.</small></p>
    </div>
  `));
});

app.get('/switch', (req, res) => {
  const ref = String(req.query.org || '');
  const ok = ORGS.some((o) => o.ref === ref);
  if (ok) res.setHeader('Set-Cookie', `crm_org=${encodeURIComponent(ref)}; Path=/; SameSite=Lax`);
  res.redirect('/');
});

app.get('/settings', (req, res) => {
  res.send(page('Settings', `
    <h1>Configuration</h1>
    <div class="card">
      <pre>BUILDER_API_URL     = ${esc(BUILDER_API)}
BUILDER_CLIENT_ID   = ${CLIENT_ID || '(missing)'}
BUILDER_CLIENT_SECRET = ${CLIENT_SECRET ? '••••••••' : '(missing)'}
CRM_RETURN_URL      = ${esc(RETURN_URL)}
ORGS                = ${ORGS.map((o) => o.ref).join(', ')}</pre>
    </div>
    <div class="card">
      <h2>Allowlist your return URL</h2>
      <p>Register <code>${esc(RETURN_URL)}</code> with WinTemplate once (required before minting sessions):</p>
      <form method="POST" action="/register-return-url"><button type="submit">Register return URL</button></form>
    </div>
  `));
});

app.get('/log', (_req, res) => {
  const items = events.slice().reverse().map((e) =>
    `<div class="card"><small>${e.at}</small><br><strong>${e.type}</strong><pre>${esc(JSON.stringify(e.data, null, 2))}</pre></div>`
  ).join('') || '<p><small>(nothing yet)</small></p>';
  res.send(page('Flow log', `<h1>Flow log</h1>${items}`));
});

// ── integration calls ───────────────────────────────────────────────────────
app.post('/register-return-url', async (_req, res) => {
  if (!configured()) return res.redirect('/');
  try {
    const r = await fetch(`${BUILDER_API}/developers/return-urls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, urls: [RETURN_URL] }),
    });
    const body = await r.json();
    log('return-urls', { status: r.status, body });
    res.send(page('Return URLs', `<div class="card"><h2>Response</h2><pre>${esc(JSON.stringify(body, null, 2))}</pre><a class="btn" href="/settings">← Back</a></div>`));
  } catch (err) {
    log('return-urls.error', { message: String(err) });
    res.status(500).send(page('Error', `<div class="card bad">${esc(err)}</div>`));
  }
});

app.post('/create-template', async (req, res) => {
  if (!configured()) return res.redirect('/');
  const org = currentOrg(req);
  try {
    // Mint a builder session FOR THIS ORG. external_org_ref is the isolation key.
    const r = await fetch(`${BUILDER_API}/api/builder-sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        mode: 'new',
        return_url: RETURN_URL,
        custom_champ: { external_org_ref: org.ref },
      }),
    });
    const body = await r.json();
    log('mint-session', { org: org.ref, status: r.status, body });
    if (!r.ok || !body.url) {
      return res.status(500).send(page('Error', `<div class="card bad">Mint failed:<pre>${esc(JSON.stringify(body, null, 2))}</pre><a class="btn" href="/">← Back</a></div>`));
    }
    // Send the user's browser to the builder.
    res.redirect(body.url);
  } catch (err) {
    log('mint-session.error', { message: String(err) });
    res.status(500).send(page('Error', `<div class="card bad">${esc(err)}</div>`));
  }
});

app.post('/list-templates', async (req, res) => {
  if (!configured()) return res.redirect('/');
  const org = currentOrg(req);
  try {
    // M2M token scoped to this org → /templates is auto-filtered to it.
    const t = await fetch(`${BUILDER_API}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        custom_champ: { external_org_ref: org.ref },
      }),
    });
    const tokenBody = await t.json();
    log('oauth/token', { org: org.ref, status: t.status, body: tokenBody.access_token ? '(got token)' : tokenBody });
    if (!t.ok || !tokenBody.access_token) {
      return res.status(500).send(page('Error', `<pre>${esc(JSON.stringify(tokenBody, null, 2))}</pre>`));
    }
    const list = await fetch(`${BUILDER_API}/templates`, {
      headers: { Authorization: `Bearer ${tokenBody.access_token}` },
    });
    const listBody = await list.json();
    const templates = Array.isArray(listBody?.templates) ? listBody.templates : [];
    log('templates.list', { org: org.ref, status: list.status, count: templates.length });
    const rows = templates.map((tpl) => `<li><strong>${esc(tpl.name)}</strong> <small>(${esc(tpl.type)}) — ${esc(tpl.id)}</small></li>`).join('') || '<li><small>(none yet for this org)</small></li>';
    res.send(page('Templates', `
      <h1>Templates for ${esc(org.label)}</h1>
      <p><small>Fetched via M2M Bearer from <code>${esc(BUILDER_API)}/templates</code>, scoped to <code>${esc(org.ref)}</code>.</small></p>
      <div class="card"><ul>${rows}</ul></div>
      <a class="btn" href="/">← Dashboard</a>
    `));
  } catch (err) {
    log('templates.list.error', { message: String(err) });
    res.status(500).send(page('Error', `<div class="card bad">${esc(err)}</div>`));
  }
});

app.get('/callback', (req, res) => {
  const templateId = req.query.template_id || '';
  log('callback', { template_id: templateId, query: req.query });
  res.send(page('Callback', `
    <h1 class="ok">✓ Back from WinTemplate</h1>
    <div class="card">
      <p>The user saved a template and was redirected back to the CRM.</p>
      <p><strong>template_id</strong>: <code>${esc(templateId)}</code></p>
      <a class="btn" href="/">← Dashboard</a>
      <a class="btn ghost" href="/log">View flow log</a>
    </div>
  `));
});

app.listen(PORT, () => {
  console.log(`CRM demo running on http://localhost:${PORT}`);
  console.log(`  BUILDER_API_URL = ${BUILDER_API}`);
  console.log(`  CRM_RETURN_URL  = ${RETURN_URL}`);
  console.log(`  orgs            = ${ORGS.map((o) => o.ref).join(', ')}`);
  console.log(`  configured      = ${configured()}`);
});
