// Tool X demo — simulates a third-party app integrating with WinTemplate.
// Run: cp .env.example .env, fill in keys, then `npm install && npm start`.

require('dotenv').config();
const express = require('express');

const PORT          = process.env.PORT || 4444;
const BUILDER_API   = process.env.BUILDER_API_URL || 'http://localhost:3000';
const CLIENT_ID     = process.env.BUILDER_CLIENT_ID || '';
const CLIENT_SECRET = process.env.BUILDER_CLIENT_SECRET || '';
const RETURN_URL    = process.env.TOOL_X_RETURN_URL || `http://localhost:${PORT}/callback`;
const RETURN_URL_PROD = process.env.TOOL_X_RETURN_URL_PROD || '';
// Which of THIS tool's organizations we are acting as. Sent on every call so the
// builder isolates templates per org. Change to simulate different orgs (A1, A2…).
const ORG_REF       = process.env.TOOL_X_ORG_REF || 'A1';
// Register both dev + prod callbacks so the integration works against either.
const RETURN_URLS   = [RETURN_URL, RETURN_URL_PROD].filter(Boolean);

const app = express();
app.use(express.json());

const events = [];
function log(type, data) {
  events.push({ at: new Date().toISOString(), type, data });
  if (events.length > 50) events.shift();
}

const page = (title, body) => `<!doctype html>
<html><head>
<meta charset="utf-8"><title>${title} — Tool X demo</title>
<style>
  body { font-family: system-ui, sans-serif; background: #0a0a0a; color: #e5e5e5; padding: 40px; max-width: 880px; margin: auto; }
  h1, h2 { color: white; }
  code, pre { background: #1a1a1a; padding: 2px 6px; border-radius: 4px; font-size: 13px; }
  pre { padding: 12px; overflow-x: auto; }
  a.btn, button { background: white; color: black; padding: 10px 18px; border-radius: 8px; border: none; cursor: pointer; font-weight: 600; text-decoration: none; display: inline-block; margin: 4px 4px 4px 0; }
  a.btn.ghost, button.ghost { background: transparent; color: white; border: 1px solid #333; }
  .card { background: #141414; border: 1px solid #222; border-radius: 12px; padding: 24px; margin: 16px 0; }
  .ok { color: #4ade80; }
  .bad { color: #f87171; }
  nav { display: flex; gap: 16px; margin-bottom: 32px; font-size: 14px; }
  nav a { color: #999; text-decoration: none; } nav a:hover { color: white; }
  .row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
  small { color: #888; }
</style>
</head><body>
<nav>
  <a href="/">Templates</a>
  <a href="/settings">Settings</a>
  <a href="/log">Flow log</a>
</nav>
${body}
</body></html>`;

function configured() {
  return Boolean(CLIENT_ID && CLIENT_SECRET);
}

app.get('/', (_req, res) => {
  const status = configured()
    ? `<p class="ok">Configured. client_id: <code>${CLIENT_ID.slice(0, 8)}…</code></p>`
    : `<p class="bad">Not configured — put your keys in <code>.env</code>, then restart.</p>`;
  res.send(page('Templates', `
    <h1>Tool X — démo d'intégration</h1>
    <p>Cette app simule un produit tiers qui ouvre WinTemplate pour ses utilisateurs.</p>
    ${status}
    <div class="card">
      <h2>Actions</h2>
      <div class="row">
        <form method="POST" action="/create-template" style="display:inline">
          <button type="submit">Créer un template (mode=new)</button>
        </form>
        <form method="POST" action="/list-templates" style="display:inline">
          <button type="submit" class="ghost">Lister mes templates</button>
        </form>
      </div>
      <p><small>Au save dans le builder, l'utilisateur revient ici via <code>${RETURN_URL}</code>.</small></p>
    </div>
  `));
});

app.get('/settings', (_req, res) => {
  res.send(page('Settings', `
    <h1>Configuration</h1>
    <div class="card">
      <p>Les clés sont chargées depuis <code>.env</code> au démarrage. Modifie le fichier puis redémarre.</p>
      <pre>BUILDER_API_URL     = ${BUILDER_API}
BUILDER_CLIENT_ID   = ${CLIENT_ID || '(missing)'}
BUILDER_CLIENT_SECRET = ${CLIENT_SECRET ? '••••••••' : '(missing)'}
TOOL_X_RETURN_URL   = ${RETURN_URL}
TOOL_X_RETURN_URL_PROD = ${RETURN_URL_PROD || '(none)'}
TOOL_X_ORG_REF      = ${ORG_REF}</pre>
    </div>
    <div class="card">
      <h2>Allowlist tes return URLs</h2>
      <p>Avant de pouvoir minter une session, déclare <code>${RETURN_URL}</code> dans WinTemplate :</p>
      <form method="POST" action="/register-return-url">
        <button type="submit">Enregistrer cette return_url dans l'allowlist</button>
      </form>
    </div>
  `));
});

app.get('/log', (_req, res) => {
  const items = events.slice().reverse().map(e =>
    `<div class="card"><small>${e.at}</small><br><strong>${e.type}</strong><pre>${
      JSON.stringify(e.data, null, 2).replace(/[<>&]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]))
    }</pre></div>`
  ).join('') || '<p><small>(rien encore)</small></p>';
  res.send(page('Flow log', `<h1>Flow log</h1>${items}`));
});

app.post('/register-return-url', async (_req, res) => {
  if (!configured()) return res.redirect('/');
  try {
    const r = await fetch(`${BUILDER_API}/developers/return-urls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        urls: RETURN_URLS,
      }),
    });
    const body = await r.json();
    log('return-urls', { status: r.status, body });
    res.send(page('Return URLs', `<div class="card"><h2>Réponse</h2><pre>${JSON.stringify(body, null, 2)}</pre><a href="/settings">← Retour</a></div>`));
  } catch (err) {
    log('return-urls.error', { message: String(err) });
    res.status(500).send(page('Erreur', `<div class="card bad">${String(err)}</div>`));
  }
});

app.post('/create-template', async (_req, res) => {
  if (!configured()) return res.redirect('/');
  try {
    const r = await fetch(`${BUILDER_API}/api/builder-sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        mode: 'new',
        return_url: RETURN_URL,
        // Tell the builder which of OUR organizations this session is for.
        custom_champ: { external_org_ref: ORG_REF },
      }),
    });
    const body = await r.json();
    log('mint-session', { status: r.status, body });
    if (!r.ok || !body.url) {
      return res.status(500).send(page('Erreur', `<div class="card bad">Mint failed:<pre>${JSON.stringify(body, null, 2)}</pre><a href="/">← Retour</a></div>`));
    }
    res.redirect(body.url);
  } catch (err) {
    log('mint-session.error', { message: String(err) });
    res.status(500).send(page('Erreur', `<div class="card bad">${String(err)}</div>`));
  }
});

app.post('/list-templates', async (_req, res) => {
  if (!configured()) return res.redirect('/');
  try {
    const t = await fetch(`${BUILDER_API}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        // Scope the M2M token to our org so the list is filtered to it.
        custom_champ: { external_org_ref: ORG_REF },
      }),
    });
    const tokenBody = await t.json();
    log('oauth/token', { status: t.status, body: tokenBody });
    if (!t.ok || !tokenBody.access_token) {
      return res.status(500).send(page('Erreur', `<pre>${JSON.stringify(tokenBody, null, 2)}</pre>`));
    }
    const list = await fetch(`${BUILDER_API}/templates`, {
      headers: { Authorization: `Bearer ${tokenBody.access_token}` },
    });
    const listBody = await list.json();
    log('templates.list', { status: list.status, count: Array.isArray(listBody?.templates) ? listBody.templates.length : '?' });
    res.send(page('Templates', `
      <h1>Mes templates dans WinTemplate</h1>
      <p><small>Récupéré via Bearer M2M depuis <code>${BUILDER_API}/templates</code></small></p>
      <pre>${JSON.stringify(listBody, null, 2).replace(/[<>&]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]))}</pre>
      <a href="/" class="btn">← Retour</a>
    `));
  } catch (err) {
    log('templates.list.error', { message: String(err) });
    res.status(500).send(page('Erreur', `<div class="card bad">${String(err)}</div>`));
  }
});

app.get('/callback', (req, res) => {
  const templateId = req.query.template_id || '';
  log('callback', { template_id: templateId, query: req.query });
  res.send(page('Callback', `
    <h1 class="ok">✓ Retour de WinTemplate</h1>
    <div class="card">
      <p>L'utilisateur vient de sauvegarder un template et a été redirigé chez nous.</p>
      <p><strong>template_id</strong> : <code>${String(templateId)}</code></p>
      <a href="/" class="btn">← Templates</a>
      <a href="/log" class="btn ghost">Voir le flow log</a>
    </div>
  `));
});

app.listen(PORT, () => {
  console.log(`Tool X demo running on http://localhost:${PORT}`);
  console.log(`  BUILDER_API_URL  = ${BUILDER_API}`);
  console.log(`  TOOL_X_RETURN_URL = ${RETURN_URL}`);
  console.log(`  configured       = ${configured()}`);
});
