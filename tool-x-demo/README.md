# Tool X demo

Standalone harness simulating a third-party tool integrating with WinTemplate's developer API.
Drives the full integration loop end-to-end: mint session → redirect user to builder → save → callback.

## Setup

```
cd tool-x-demo
cp .env.example .env
# Open http://localhost:3001/developers, register, paste the keys into .env
npm install
npm start
```

Then visit `http://localhost:4444`.

## Flow

1. **Settings → Enregistrer return URL.** Adds `http://localhost:4444/callback` to your tenant's allowlist.
2. **Home → Créer un template.** Mints a builder session, redirects you to `/s/<token>` on the builder.
3. The builder opens with a real authenticated session (24h TTL).
4. Click **Save** in the builder. You're redirected to `/callback?template_id=…` here.
5. **Lister mes templates** uses M2M `POST /oauth/token` then `GET /templates` to fetch what was created.

The **Flow log** tab shows every HTTP exchange this harness made with WinTemplate, so you can debug.

## What this harness illustrates for real integrators

- The `client_secret` lives only on this server (read from `.env`); the user's browser never sees it.
- Mint is a server-to-server `POST /api/builder-sessions` that returns a one-time URL.
- The same `client_id`/`client_secret` can also exchange `POST /oauth/token` for a Bearer JWT to call the REST API directly.
