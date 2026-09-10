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

## Partie 3 : Stockage Médias 100% Gratuit — Cloudinary (Sans Carte Bancaire)

Le projet utilise désormais **Cloudinary** comme solution de stockage par défaut pour les images et médias :
- **100% Gratuit à vie** (25 crédits mensuels = jusqu'à 25 Go de stockage et bande passante)
- **AUCUNE carte bancaire requise** à l'inscription
- **CDN ultra-rapide mondial inclus**
- Redimensionnement et optimisation automatique des images

---

### Configuration de Cloudinary en 3 étapes simples :

1. **Créer un compte :**
   - Rendez-vous sur [cloudinary.com](https://cloudinary.com) et créez un compte gratuit (avec votre email ou Google/GitHub).
   - **Aucune carte bancaire n'est demandée**.

2. **Copier l'URL d'environnement :**
   - Dès votre connexion sur le **Dashboard Cloudinary** (page d'accueil), repérez la section **"API Environment variable"**.
   - Cliquez sur l'icône de copie pour copier la valeur qui ressemble à :
     ```text
     cloudinary://<api_key>:<api_secret>@<cloud_name>
     ```

3. **Coller dans Render :**
   - Dans votre Render Dashboard -> service **api-gateway** -> onglet **Environment** :
   - Ajoutez / mettez à jour la variable :
     - `CLOUDINARY_URL` = `cloudinary://<api_key>:<api_secret>@<cloud_name>`
   - Cliquez sur **Save Changes**. Le service redémarre automatiquement avec Cloudinary actif !

---

> 💡 **Note :** La Blueprint Render est configurée pour vous demander `CLOUDINARY_URL`. Vous pouvez simplement coller cette ligne lors du déploiement ou la laisser vide et la renseigner plus tard dans le Dashboard Render !

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
