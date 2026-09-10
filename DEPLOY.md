# Guide de Deploiement — Build withUs Template Builder

## Architecture de Production

```
Vercel (CDN mondial)           Render (Europe - Frankfurt)
+------------------+           +------------------------------------+
|   Frontend       | <-HTTPS-> |  api-gateway (port 3000)          |
|   (Next.js 16)   |           |        | gRPC (interne)           |
+------------------+           |  +-------------+  +-----------+   |
                               |  | auth-service|  | template- |   |
                               |  | (port 50055)|  | service   |   |
                               |  +-------------+  | (port     |   |
                               |                   | 50054)    |   |
                               |  +-------------+  +-----------+   |
                               |  | ai-template |                  |
                               |  | service     |                  |
                               |  | (port 8001) |                  |
                               |  +-------------+                  |
                               |  +-------------+                  |
                               |  | image-      |                  |
                               |  | pipeline    |                  |
                               |  | (port 8002) |                  |
                               |  +-------------+                  |
                               |                                    |
                               |  PostgreSQL (Render Managed)      |
                               +------------------------------------+
```

---

## Partie 1 : Backend sur Render

### Etape 1 - Creer un compte Render

1. Allez sur [render.com](https://render.com) et creez un compte.
2. Connectez votre compte GitHub.

### Etape 2 - Deployer avec le Blueprint

1. Dans le Dashboard Render, cliquez sur **"New +"** -> **"Blueprint"**
2. Selectionnez votre repo GitHub `BuildWithUS`
3. Render detecte automatiquement le fichier `render.yaml` a la racine
4. Cliquez **"Apply"** — Render creera tous les services automatiquement

> **Note :** Le premier build peut prendre 10-20 minutes (surtout `api-gateway` avec Playwright).

### Etape 3 - Configurer les variables d'environnement sensibles

Apres le deploiement, allez dans chaque service pour definir les secrets marques `sync: false` dans `render.yaml` :

#### api-gateway

| Variable | Valeur |
|----------|--------|
| `FRONTEND_ORIGIN` | `https://votre-app.vercel.app` |
| `STRIPE_SECRET_KEY` | `sk_live_...` (Stripe Dashboard) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` (voir Etape 4) |
| `STRIPE_RETURN_URL` | `https://votre-app.vercel.app` |
| `RESEND_API_KEY` | `re_...` (Resend Dashboard) |
| `MINIO_ENDPOINT` | URL de votre bucket R2/S3 |
| `MINIO_ACCESS_KEY` | Cle d'acces R2 |
| `MINIO_SECRET_KEY` | Cle secrete R2 |

#### ai-template-service

| Variable | Valeur |
|----------|--------|
| `OPENROUTER_API_KEY` | Votre cle OpenRouter |
| `FRONTEND_ORIGIN` | `https://votre-app.vercel.app` |

#### image-pipeline

| Variable | Valeur |
|----------|--------|
| `PEXELS_API_KEY` | Votre cle Pexels |

### Etape 4 - Webhook Stripe

1. Allez dans [Stripe Dashboard -> Webhooks](https://dashboard.stripe.com/webhooks)
2. Cliquez **"Add endpoint"**
3. URL : `https://api-gateway.onrender.com/billing/webhook`
4. Evenements a ecouter :
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Copiez le **Webhook Signing Secret** -> collez-le dans `STRIPE_WEBHOOK_SECRET`

### Etape 5 - Base de donnees

Render cree automatiquement la PostgreSQL. Les services se connectent via les variables `DB_*`.

> **Important :** `DB_SYNC=false` en production. Executer les migrations apres le premier deploiement :
> ```bash
> # Depuis votre machine locale, avec DATABASE_URL de Render
> cd auth-service && npm run migration:run
> cd template-service && npm run migration:run
> ```

---

## Partie 2 : Frontend sur Vercel

### Etape 1 - Importer le projet

1. Allez sur [vercel.com](https://vercel.com) et connectez GitHub
2. Cliquez **"New Project"** -> selectionnez `BuildWithUS`
3. Dans **"Root Directory"** -> entrez `frontend`
4. Framework : **Next.js** (detecte automatiquement)
5. Cliquez **"Deploy"**

### Etape 2 - Variables d'environnement Vercel

Dans **Project Settings -> Environment Variables**, ajoutez :

| Variable | Valeur | Env |
|----------|--------|-----|
| `NEXT_PUBLIC_API_URL` | `https://api-gateway.onrender.com` | Production |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` | Production |
| `NEXT_PUBLIC_APP_URL` | `https://votre-app.vercel.app` | Production |

### Etape 3 - Domaine personnalise (optionnel)

1. Dans **Settings -> Domains** -> ajoutez votre domaine
2. Configurez les DNS selon les instructions Vercel

---

## Partie 3 : Stockage S3 100% Gratuit — Sans Carte Bancaire

Cloudflare R2 demande une carte bancaire même pour le tier gratuit.
Voici les **2 alternatives 100% gratuites sans aucune carte bancaire** :

### Option 1 (Recommandée) : Backblaze B2 (10 GB gratuits à vie, aucune CB demandée)

1. Rendez-vous sur [Backblaze B2](https://www.backblaze.com/b2/cloud-storage.html) et créez un compte (gratuit, **sans carte bancaire**).
2. Dans le menu de gauche, cliquez sur **Buckets** -> **Create a Bucket** :
   - Bucket Unique Name : ex. `buildwithus-templates` (doit être unique mondialement)
   - Files in Bucket are : **Public** (important pour que les images soient visibles)
   - Default Encryption : Disable ou Enable (au choix)
   - Cliquez **Create a Bucket**
3. Notez le **Endpoint** affiché sur votre bucket (ex: `s3.eu-central-003.backblazeb2.com` ou `s3.us-east-005.backblazeb2.com`).
4. Dans le menu de gauche, cliquez sur **Application Keys** -> **Add a New Application Key** :
   - Name of Key : `render-api-gateway`
   - Allow access to Bucket(s) : sélectionnez votre bucket
   - Type of Access : **Read and Write**
   - Cliquez **Create New Key**
5. Copiez immédiatement :
   - `keyID` -> ce sera votre `MINIO_ACCESS_KEY`
   - `applicationKey` -> ce sera votre `MINIO_SECRET_KEY`
6. Dans Render Dashboard -> service **api-gateway** -> **Environment** :
   - `MINIO_ENDPOINT` = votre endpoint Backblaze (ex: `s3.eu-central-003.backblazeb2.com`)
   - `MINIO_PORT` = `443`
   - `MINIO_USE_SSL` = `true`
   - `MINIO_ACCESS_KEY` = votre `keyID`
   - `MINIO_SECRET_KEY` = votre `applicationKey`
   - `MINIO_BUCKET` = le nom de votre bucket (ex: `buildwithus-templates`)

---

### Option 2 : Supabase Storage (1 GB gratuit, sans CB)

1. Créez un projet gratuit sur [Supabase](https://supabase.com) (aucune CB requise).
2. Allez dans **Storage** -> **New Bucket** -> nom : `templates` -> cochez **Public**.
3. Allez dans **Project Settings** -> **Storage** -> descendez jusqu'à **S3 Access Keys** -> **New Access Key**.
4. Remplissez dans Render `api-gateway` :
   - `MINIO_ENDPOINT` = `<project-ref>.storage.supabase.co`
   - `MINIO_PORT` = `443`
   - `MINIO_USE_SSL` = `true`
   - `MINIO_ACCESS_KEY` = votre Access Key ID
   - `MINIO_SECRET_KEY` = votre Secret Access Key
   - `MINIO_BUCKET` = `templates`

> 💡 **Note :** La Blueprint Render est configurée avec des valeurs par défaut non-bloquantes (`localhost` / `none`). Vous pouvez déployer tout de suite sur Render sans attendre, et configurer Backblaze B2 tranquillement après !

---

## Checklist finale avant mise en production

### Backend (Render)

- [ ] Tous les services sont en status **"Live"**
- [ ] `api-gateway` repond sur `https://api-gateway.onrender.com`
- [ ] Variables sensibles configurees (Stripe, Resend, R2)
- [ ] Webhook Stripe configure et teste
- [ ] Migrations DB executees

### Frontend (Vercel)

- [ ] Build reussi (vert dans Vercel Dashboard)
- [ ] `NEXT_PUBLIC_API_URL` pointe vers le bon service Render
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` est la cle **live** (pas test)
- [ ] Login / Register / Checkout fonctionnent en production

### Post-deploiement

- [ ] Creer un compte de test en production
- [ ] Tester le flux complet : signup -> template -> generation AI -> checkout
- [ ] Configurer les alertes Render (email sur service down)

---

## URLs de production attendues

| Service | URL |
|---------|-----|
| Frontend | `https://votre-app.vercel.app` |
| API Gateway | `https://api-gateway.onrender.com` |
| AI Template Service | `https://ai-template-service.onrender.com` |
| Image Pipeline | `https://image-pipeline.onrender.com` |

---

## Rollback

En cas de probleme en production :

1. **Render** : selectionnez le service -> **"Deploys"** -> cliquez sur un deploiement precedent -> **"Rollback"**
2. **Vercel** : **"Deployments"** -> cliquez sur une version precedente -> **"Promote to Production"**
