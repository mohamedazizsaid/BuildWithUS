# Winaity Template Builder

> **Statut : projet livré et en production.** Plateforme SaaS multi-tenant de création de
> templates **Email, Facture, Contrat, SMS et RCS**, avec éditeur drag & drop, assistant IA
> agentique, abonnements Stripe et intégration CRM.
>
> 🌐 Production : https://builder-template.winaity.com

---

## Sommaire

1. [Résumé](#1-résumé)
2. [Fonctionnalités livrées](#2-fonctionnalités-livrées)
3. [Architecture](#3-architecture)
4. [Stack technique](#4-stack-technique)
5. [Structure du dépôt](#5-structure-du-dépôt)
6. [Lancer en développement](#6-lancer-en-développement)
7. [Déploiement en production](#7-déploiement-en-production)
8. [Variables d'environnement](#8-variables-denvironnement)
9. [API principale](#9-api-principale)
10. [Reste à faire](#10-reste-à-faire)
11. [Documentation complémentaire](#11-documentation-complémentaire)

---

## 1. Résumé

Le **Winaity Template Builder** est une plateforme SaaS multi-tenant : chaque entreprise
(*tenant*) dispose d'un espace isolé dans lequel ses membres conçoivent, stockent et génèrent
leurs documents de communication.

Cinq types de templates, chacun avec son éditeur dédié :

| Type | Canal | Éditeur |
|---|---|---|
| **Email** (type 1) | Email (MJML) | Éditeur drag & drop, 11 types de blocs, aperçu live, éditeur de code Monaco, assistant IA, export HTML/PDF |
| **Facture** (type 2) | Facture PDF | Formulaire structuré, calcul HT/TVA/TTC, aperçu A4, export PDF |
| **Contrat** (type 3) | Contrat PDF | Éditeur riche Tiptap paginé, variables dynamiques, export PDF |
| **SMS** (type 4) | SMS | Éditeur texte avec substitution de variables |
| **RCS** (type 5) | RCS / RBM | Formulaire + aperçu téléphone : texte, rich cards, carrousels, chips de suggestion |

Toutes les données sont cloisonnées par `tenant_id`. Les membres sont invités par email et
portent un rôle : **admin**, **editor**, **marketing** (curation de la galerie de templates
prédéfinis de l'entreprise), **reader**, plus les clients **M2M** (machine-to-machine) pour
l'API.

---

## 2. Fonctionnalités livrées

### Authentification & multi-tenancy
- Inscription (création du tenant + admin), connexion, déconnexion — **JWT en cookie httpOnly**
- Mot de passe oublié / réinitialisation, invitation de membres, acceptation d'invitation
- Profil utilisateur, liste des membres, gestion des rôles
- Coordonnées d'entreprise structurées à l'inscription (téléphone, adresse, code postal, ville, pays)
- Payload JWT : `{ userId, tenantId, email, role }`

### Éditeur Email (module phare)
- Canvas **drag & drop** (dnd-kit), lignes jusqu'à 4 colonnes, largeurs par colonne, styles de section
- **11 types de blocs** : titre, texte, image, vidéo, bouton, séparateur, tableau, signature, réseaux sociaux, menu, liste à icônes
- Aperçu **MJML** live + multi-device, éditeur de code **Monaco**
- Undo/redo, favoris, duplication, galerie de templates prédéfinis
- Export **HTML responsive** et **PDF** (Playwright côté gateway)
- Envoi d'email de test

### Assistant IA agentique
- **Génération depuis un prompt** — un « planner » contraint par schéma produit un `DesignSpec`
  (design system + palette + sections), exécuté en blocs par du code déterministe : rapide,
  reproductible, sans duplication
- **Édition conversationnelle** — routeur d'intention (clear / rewrite / image / edit / theme)
  qui dirige chaque tour vers le chemin déterministe ou modèle adéquat, avec **confirmations
  véridiques** (l'assistant n'annonce un succès que si le template a réellement changé)
- **Édition ciblée sur sélection** — sélectionner un bloc/section puis prompter
- **Image → template** : upload d'une affiche → lecture par **vision** (texte verbatim, prix,
  couleurs de marque, mise en page) → **reconstruction native** en email éditable (l'image
  n'est pas collée), puis passe d'un critique « directeur artistique »
- **Endpoint MCP réel** (`/builder/mcp`) : les **32 outils** du builder sont exposés via un
  serveur Model Context Protocol, le modèle découvre les outils dynamiquement
- Intelligence de design dans le code : dérivation de palette, **garde de contraste**
  (lisibilité garantie), **5 design systems** (editorial / bold / minimal / luxe / corporate)
- LLM **auto-hébergé** (vLLM, API compatible OpenAI) : `gemma4-26b` par défaut,
  `qwen35-35b-a3b` en fallback — aucune donnée envoyée à un tiers

### Facturation & abonnements (Stripe)
- Plans : **Free**, **Pro** (25 € HT/mois — 240 € HT/an), **Pro Organisation**
  (55 € HT/mois — 600 € HT/an), plus un plan **interne illimité**
- **Stripe Checkout embarqué** (le paiement reste sur nos pages), mensuel ou annuel,
  **TVA française 20 %** appliquée via Tax Rate Stripe
- **Application des quotas** : Free limité à l'email, 1 template et 1 interaction IA (compteur
  à vie, monotone) ; Pro débloque tous les canaux et l'IA illimitée ; Pro Org ajoute les
  invitations d'équipe et l'accès API
- Cycle de vie : upgrade, changement de plan, annulation (respect de l'engagement annuel),
  réactivation
- **Espace super-admin** : organisations, utilisateurs, rôles, attribution de plan (dont le
  plan interne), onglet **Commandes** (abonnements enrichis en direct depuis Stripe, KPI
  MRR / actifs / impayés), modération des templates

### Intégrations
- **Clés API** générées depuis le tableau de bord (Réglages → Intégrations) ; OAuth 2.1
  **client_credentials** → JWT M2M avec scopes (`templates:read`, `templates:write`, …),
  secrets hachés en Argon2id
- **Flux « session builder »** de type Stripe Checkout : le backend d'un outil tiers demande
  une URL de session à usage unique (`POST /api/builder-sessions`), l'utilisateur est redirigé
  vers `/s/<token>`, construit son template puis revient sur une `return_url` autorisée — sans
  second login
- **Synchronisation des paiements vers le CRM Winaity Gestion** : chaque webhook Stripe est
  relayé en OAuth2 client_credentials vers `POST https://api-gestion.winaity.com/api/webhook/abonnement`
  (5 types d'événements + route de rejeu historique `POST /billing/crm/backfill`).
  Validé de bout en bout le 30/07/2026 (paiement réel → CRM, statut `SUCCESS`)
- Faux CRM local (`crm-gestion-fake/`) et harnais outil tiers (`tool-x-demo/`) pour tester
  les intégrations hors production

### Site marketing
Site public complet sous `frontend/app/(marketing)` : accueil, fonctionnalités, tarifs (câblés
sur les plans réels), à propos, contact, démo, design system.

---

## 3. Architecture

```
                    ┌──────────────────────────────┐
   Navigateur ─────▶│   Frontend Next.js 16        │  React 19, App Router
                    │   + routes IA + /builder/mcp │
                    └──────────────┬───────────────┘
                                   │ REST (cookie JWT)
                    ┌──────────────▼───────────────┐
                    │        API Gateway            │  NestJS — seule surface publique
                    │  REST → gRPC, JWT, CORS,      │
                    │  Stripe, quotas, PDF, CRM     │
                    └──────┬─────────────────┬──────┘
                      gRPC │                 │ gRPC
              ┌────────────▼───┐   ┌─────────▼─────────┐
              │  Auth Service  │   │  Template Service │  NestJS, CQRS, TypeORM
              │  (50055)       │   │  (50054)          │
              └────────┬───────┘   └─────────┬─────────┘
                       │                     │
                    auth_db             templates_db        PostgreSQL 18
                                             │
                                          MinIO                (médias / S3)

Services annexes :  AI Template Service (FastAPI) · Image Pipeline (FastAPI)
                    NATS · Consul · vLLM auto-hébergé (hors compose)
```

- **API Gateway** — unique point d'entrée REST : traduction REST → gRPC, auth cookie JWT, CORS
  par `FRONTEND_ORIGIN`, facturation Stripe, application des plans, intégrations, génération PDF
  (Playwright/Chromium), relais CRM, filtre d'exceptions global
- **Auth Service** — register, login, validate token, invite/accept, profil, membres, plan &
  usage du tenant, clients API, attribution de plan super-admin
- **Template Service** — CRUD complet + render + duplicate + favoris + templates populaires,
  en **CQRS** (commands / queries / events)
- **packages/shared-kernel** — code gRPC/domaine partagé ; **packages/proto** — contrats gRPC
  (chargés avec `keepCase: true`, les champs restent en `snake_case`)

---

## 4. Stack technique

| Couche | Technologies |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, shadcn/ui, Framer Motion, dnd-kit, Monaco, Tiptap, MJML, pdf-lib/pdfjs, jszip/xlsx |
| IA | Vercel AI SDK v6 + `@ai-sdk/openai-compatible`, `@modelcontextprotocol/sdk`, vLLM auto-hébergé (gemma4-26b / qwen35-35b-a3b, 64K de contexte) |
| API Gateway | NestJS, guards JWT + scopes, client gRPC, Stripe SDK, Playwright |
| Microservices | NestJS, CQRS, gRPC, TypeORM, PostgreSQL, bcrypt / Argon2id |
| Services Python | FastAPI (AI helpers : palette, mapping de variables, champs de facture ; Image Pipeline : recherche d'images) |
| Infrastructure | Docker Compose, PostgreSQL 18, MinIO, NATS, Consul, Cloudflare Tunnel |
| Paiement | Stripe (Checkout embarqué, webhooks signés, Tax Rate TVA 20 %) |

---

## 5. Structure du dépôt

```
winaity-template-builder/
├── frontend/                     # Next.js — UI, éditeurs, IA, site marketing
│   ├── app/
│   │   ├── (auth)/               # login, register, invite, reset password
│   │   ├── (marketing)/          # site public (accueil, features, pricing, …)
│   │   ├── dashboard/            # espace tenant
│   │   │   └── templates/
│   │   │       ├── editor/           # éditeur Email drag & drop
│   │   │       ├── contract-editor/  # éditeur Contrat
│   │   │       ├── invoice-editor/   # éditeur Facture
│   │   │       ├── sms-editor/       # éditeur SMS
│   │   │       └── rcs-editor/       # éditeur RCS
│   │   ├── super-admin/          # espace super-admin (organisations, commandes)
│   │   ├── checkout/             # Stripe Checkout embarqué
│   │   ├── developers/           # documentation d'intégration
│   │   ├── s/[token]/            # entrée « session builder » déléguée
│   │   ├── builder/mcp/          # serveur MCP (32 outils)
│   │   └── api/ai/               # routes IA (chat agentique, from-image)
│   └── lib/                      # plans, blocs, MJML, planner IA, design systems
│
├── api-gateway/                  # NestJS — REST → gRPC (+ Stripe, PDF, CRM)
│   ├── src/controllers/          # auth, template, billing, media, super-admin
│   └── scripts/crm-check.js      # sonde OAuth2 + envoi de test vers le CRM réel
├── auth-service/                 # NestJS gRPC — auth, tenants, membres, plans
├── template-service/             # NestJS gRPC — CRUD templates (CQRS)
├── ai-template-service/          # FastAPI — helpers IA
├── image-pipeline/               # FastAPI — recherche d'images
├── packages/{proto,shared-kernel}
├── crm-gestion-fake/             # faux CRM local (test des webhooks)
├── tool-x-demo/ · crm-demo/      # harnais d'intégration tiers
├── infra/
│   ├── docker-compose.yml        # override dev
│   ├── docker-compose.prod.yml   # stack de production (autonome)
│   └── .env.example              # toutes les variables documentées
├── docs/                         # diagrammes (OAuth2, CRM, Keycloak, white-label)
├── rapport-pfe/                  # rapport PFE (LaTeX)
├── DEPLOYMENT.md                 # guide de déploiement serveur
├── WINAITY-PROJECT-BRIEF.md      # brief produit complet
└── PASSATION-WINAITY-TEMPLATE-BUILDER.md   # document de passation (→ PDF)
```

---

## 6. Lancer en développement

### Prérequis
- Node.js 20+, Python 3.11+, Docker & Docker Compose
- Un serveur vLLM accessible pour l'IA (variables `AI_*`) — optionnel, le reste fonctionne sans

### Démarrage (tout en conteneurs)

```bash
cd infra
cp .env.example .env          # puis renseigner les valeurs
docker compose up -d --build
docker compose ps             # tous les services Up
```

Le override dev monte `api-gateway/src` : le hot-reload évite les rebuilds sur changement de
code (un changement de **.env** nécessite en revanche `up -d` pour recréer le conteneur).

### Démarrage service par service (hors Docker)

```bash
docker compose up -d postgres minio nats consul   # infra seule

cd auth-service      && npm install && npm run start:dev
cd template-service  && npm install && npx nest start --watch
cd api-gateway       && npm install && npm run start:dev
cd ai-template-service && pip install -r requirements.txt && uvicorn app.main:app --reload --port 8001
cd image-pipeline    && pip install -r requirements.txt && uvicorn app.main:app --reload --port 8002
cd frontend          && npm install && npm run dev
```

### Ports (développement)

| Service | Port |
|---|---|
| Frontend | 3001 |
| API Gateway | 3000 |
| AI Template Service | 8001 |
| Image Pipeline | 8002 |
| Auth Service (gRPC) | 50055 |
| Template Service (gRPC) | 50054 |
| PostgreSQL | 5433 |
| MinIO (S3 / console) | 9000 / 9001 |
| Faux CRM | 5600 |

### Tester les webhooks Stripe en local

```bash
stripe listen --forward-to localhost:3000/billing/webhook
# puis un paiement de test avec la carte 4242 4242 4242 4242
```

> ⚠️ Le `.env` de développement pointe actuellement vers le **CRM de production**. Tout
> paiement de test local crée donc un enregistrement réel côté CRM, et `CRM_EVENTS` doit
> rester limité à `payment.succeeded` tant que c'est le cas. Les valeurs du faux CRM sont
> conservées en commentaire dans le `.env` pour revenir en arrière.

---

## 7. Déploiement en production

Serveur : `finanssor-data-center-v1`, répertoire `/srv/projects/winaity-template-builder`.
Stack **autonome** `infra/docker-compose.prod.yml` (ne pas fusionner avec l'override dev).

```bash
cd /srv/projects/winaity-template-builder
git pull
cd infra
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps
```

- **Accès public via Cloudflare Tunnel** (`cloudflared`) : connexion **sortante** uniquement,
  aucun port entrant à ouvrir, HTTPS assuré par Cloudflare.

| Hostname public | → service |
|---|---|
| builder-template.winaity.com | `frontend:3000` |
| api-template-builder.winaity.com | `api-gateway:3000` |
| minio-template-builder.winaity.com | `minio:9000` |
| ai-template-builder.winaity.com | `ai-template-service:8001` |
| image-template-builder.winaity.com | `image-pipeline:8002` |

- **Plage de ports hôte assignée : 4400–4499** — 4400 frontend, 4401 gateway, 4402 MinIO S3,
  4403 AI, 4404 image, 4405 console MinIO. **Jamais 9000/9001** : un autre MinIO occupe déjà
  ces ports sur le serveur.
- **Un seul token de tunnel = un seul emplacement actif.** Ne pas faire tourner la stack prod
  sur un poste et sur le serveur en même temps.
- Les variables `NEXT_PUBLIC_*` sont **figées au build** du frontend : tout changement d'URL
  publique ou de clé Stripe publique impose `up -d --build frontend`.
- Le schéma de base est géré par `synchronize` piloté par `DB_SYNC` : `true` **uniquement** au
  premier déploiement (création des tables), puis `false` pour figer le schéma.

Le détail complet (fichiers concernés, incidents rencontrés et résolus, commandes courantes)
est dans **[DEPLOYMENT.md](DEPLOYMENT.md)**.

---

## 8. Variables d'environnement

Un seul fichier `infra/.env` (patron exhaustif dans `infra/.env.example`, seul fichier `.env`
committé). Groupes :

| Groupe | Variables |
|---|---|
| Base de données | `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `DB_SYNC` |
| Stockage | `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`, `MINIO_PUBLIC_URL` |
| Secrets | `JWT_SECRET`, `PRINT_TOKEN_SECRET` (doit être identique gateway ↔ frontend) |
| Email | `RESEND_API_KEY`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `GMAIL_USER`, `GMAIL_APP_PASSWORD` |
| IA & images | `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`, `AI_MODEL_FALLBACK`, `OPENROUTER_API_KEY`, `PEXELS_API_KEY` |
| Ports hôte | `FRONTEND_PUBLIC_PORT`, `GATEWAY_PUBLIC_PORT`, `MINIO_PUBLIC_PORT`, `AI_PUBLIC_PORT`, `IMAGE_PUBLIC_PORT`, `MINIO_CONSOLE_PORT` |
| URLs publiques | `PUBLIC_API_URL`, `PUBLIC_AI_SERVICE_URL`, `PUBLIC_IMAGE_SEARCH_URL`, `FRONTEND_PUBLIC_URL`, `FRONTEND_ORIGIN` (CORS) |
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_RETURN_URL`, `STRIPE_TAX_RATE_ID`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` |
| CRM | `CRM_FORWARD_ENABLED`, `CRM_API_URL`, `CRM_TOKEN_URL`, `CRM_CLIENT_ID`, `CRM_CLIENT_SECRET`, `CRM_SCOPE`, `CRM_API_KEY`, `CRM_HMAC_SECRET`, `CRM_EVENTS` |
| Temps réel | `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_CONVEX_SITE_URL` |
| Tunnel | `CLOUDFLARE_TUNNEL_TOKEN` |

Aucun secret réel n'est versionné (`.gitignore` couvre `.env*` avec l'exception
`!*.env.example`).

---

## 9. API principale

Toutes les routes passent par l'API Gateway. Auth navigateur = cookie JWT httpOnly ;
auth machine = `Authorization: Bearer <token OAuth2>` avec scopes.

**Auth & tenants** — `POST /auth/register|login|logout|invite|accept-invite|forgot-password|reset-password`,
`GET /auth/me`, `PUT /auth/profile`, `GET /auth/members`

**Templates** — `POST|GET /templates`, `GET|PUT|DELETE /templates/:id`,
`PUT /templates/:id/favorite`, `POST /templates/:id/duplicate`, `GET /templates/:id/render`,
`POST /templates/:id/render-sms`, `POST /templates/render-pdf`, `POST /templates/test-email`,
`GET|POST|DELETE /templates/settings/custom-variables`

**Facturation** — `POST /billing/checkout|confirm|cancel|reactivate`, `GET /billing/usage`,
`POST /billing/ai/consume`, `POST /billing/webhook` (signé Stripe),
`POST /billing/crm/backfill` (super-admin)

**Intégrations** — `POST /oauth/token` (client_credentials), `POST /oauth/register`,
`GET|POST|DELETE /integrations/api-keys`, `PUT /integrations/return-urls`,
`POST /api/builder-sessions`, `POST /s/exchange`

**Super-admin** — `GET /auth/admin/tenants|users|subscriptions|templates`,
`PATCH /auth/admin/tenants/:id/plan`, `PATCH /auth/admin/users/:id/role`, …

**Médias** — `POST /media/upload`, `GET|DELETE /media/:tenantId/:fileName`

**IA (frontend)** — `POST /api/ai/chat` (boucle agentique), `POST /api/ai/from-image`
(affiche → template), `/builder/mcp` (serveur MCP, 32 outils)

Une collection Postman est fournie : `winaity-builder.postman_collection.json`.

---

## 10. Reste à faire

### Il ne manque que l'intégration Keycloak

C'est **le seul chantier fonctionnel non réalisé**. Objectif : permettre à un utilisateur déjà
authentifié dans un outil hôte (le CRM) d'entrer dans le builder **sans second login**, en
s'appuyant sur le Keycloak du CRM. Deux approches ont été étudiées
(`docs/keycloak-approaches.excalidraw`) :

- **Approche A — access token Keycloak direct :** le CRM transmet son access token, le builder
  vérifie la signature via le **JWKS** de Keycloak, lit les groupes/claims pour résoudre le
  tenant et ouvre la session. Simple, standard, mais couplé à un Keycloak unique.
- **Approche B — token SSO signé côté CRM :** le CRM signe un token court (5 min) avec son
  `api_secret`, le builder retrouve le secret en base, vérifie la signature, auto-crée le
  tenant si besoin. Plus de code, mais indépendant de Keycloak et ouvert à tout CRM.

Le socle nécessaire existe déjà : OAuth 2.1 client_credentials, table `api_clients`
(client_id / secret Argon2id / scopes), guard de scopes, flux de session à usage unique
`POST /api/builder-sessions` → `/s/<token>` → `return_url`. L'intégration Keycloak consiste
donc essentiellement à **ajouter un vérificateur de token externe** en amont de ce flux
existant.

### Points de vigilance techniques (dette connue)

- **IA en production bloquée au niveau réseau** : le serveur vLLM n'écoute que sur l'IP
  Tailscale de l'hôte ; les conteneurs sont filtrés par le pare-feu. Correctif d'une ligne, à
  appliquer par un administrateur : `sudo ufw allow from 172.20.55.0/24 to any port 11434 proto tcp`
  (règle interne, réversible). Le DNS est déjà réglé côté compose (`extra_hosts`).
- **`typescript.ignoreBuildErrors: true`** dans `frontend/next.config.ts` : des erreurs de
  typage réelles sont masquées (principalement `lib/invoice/…` et `lib/tiptap/…`). À traiter
  puis retirer le flag.
- **Schéma via `synchronize`** plutôt que migrations : les migrations committées sont
  partiellement obsolètes ; le schéma suit les entités lors d'un run `DB_SYNC=true`.
- **Relais CRM en « fire-and-forget »** : en cas d'indisponibilité du CRM l'événement est
  seulement journalisé. Le durcissement prévu (table `crm_outbox` + worker de retry avec
  backoff dans l'auth-service) reste à faire.
- **Événements CRM** : seul `payment.succeeded` est actif (`CRM_EVENTS`). `payment.failed`,
  `payment.refunded`, `subscription.updated` et `subscription.canceled` sont codés mais pas
  encore activés côté CRM.
- **Rotation de secrets** : un token Cloudflare Tunnel et un token d'accès GitLab ont circulé
  hors coffre — à révoquer/renouveler. Vérifier aussi que l'URL du remote git local ne
  contient pas de PAT en clair.
- Convex (curseurs live / sync de brouillon) reste au stade d'intention.

### Évolutions produit envisagées

Signature électronique des contrats, numérotation séquentielle des factures, archivage des
contrats signés, suivi du cycle de vie des factures (brouillon → émise → payée), profil
entreprise (SIRET/TVA) lié à la facturation, format Chorus Pro pour les marchés publics.

---

## 11. Documentation complémentaire

| Document | Contenu |
|---|---|
| **[PASSATION-WINAITY-TEMPLATE-BUILDER.md](PASSATION-WINAITY-TEMPLATE-BUILDER.md)** | Document de passation détaillé (à convertir en PDF pour l'équipe) |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Guide de déploiement serveur + runbook |
| [WINAITY-PROJECT-BRIEF.md](WINAITY-PROJECT-BRIEF.md) | Brief produit complet |
| [DEMO-SCENARIO.md](DEMO-SCENARIO.md) | Scénario de démonstration |
| [docs/DEVELOPERS_INTEGRATION.md](docs/DEVELOPERS_INTEGRATION.md) | Guide d'intégration pour outils tiers |
| [docs/](docs/) | Diagrammes : OAuth2, flux CRM, approches Keycloak, white-label |
| [rapport-pfe/](rapport-pfe/) | Rapport de projet de fin d'études (LaTeX) |
| `winaity-builder.postman_collection.json` | Collection Postman de l'API |

---

*Projet réalisé par Ahmed Boughdiri — France Téléphone / groupe Winvest Capital, 2026.*
