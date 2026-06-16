# CRM demo — testing the WinTemplate integration in PROD

A tiny CRM with **two organizations** (Alpha, Beta) that share **one** API client but
keep their templates isolated via `external_org_ref`. Use it to verify the
per-organization isolation against the live builder.

## 1. Create a client in PROD (one-off)

```bash
curl -X POST https://api-template-builder.winaity.com/developers/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"CRM Demo","email":"you@example.com"}'
```

Copy `client_id` and `client_secret` from the response.

## 2. Configure & run

```bash
cd crm-demo
cp .env.example .env       # paste BUILDER_CLIENT_ID / BUILDER_CLIENT_SECRET
npm install
npm start                  # → http://localhost:5556
```

`BUILDER_API_URL` defaults to prod (`https://api-template-builder.winaity.com`).
To test the prod stack *on the server* instead, set it to `http://localhost:4401`.

## 3. Allowlist your return URL (once)

Open **Settings → Register return URL**. This adds `http://localhost:5556/callback`
to your client's allowlist (required before minting sessions).

## 4. Prove isolation

1. On the **Dashboard**, you're "logged in" as **Alpha Industries**.
2. **Create a template** → you land in the Winaity builder (prod) with no sidebar,
   pick email/facture/contrat, build, save → you're redirected back to `/callback`.
3. **Switch org** to **Beta Corp**, create another template.
4. **List templates** as Alpha → see only Alpha's. Switch to Beta → see only Beta's.

Each org sends `custom_champ: { external_org_ref }`:
- on `POST /api/builder-sessions` (create flow), and
- on `POST /oauth/token` (list flow).

The **Flow log** tab shows every request/response.

## Notes

- One shared `client_id`/`client_secret` (= one tenant). The org is the *only*
  thing that differs per request — that's what keeps templates separated.
- A request with **no** `external_org_ref` is rejected with HTTP 400 by design.
- In a real CRM, the current org comes from the logged-in user's session; here a
  cookie + org switcher stands in for that.
