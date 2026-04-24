# Winaity Template Builder

Plateforme SaaS multi-tenant permettant de créer, gérer et partager des **templates d'emails, de factures et de contrats**, avec un éditeur drag & drop, un générateur IA, et une gestion d'équipes.

---

## Résumé du projet

Le Template Builder est un outil web que les entreprises (tenants) utilisent pour concevoir leurs documents professionnels :

- **Templates Email** — éditeur drag & drop visuel avec blocs (texte, image, bouton, vidéo, tableau, signature, réseaux sociaux…), rendu MJML, aperçu multi-device
- **Templates Facture** — formulaire structuré : client, lignes de facturation, calcul automatique HT/TVA/TTC, aperçu A4 en temps réel, export PDF
- **Templates Contrat** — éditeur de texte avec variables dynamiques (`{{client_nom}}`), 4 types (B2C, B2B, Web/E-commerce, Appel d'Offre Public), aperçu A4 en temps réel, export PDF

Chaque entreprise a son propre espace isolé (multi-tenancy). Les membres d'une équipe sont invités par email avec des rôles : **Admin**, **Éditeur**, **Lecteur**.

---

## Fonctionnalités développées ✅

| Fonctionnalité | Statut |
|---|---|
| Inscription / Connexion (JWT, cookies httpOnly) | ✅ Fait |
| Multi-tenancy (chaque org = espace isolé) | ✅ Fait |
| Gestion d'équipe (invitations par email, rôles) | ✅ Fait |
| Éditeur Email drag & drop (MJML, blocs) | ✅ Fait |
| Aperçu multi-device (Desktop, Tablette, Mobile) | ✅ Fait |
| Historique undo/redo | ✅ Fait |
| Templates favoris | ✅ Fait |
| Envoi email de test | ✅ Fait |
| Éditeur Contrat (variables, A4 preview, export PDF) | ✅ Fait |
| Éditeur Facture (calcul TVA auto, A4 preview, export PDF) | ✅ Fait |
| Recherche contextuelle (templates / membres) | ✅ Fait |
| Génération IA de templates email | ✅ Fait |

---

## Fonctionnalités à venir 🔜

| Fonctionnalité | Statut |
|---|---|
| Signature électronique sur les contrats | 🔜 À faire |
| Numérotation automatique des factures (séquentielle) | 🔜 À faire |
| Archivage des contrats signés | 🔜 À faire |
| Historique et suivi des factures (brouillon → émise → payée) | 🔜 À faire |
| Profil entreprise (SIRET, TVA, adresse) lié à la facturation | 🔜 À faire |
| API OAuth 2.1 (intégration CRM tiers via client_id / client_secret) | 🔜 À faire |
| Gestion des Appels d'Offre Public (format Chorus Pro) | 🔜 À faire |

---

## Types de documents supportés

### Emails
- Templates visuels responsives (MJML)
- Blocs : Titre, Texte, Image, Bouton, Vidéo, Tableau, Séparateur, Signature, Réseaux sociaux
- Variables dynamiques : `{{prenom}}`, `{{entreprise}}`, etc.

### Factures
| Type | Description |
|---|---|
| Standard | Facture classique après prestation |
| Pro-forma | Estimatif avant prestation (non comptable) |
| Acompte | 30–50 % payé avant démarrage |
| Solde | Reste à payer après acompte |
| Avoir | Annulation ou remboursement partiel |
| Récurrente | Abonnement mensuel / annuel |

Mentions légales incluses automatiquement (TVA 0% → mention CGI art. 293B).

### Contrats
| Type | Description |
|---|---|
| B2C — Particulier | Droit de rétractation 14 jours inclus (obligation légale) |
| B2B — Entreprise | Clauses de confidentialité, pénalités de retard |
| Web / E-commerce | CGV, RGPD, politique de retour, médiateur |
| Appel d'Offre Public | DC1/DC2, CCTP, BPU (marchés publics) |

---

## Palette de couleurs

Le projet utilise **Tailwind CSS** avec un thème neutre (noir/blanc) comme couleur principale, et des couleurs sémantiques par type de document.

### Couleurs principales (thème global)
| Rôle | Couleur | Code |
|---|---|---|
| Primary (boutons, actions) | Noir | `#0f172a` (slate-900) |
| Background | Blanc | `#ffffff` |
| Surface / Card | Blanc cassé | `#f8fafc` (slate-50) |
| Bordures | Gris clair | `#e2e8f0` (slate-200) |
| Texte secondaire | Gris | `#64748b` (slate-500) |
| Sidebar | Blanc cassé | `#f5f5f5` |
| Destructive (danger) | Rouge | `oklch(0.577 0.245 27.325)` ≈ `#ef4444` |

### Couleurs par type de document
| Type | Couleur | Hex approx |
|---|---|---|
| Email | Bleu | `#3b82f6` (blue-500) |
| Facture | Émeraude | `#10b981` (emerald-500) |
| Contrat | Ambre | `#f59e0b` (amber-500) |

### Couleurs des rôles membres
| Rôle | Couleur | Hex |
|---|---|---|
| Admin | Violet | `#7c3aed` (purple-700) |
| Éditeur | Bleu | `#1d4ed8` (blue-700) |
| Lecteur | Gris | `#475569` (slate-600) |

### Couleurs des types de contrat
| Type | Couleur |
|---|---|
| B2C | Bleu (`bg-blue-50 / text-blue-700`) |
| B2B | Violet (`bg-violet-50 / text-violet-700`) |
| Web/E-commerce | Émeraude (`bg-emerald-50 / text-emerald-700`) |
| Appel d'Offre Public | Ambre (`bg-amber-50 / text-amber-700`) |

### Couleurs des types de facture
| Type | Couleur |
|---|---|
| Standard | Bleu |
| Pro-forma | Gris |
| Acompte | Ambre |
| Solde | Émeraude |
| Avoir | Rouge |
| Récurrente | Violet |

---

## Architecture technique

```
Navigateur (Next.js 15 — Port 3001)
        │ REST / JSON
        ▼
API Gateway — NestJS (Port 3000)
        │ gRPC
        ├──► Auth Service (Port 50055)   ──► PostgreSQL auth_db
        └──► Template Service (Port 50054) ──► PostgreSQL templates_db

Services additionnels :
        ├── AI Template Service (FastAPI — Port 8000)
        ├── MinIO (stockage images — Port 9000)
        ├── NATS (messaging)
        └── Consul (service discovery — Port 8500)
```

### Stack par couche

| Couche | Technologie |
|---|---|
| Frontend | Next.js 15, TypeScript, Tailwind CSS v4, Framer Motion, shadcn/ui |
| API Gateway | NestJS, Guards JWT, Proxy gRPC |
| Auth Service | NestJS, CQRS, gRPC, TypeORM, PostgreSQL, bcrypt |
| Template Service | NestJS, CQRS, gRPC, TypeORM, PostgreSQL |
| AI Service | Python, FastAPI, Anthropic Claude API |
| Infrastructure | Docker Compose, MinIO, NATS, Consul |

---

## Structure des dossiers

```
winaity-template-builder/
├── frontend/                  # Interface utilisateur (Next.js)
│   ├── app/dashboard/
│   │   ├── page.tsx           # Tableau de bord
│   │   ├── templates/         # Liste des templates
│   │   │   ├── new/           # Création (choix du type)
│   │   │   ├── editor/        # Éditeur Email drag & drop
│   │   │   ├── contract-editor/  # Éditeur Contrat
│   │   │   └── invoice-editor/   # Éditeur Facture
│   │   ├── team/              # Membres de l'équipe
│   │   ├── invite/            # Invitation membres
│   │   └── favourites/        # Templates favoris
│   └── components/
│       ├── editor/            # Composants éditeur email
│       └── dashboard/         # Sidebar, Navbar
│
├── api-gateway/               # Proxy REST → gRPC
├── auth-service/              # Authentification & gestion équipes
├── template-service/          # CRUD templates
├── ai-template-service/       # Génération IA (Python/FastAPI)
├── packages/
│   ├── proto/                 # Définitions gRPC
│   └── shared-kernel/         # Utilitaires partagés
├── docs/                      # Diagrammes Excalidraw
├── docker-compose.yml
└── init-db.sql
```

---

## Lancer le projet en développement

### Prérequis
- Node.js 20+
- Python 3.11+
- Docker & Docker Compose

### Démarrage

```bash
# Infrastructure (PostgreSQL, MinIO, NATS, Consul)
docker compose up -d

# Auth Service
cd auth-service && npm install && npm run start:dev

# Template Service
cd template-service && npm install && npx nest start --watch

# API Gateway
cd api-gateway && npm install && npm run start:dev

# AI Service
cd ai-template-service && pip install -r requirements.txt && uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend && npm install && npm run dev
```

### Ports

| Service | Port |
|---|---|
| Frontend | 3001 |
| API Gateway | 3000 |
| AI Service | 8000 |
| Auth Service (gRPC) | 50055 |
| Template Service (gRPC) | 50054 |
| PostgreSQL | 5433 |
| MinIO Console | 9001 |
| Consul Dashboard | 8500 |
| NATS Monitoring | 8222 |

---

## Variables d'environnement

Chaque service utilise un fichier `.env.development` à sa racine.

### api-gateway
```
AUTH_SERVICE_URL=localhost:50055
TEMPLATE_SERVICE_URL=localhost:50054
```

### auth-service
```
DATABASE_URL=postgresql://...
JWT_SECRET=...
JWT_EXPIRES_IN=24h
SMTP_HOST=...
SMTP_USER=...
SMTP_PASS=...
```

### frontend
```
NEXT_PUBLIC_API_URL=http://localhost:3000
```
