# Winaity Template Builder — Document de passation

**Projet :** Winaity Template Builder — plateforme SaaS multi-tenant de création de templates
Email / Facture / Contrat / SMS / RCS avec assistant IA
**Auteur :** Ahmed Boughdiri
**Structure d'accueil :** France Téléphone — groupe Winvest Capital
**Date :** 31 juillet 2026
**Statut du projet :** livré et **en production**
**Dépôt :** GitLab — `gitlab.com/ahmedboughdirii/winaity-template-builder` (branche `main`)
**Production :** https://builder-template.winaity.com

> **Objet de ce document.** Il décrit l'intégralité du projet — périmètre livré, architecture,
> fonctionnement interne, déploiement, exploitation, dette technique — de façon à ce que
> n'importe quel développeur de l'équipe puisse reprendre la main sans moi.
>
> **Un seul chantier reste ouvert : l'intégration Keycloak (SSO depuis le CRM).** Tout le reste
> est développé, testé et en service. Le détail de ce qui reste à faire, avec les deux
> approches déjà étudiées et les étapes concrètes, est en **section 11**.

---

## Sommaire

1. [Le projet en une page](#1-le-projet-en-une-page)
2. [Périmètre livré](#2-périmètre-livré)
3. [Architecture technique](#3-architecture-technique)
4. [Modèle de données et multi-tenancy](#4-modèle-de-données-et-multi-tenancy)
5. [Le moteur IA](#5-le-moteur-ia)
6. [Facturation Stripe et gestion des plans](#6-facturation-stripe-et-gestion-des-plans)
7. [Intégrations : API, sessions déléguées, CRM](#7-intégrations--api-sessions-déléguées-crm)
8. [Production : déploiement et exploitation](#8-production--déploiement-et-exploitation)
9. [Sécurité](#9-sécurité)
10. [Ce qui a été validé, et comment](#10-ce-qui-a-été-validé-et-comment)
11. [Ce qui reste à faire — Keycloak](#11-ce-qui-reste-à-faire--keycloak)
12. [Dette technique et points de vigilance](#12-dette-technique-et-points-de-vigilance)
13. [Prendre la main sur le projet — guide de démarrage](#13-prendre-la-main-sur-le-projet--guide-de-démarrage)
14. [Documentation et livrables](#14-documentation-et-livrables)
15. [Contact](#15-contact)

---

## 1. Le projet en une page

### Le besoin

Les entreprises doivent produire des supports de communication cohérents et professionnels sur
de nombreux canaux — emails marketing, factures, contrats, SMS, messages enrichis RCS — mais
leur fabrication est lente et demande des compétences de design ou de développement. Les outils
existants sont soit trop génériques (pas de multicanal, pas de cloisonnement par entreprise),
soit trop techniques (édition HTML/MJML brute).

### La réponse

Le **Winaity Template Builder** est une plateforme SaaS multi-tenant : chaque entreprise
(*tenant*) dispose d'un espace isolé où ses équipes construisent leurs templates dans un
éditeur visuel drag & drop, assisté par une **IA agentique** qui produit de véritables blocs
éditables — pas du HTML jetable. Une équipe marketing peut ainsi obtenir un email de campagne
abouti en quelques minutes : en glissant des blocs, en décrivant ce qu'elle veut, ou même en
**envoyant une affiche existante** que l'IA reconstruit en template modifiable.

La plateforme est complète et opérationnelle : collaboration d'équipe avec rôles, abonnements
payants Stripe avec TVA française, panneau super-admin, API publique et flux d'intégration
permettant à un outil tiers (un CRM) d'ouvrir le builder pour ses propres utilisateurs.

### Le positionnement en une phrase

> « Canva rencontre un copilote IA », pour les communications d'entreprise.

### Ce qui le distingue

1. **Multicanal** — cinq canaux dans un seul outil (email, facture, contrat, SMS, RCS).
2. **IA agentique produisant des blocs réels** — les modifications visuelles et les
   modifications par IA sont interchangeables, sur le même modèle de données.
3. **Image → template par vision** — une affiche marketing devient un email éditable à la
   charte.
4. **L'intelligence de design est dans le code** — dérivation de palette, garantie de
   contraste, cinq design systems choisis selon le sujet.
5. **Intégration MCP réelle** — les 32 outils du builder sont exposés via un serveur Model
   Context Protocol : le modèle découvre les outils dynamiquement.
6. **LLM auto-hébergé** — aucune donnée client envoyée à un fournisseur tiers pour la
   génération.
7. **Qualité SaaS de production** — isolation multi-tenant, rôles, abonnements Stripe avec TVA
   correcte, application des quotas, super-admin, déploiement tunnelisé sans port ouvert.

---

## 2. Périmètre livré

### 2.1 Les cinq types de templates

| Type | Code | Canal | Éditeur livré |
|---|---|---|---|
| **Email** | 1 | Email (MJML) | Canvas drag & drop, 11 types de blocs, lignes 1–4 colonnes, aperçu live multi-device, éditeur de code Monaco, assistant IA, export HTML + PDF |
| **Facture** | 2 | PDF | Formulaire structuré (client, lignes, quantités), calcul automatique HT / TVA / TTC, aperçu A4 temps réel, export PDF, mentions légales automatiques (TVA 0 % → mention CGI art. 293 B) |
| **Contrat** | 3 | PDF | Éditeur riche Tiptap paginé, variables dynamiques `{{client_nom}}`, aperçu A4, export PDF, 4 typologies (B2C avec rétractation 14 j, B2B, Web/e-commerce, Appel d'offre public) |
| **SMS** | 4 | SMS | Éditeur texte, substitution de variables, rendu dédié (`/templates/:id/render-sms`) |
| **RCS** | 5 | RCS / RBM | Formulaire + aperçu téléphone : texte, rich cards, carrousels, chips de suggestion (réponse / ouvrir URL / appeler). **Construction, stockage et rendu uniquement — pas d'envoi** (payload JSON stocké dans `content`) |

Fonctions transverses aux templates : favoris, duplication, templates populaires, galerie de
**templates prédéfinis par tenant** (curable par le rôle `marketing`), variables
personnalisées par entreprise, envoi d'un email de test.

### 2.2 Comptes, équipes et rôles

- Inscription : crée simultanément le **tenant** et son **administrateur**, avec coordonnées
  d'entreprise structurées (téléphone, adresse, code postal, ville, pays — requises depuis
  juillet 2026 ; les anciens tenants restent à `NULL`).
- Connexion / déconnexion par **JWT en cookie httpOnly** ; mot de passe oublié et
  réinitialisation par email.
- Invitation de membres par email, acceptation d'invitation, liste des membres, profil.
- Rôles : **admin**, **editor**, **marketing** (curation de la galerie de templates prédéfinis
  de l'entreprise), **reader**, **super_admin** (transverse), et clients **M2M** pour l'API.
- Payload JWT : `{ userId, tenantId, email, role }`.

### 2.3 Éditeur Email — le module phare

- **Canvas drag & drop** construit avec dnd-kit ; lignes jusqu'à 4 colonnes, largeurs
  ajustables, styles au niveau section.
- **11 types de blocs** : titre, texte, image, vidéo, bouton, séparateur, tableau, signature,
  réseaux sociaux, menu, liste à icônes.
- **Aperçu MJML live**, aperçu Desktop / Tablette / Mobile, **éditeur de code Monaco** pour les
  utilisateurs avancés.
- Historique **undo / redo**.
- Export **HTML responsive** et **PDF** (généré côté gateway via Playwright / Chromium).
- **Point d'architecture clé :** le modèle de blocs (`BlockData`) est exactement le JSON que
  produit l'IA. Le MJML n'est généré qu'à l'export. C'est ce qui rend les éditions manuelles et
  les éditions IA totalement interchangeables.

### 2.4 Assistant IA

Détaillé en [section 5](#5-le-moteur-ia). En résumé, trois usages :

1. **Générer depuis un prompt** — « crée un email Black Friday pour notre boutique NBA » →
   email complet et cohérent (hero, offre, grille produits, footer) en une dizaine de secondes.
2. **Éditer en conversation** — « passe-le en thème sombre », « change la première image »,
   « déplace la section PS5 avant l'offre », « ajoute un encadré de prix ».
3. **Éditer une sélection** — sélectionner un bloc ou une section dans le canvas puis prompter :
   la modification s'applique exactement à cet élément.

Plus la fonction **image → template** : upload d'une affiche, lecture par vision, puis
reconstruction native en email éditable.

### 2.5 Abonnements payants

Plans **Free / Pro / Pro Organisation** (+ plan interne illimité), Stripe Checkout embarqué,
facturation mensuelle ou annuelle, TVA française 20 %, application des quotas, cycle de vie
complet (upgrade, changement, annulation, réactivation). Détail en
[section 6](#6-facturation-stripe-et-gestion-des-plans).

### 2.6 Espace super-admin

- Onglet **Organisations** : liste des tenants, utilisateurs, changement de rôle,
  réinitialisation de mot de passe, suppression, attribution de plan (dont le plan interne).
- Onglet **Commandes** : tableau des abonnements enrichi **en direct depuis Stripe** (statut,
  prochaine échéance, montant, intervalle), cartes de KPI — abonnés actifs, **MRR** (TTC),
  impayés — avec recherche et filtre par statut.
- Modération des templates (consultation et suppression tous tenants).
- Génération de clés API pour un tenant donné.
- Route de rejeu historique des paiements vers le CRM.

### 2.7 Intégrations

Clés API OAuth 2.1, flux de session déléguée type Stripe Checkout, synchronisation des
paiements vers le CRM Winaity Gestion. Détail en
[section 7](#7-intégrations--api-sessions-déléguées-crm).

### 2.8 Site marketing public

Site complet sous `frontend/app/(marketing)` : accueil, fonctionnalités, tarifs (câblés sur les
plans réels de `lib/plans`), à propos, contact, démo, page design system. Styles scopés sous
`.tb`, interactivité centralisée dans un composant `MarketingFX`.

---

## 3. Architecture technique

### 3.1 Vue d'ensemble

```
                    ┌──────────────────────────────┐
   Navigateur ─────▶│   Frontend Next.js 16        │  React 19, App Router
                    │   + routes IA + /builder/mcp │
                    └──────────────┬───────────────┘
                                   │ REST (cookie JWT httpOnly)
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
                                          MinIO                (médias, S3-compatible)

Services annexes :  AI Template Service (FastAPI) · Image Pipeline (FastAPI)
                    NATS · Consul · serveur vLLM auto-hébergé (hors compose)
```

### 3.2 Rôle de chaque composant

**Frontend (Next.js 16, App Router, React 19)** — toute l'interface : pages d'authentification,
site marketing, tableau de bord tenant, les cinq éditeurs, espace super-admin, checkout Stripe
embarqué, page développeurs, entrée de session déléguée `/s/[token]`. Héberge aussi la logique
IA côté serveur : `POST /api/ai/chat` (boucle agentique), `POST /api/ai/from-image`, et le
serveur MCP `/builder/mcp`. La clé du LLM n'est jamais exposée au navigateur.

**API Gateway (NestJS)** — **unique surface REST publique**. Responsabilités : traduction
REST → gRPC, authentification par cookie JWT et par Bearer M2M avec guard de scopes, CORS piloté
par `FRONTEND_ORIGIN`, facturation Stripe (checkout, webhooks signés, cycle de vie), application
des plans et quotas, génération de PDF (Playwright/Chromium embarqué dans l'image), upload de
médias vers MinIO, relais des paiements vers le CRM, filtre d'exceptions global pour des
messages d'erreur propres. **Service sans état** — pas de base, pas de scheduler.

**Auth Service (NestJS + gRPC + TypeORM)** — register, login, validation de token, invitation et
acceptation, profil, membres, plan et usage du tenant, clients API (`api_clients`), attribution
de plan par le super-admin, recherche de tenant par client Stripe, récupération de
l'administrateur d'un tenant.

**Template Service (NestJS + gRPC + TypeORM, CQRS)** — CRUD complet, render, duplicate,
favoris, templates populaires, variables personnalisées. Organisé strictement en
**commands / queries / events**.

**AI Template Service (FastAPI)** — aides IA auxiliaires : suggestion de palette, mapping de
variables, mapping des champs de facture.

**Image Pipeline (FastAPI)** — recherche et résolution d'images de stock (Pexels).

**packages/proto** — contrats gRPC. **Important :** le loader est configuré avec
`keepCase: true`, donc les champs restent en `snake_case` (`is_favorite`, pas `isFavorite`) sur
toute la chaîne, jusqu'aux interfaces TypeScript du frontend.

**packages/shared-kernel** — code gRPC/domaine partagé. Son `dist/` est git-ignoré : il est donc
**construit à l'intérieur du Dockerfile du template-service** (seul service qui l'importe), sinon
un clone neuf échoue avec « Cannot find module @winaity/shared-kernel ».

### 3.3 Stack détaillée

| Couche | Technologies |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui, Framer Motion, dnd-kit, Monaco, Tiptap, MJML, pdf-lib / pdfjs, jszip / xlsx |
| IA | Vercel AI SDK v6 (`ai`) + `@ai-sdk/openai-compatible`, `@modelcontextprotocol/sdk`, vLLM auto-hébergé — `gemma4-26b` (défaut) et `qwen35-35b-a3b` (fallback), 64K de contexte |
| API Gateway | NestJS, guards JWT et scopes, client gRPC, Stripe SDK, Playwright |
| Microservices | NestJS, CQRS, gRPC, TypeORM, PostgreSQL, bcrypt (mots de passe) / Argon2id (secrets clients) |
| Services Python | FastAPI, Uvicorn |
| Infrastructure | Docker Compose, PostgreSQL 18, MinIO, NATS, Consul, Cloudflare Tunnel |
| Paiement | Stripe — Checkout embarqué, webhooks à signature vérifiée, Tax Rate TVA 20 % |

### 3.4 Arborescence du dépôt

```
winaity-template-builder/
├── frontend/                     # Next.js — UI, éditeurs, IA, site marketing
│   ├── app/
│   │   ├── (auth)/               # login, register, invite, reset password
│   │   ├── (marketing)/          # site public
│   │   ├── dashboard/            # espace tenant
│   │   │   └── templates/{editor,contract-editor,invoice-editor,sms-editor,rcs-editor}
│   │   ├── super-admin/          # organisations + commandes
│   │   ├── checkout/             # Stripe Checkout embarqué
│   │   ├── developers/           # doc d'intégration
│   │   ├── s/[token]/            # entrée session déléguée
│   │   ├── builder/mcp/          # serveur MCP (32 outils)
│   │   └── api/ai/{chat,from-image}/
│   └── lib/                      # plans, blocs, MJML, planner IA, design systems
├── api-gateway/
│   ├── src/controllers/          # auth, template, billing, media, super-admin
│   └── scripts/crm-check.js      # sonde OAuth2 + envoi de test vers le CRM réel
├── auth-service/                 # + db/migrations/
├── template-service/
├── ai-template-service/ · image-pipeline/
├── packages/{proto,shared-kernel}
├── crm-gestion-fake/             # faux CRM local (port 5600)
├── tool-x-demo/ · crm-demo/      # harnais d'intégration tiers
├── infra/{docker-compose.yml,docker-compose.prod.yml,.env.example}
├── docs/                         # diagrammes OAuth2 / CRM / Keycloak / white-label
├── rapport-pfe/                  # rapport PFE (LaTeX)
├── README.md · DEPLOYMENT.md · WINAITY-PROJECT-BRIEF.md · DEMO-SCENARIO.md
└── winaity-builder.postman_collection.json
```

---

## 4. Modèle de données et multi-tenancy

### 4.1 Le principe d'isolation

`tenant_id` est la clé d'isolation de **toute** la plateforme. Il est porté par le JWT, propagé
du gateway vers les services par gRPC, et filtre systématiquement les requêtes. Aucun endpoint
métier ne renvoie de données sans filtrage par tenant — seul le `super_admin` dispose de routes
transverses, explicitement séparées sous `/auth/admin/*`.

### 4.2 Bases

Deux bases PostgreSQL sur une même instance :

- **`auth_db`** — tenants (avec plan, usage, contact structuré, identifiants Stripe),
  utilisateurs, invitations, `api_clients` (`id`, `tenant_id`, `client_id`,
  `client_secret_hash`, `scopes`, `expires_at`, `allowed_return_urls`), sessions builder.
- **`templates_db`** — templates (type, contenu JSON, `tenant_id`, favori, prédéfini,
  métadonnées), variables personnalisées par tenant.

**Médias** : MinIO, bucket organisé par tenant (`/media/:tenantId/:fileName`).

### 4.3 Gestion du schéma — à connaître impérativement

Le schéma est produit par le **`synchronize` de TypeORM**, piloté par la variable `DB_SYNC`,
et **non** par les migrations (celles committées sont partiellement obsolètes).

- En développement (`NODE_ENV=development`), `synchronize` est actif : le schéma suit les
  entités à chaque redémarrage.
- En production, `synchronize` est **désactivé** sauf si `DB_SYNC=true`. On met `DB_SYNC=true`
  **uniquement au premier déploiement** (base vide → création des tables), puis on repasse à
  `false` pour figer le schéma. Actuellement : **`false`**.
- Conséquence pratique : **le schéma est défini par le code des entités**. Toute évolution
  d'entité nécessite soit un run ponctuel `DB_SYNC=true`, soit une migration SQL écrite à la
  main (le dossier `auth-service/db/migrations/` en contient, ex.
  `0004_add_tenant_contact_columns.sql`, écrites en `ADD COLUMN IF NOT EXISTS` pour être
  rejouables sans risque).

---

## 5. Le moteur IA

C'est la partie la plus spécifique du projet ; cette section explique **pourquoi** il est
construit ainsi.

### 5.1 Le contrat : des outils qui produisent des blocs

L'IA ne génère pas de HTML. Elle **appelle des outils** — un par type de bloc, plus
`setTheme`, `startSection`, `startCard`, `startHero`, `addColorBar`, et des outils de layout,
déplacement et édition : **32 outils au total**. Chaque outil renvoie exactement le même
`BlockData` que produit l'éditeur manuel. Le MJML n'est produit qu'à l'export.

Bénéfice : ce que l'IA fabrique reste **entièrement éditable à la main**, et inversement l'IA
peut modifier ce que l'utilisateur a construit. Il n'y a qu'un seul modèle de données.

### 5.2 Génération initiale : un « planner » déterministe

Pour une génération à partir de zéro, le chemin principal **n'est pas** une boucle agentique.
Un seul appel LLM contraint par schéma produit un **`DesignSpec`** — design system, palette,
liste des sections — que du **code** transforme ensuite en blocs.

C'est un choix assumé : rapide, reproductible, sans duplication de sections et avec un seul
footer. Les boucles agentiques libres, testées, produisaient des résultats plus variables.

### 5.3 Édition : routeur d'intention puis MCP

Chaque tour de conversation passe par un **routeur d'intention** qui classe la demande
(*clear* / *rewrite* / *image* / *edit* / *changement de thème*) et déclenche le chemin adéquat :

- **Déterministe** quand c'est possible (bascule de thème, changement de layout, opérations
  structurelles) — fiable et instantané.
- **Piloté par le modèle via la couche MCP** pour les demandes ouvertes.

Le mode édition et les replis agentiques passent par le **serveur MCP réel** exposé sur
`/builder/mcp` : le modèle **découvre** les outils au lieu de se les faire réciter dans le
prompt.

**Confirmations véridiques :** l'assistant compte les mutations réellement appliquées
(`mutationCount`) et n'annonce un succès que si le template a effectivement changé. C'était un
problème récurrent des versions antérieures — un assistant qui affirme avoir modifié quelque
chose sans l'avoir fait détruit la confiance de l'utilisateur.

### 5.4 Image → template (affiche → email éditable)

1. **Lecture par vision** de l'affiche uploadée : texte verbatim, prix, offres, couleurs de
   marque, ambiance, structure de mise en page.
2. Production d'une **directive** structurée.
3. **Reconstruction native** en blocs éditables — l'image source **n'est pas collée** dans
   l'email, la campagne est reconstruite.
4. Passe d'un **critique « directeur artistique »** qui vérifie et rehausse le résultat
   (fidélité, hiérarchie, contraste).

### 5.5 L'intelligence de design est dans le code

- **Dérivation automatique de palette** à partir des couleurs de marque détectées.
- **Garde de contraste** : garantit un texte lisible sur chaque fond, quelle que soit la
  palette produite par le modèle.
- **5 design systems** — *editorial*, *bold*, *minimal*, *luxe*, *corporate* — sélectionnés
  selon le sujet.
- Traitements de blocs premium : hero sur image, cartes arrondies, barres de couleur de marque,
  encadrés de prix.

### 5.6 Robustesse

Sanitizers de sortie (suppression des fuites de « raisonnement » du modèle), reprises sur
génération vide, plafonds de tokens, garde-fous sur les outils sensibles
(`addPricingRow`, fidélité d'image), fallback de modèle.

### 5.7 Infrastructure LLM

Serveur **vLLM** auto-hébergé, API compatible OpenAI : `gemma4-26b` par défaut,
`qwen35-35b-a3b` en fallback, 64K de contexte. **Jamais exposé au client** : les appels partent
du serveur Next.js. Aucune donnée client ne quitte l'infrastructure pour la génération.

> ⚠️ **En production, l'IA est actuellement bloquée par le pare-feu de l'hôte.** Voir
> [section 12](#12-dette-technique-et-points-de-vigilance) — correctif d'une ligne, nécessite
> un accès `sudo`.

---

## 6. Facturation Stripe et gestion des plans

### 6.1 Plans et tarifs

| Plan | Mensuel | Annuel | Contenu |
|---|---|---|---|
| **Free** | 0 € | — | Email uniquement, 1 template, 1 interaction IA (compteur à vie) |
| **Pro** | 25 € HT / mois | 240 € HT / an | Tous les canaux, templates illimités, IA illimitée |
| **Pro Organisation** | 55 € HT / mois | 600 € HT / an | Pro + invitations d'équipe + accès API |
| **Interne** | — | — | Plan illimité, attribué manuellement par le super-admin |

Mensuel = flexible, prélevé chaque mois. Annuel = un prélèvement unique à tarif réduit, avec
**engagement de 12 mois**, renouvelé à la date anniversaire. **TVA française 20 %** appliquée
via un Tax Rate Stripe (`STRIPE_TAX_RATE_ID`) — les montants manipulés en interne sont **HT, en
centimes**.

### 6.2 Parcours de paiement

**Stripe Checkout embarqué** : le paiement reste sur nos pages (`frontend/app/checkout`), la
clé publique est injectée au build (`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`).

Routes : `POST /billing/checkout` (création de session), `POST /billing/confirm`,
`POST /billing/cancel` (respecte l'engagement annuel), `POST /billing/reactivate`,
`GET /billing/usage`, `POST /billing/ai/consume`, `POST /billing/webhook` (signature Stripe
vérifiée).

L'interface propose une **modale d'upgrade** soignée et des notifications toast ; le
changement de plan se fait en place.

### 6.3 Application des quotas

Le gateway est le point d'application : chaque action sensible (créer un template, utiliser
l'IA, inviter un membre, appeler l'API) est vérifiée contre le plan et l'usage du tenant. Le
compteur d'interactions IA du plan Free est **monotone à vie** (il ne se réinitialise pas), pour
que la limite ait un sens.

---

## 7. Intégrations : API, sessions déléguées, CRM

### 7.1 API machine-to-machine (OAuth 2.1)

- Un administrateur de tenant génère ses identifiants depuis **Réglages → Intégrations** (il
  n'y a plus de formulaire public anonyme).
- `POST /oauth/token` — **client_credentials** → JWT M2M avec scopes
  (`templates:read`, `templates:write`, …). Les secrets sont hachés en **Argon2id** dans
  `api_clients`.
- Les routes template acceptent `Authorization: Bearer <token>` et sont protégées par un
  **guard de scopes**.
- Gestion des clés : `GET|POST|DELETE /integrations/api-keys`,
  `PUT /integrations/return-urls`.

### 7.2 Flux de session déléguée (« ouvrir le builder depuis un outil hôte »)

Modèle inspiré de Stripe Checkout, **redirection pleine page** (pas d'iframe), **sans second
login** :

1. Le **backend** de l'outil hôte (qui détient le `client_secret`) appelle
   `POST /api/builder-sessions` → reçoit une URL de session **à usage unique**. Le secret ne
   transite jamais par le navigateur.
2. L'utilisateur est redirigé vers `/s/<token>` ; le token est échangé et **consommé**
   (`POST /s/exchange`), une session builder est ouverte.
3. Il construit son template, puis est renvoyé vers une `return_url` **figurant dans la liste
   blanche** du client (`PUT /developers/return-urls`), avec l'identifiant du template.

Tout est cloisonné **au tenant** ; l'identifiant de l'utilisateur final (`user_ref`) n'est
conservé qu'en métadonnée d'audit, sans création d'enregistrement par utilisateur.

Un harnais de test complet (`tool-x-demo/`, backend Express dédié) permet de dérouler la boucle
de bout en bout.

### 7.3 Synchronisation des paiements vers le CRM Winaity Gestion

**Objectif :** chaque paiement encaissé sur le builder doit se retrouver dans le CRM
« Winaity · Gestion » (produit frère du groupe), qui modélise Produit → Client → Contrat →
Paiement.

**Contrat d'interface, confirmé avec le développeur du CRM (Alexandre Hernandez) le
30/07/2026 :**

| Élément | Valeur |
|---|---|
| Endpoint | `POST https://api-gestion.winaity.com/api/webhook/abonnement` |
| Token | `POST https://api-gestion.winaity.com/oauth/token`, `form-urlencoded`, `grant_type=client_credentials` |
| Client | `CRM_CLIENT_ID=2abaefcc-…` (organisation Winvest, scope *full*) — secret dans `infra/.env` |
| Paramètre `scope` | **ignoré côté CRM** → ne rien envoyer |
| Token | JWT valable 1 h, **limite 1000 req/h** → mise en cache obligatoire (implémentée, rafraîchissement 60 s avant expiration) |
| Schéma | notre JSON accepté **tel quel**, aucun renommage, **validation stricte** (un champ inconnu → 400) |
| SKU produit | inutile (plan + cycle stockés bruts) |
| Dates | **toujours avec offset `Z`** (une date naïve serait lue dans le fuseau du serveur CRM) |

**Comportement asynchrone — point important.** Le webhook **répond toujours `202`**, y compris
au premier envoi : il met en file puis enregistre. Le code de statut ne permet donc **jamais** de
distinguer un premier envoi d'un rejeu. La preuve de déduplication est le **`correlation_id`
identique** sur les deux tentatives. Le résultat réel du traitement se lit sur
`GET /api/webhook/status/<correlation_id>` (Bearer) → `status: SUCCESS`. **Un 202 seul ne
signifie pas « enregistré ».**

**Implémentation** (dans `api-gateway/src/controllers/billing.controller.ts`) :

- Le webhook Stripe déjà signé est étendu ; les événements sont mappés en 5 types CRM :
  `invoice.paid` → `payment.succeeded`, `invoice.payment_failed` → `payment.failed`,
  `charge.refunded` → `payment.refunded`, `customer.subscription.updated` →
  `subscription.updated` (uniquement sur un **vrai** changement de plan ou de cycle),
  `customer.subscription.deleted` → `subscription.canceled`.
- Une **liste blanche `CRM_EVENTS`** (défaut code : `payment.succeeded`) garantit qu'aucun type
  non encore déployé côté CRM n'est envoyé — la validation stricte le rejetterait en 400.
- Auth auto-détectée : OAuth2 client_credentials si `CRM_TOKEN_URL` + `CRM_CLIENT_ID` +
  `CRM_CLIENT_SECRET` sont présents, sinon clé statique + signature HMAC (mode faux CRM).
- Relais **« fire-and-forget »** : ne bloque jamais le `200` renvoyé à Stripe.
- Payload : `event_id`, `event_type`, `occurred_at`, `tenant{id, name, phone, address{…}}`,
  `admin{id, first_name, last_name, email}`, `customer{email, stripe_customer_id}`,
  `payment{invoice_id, amount_ht, tva, amount_ttc, currency, plan, billing_cycle,
  period_start, period_end, status, stripe_subscription_id, hosted_invoice_url, invoice_pdf}`.
  La clé `admin` est **supprimée** si nulle (un DTO imbriqué nul ferait échouer tout le
  paiement en 400).
- **Rejeu historique** : `POST /billing/crm/backfill` (super-admin) —
  `{since?, limit=25 (max 100), delay_ms=4000, dry_run?}`. Liste les factures Stripe payées et
  les rejoue **des plus anciennes aux plus récentes**, en cadence maîtrisée sous la limite de
  1000 req/h. L'`event_id` est l'identifiant de facture, donc webhook et backfill **convergent**
  sur la même déduplication.
- **Outil de diagnostic** : `node api-gateway/scripts/crm-check.js` — par défaut ne fait
  qu'obtenir un token (aucune écriture) ; `--send [--twice]` envoie un payload d'exemple et
  interroge automatiquement le statut ; `--status <correlation_id>` ; garde-fou contre l'hôte
  `gestion.winaity.com` (qui renvoie un 307 et **perd le POST** — il faut bien
  `api-gestion.winaity.com`) ; lit les identifiants depuis `infra/.env`, jamais depuis la ligne
  de commande.

**Ce qui n'est pas encore fait sur cette intégration** : voir
[section 12](#12-dette-technique-et-points-de-vigilance) (outbox + retry, activation des 4
autres types d'événements côté CRM, variables CRM à renseigner dans le `.env` de production).

---

## 8. Production : déploiement et exploitation

### 8.1 Où et comment

- Serveur **`finanssor-data-center-v1`**, répertoire **`/srv/projects/winaity-template-builder`**.
- Stack **autonome** : `infra/docker-compose.prod.yml` — à lancer **seule**, jamais fusionnée
  avec l'override de développement (les `container_name` entrent en collision).
- Le dépôt sur le serveur est relié à GitLab par une **clé de déploiement SSH**
  (`~/.ssh/gitlab_deploy`, protégée par passphrase), sur la branche `main`.

### 8.2 Déployer une mise à jour

```bash
cd /srv/projects/winaity-template-builder
git pull
cd infra
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps        # tous Up ; postgres/minio healthy
```

**Il n'y a pas de déploiement continu.** Le `.gitlab-ci.yml` ne fait que du lint : un `push` ne
met **pas** le serveur à jour. Le déploiement est ce `git pull && up -d --build` manuel.

### 8.3 Accès public — Cloudflare Tunnel

Le service `cloudflared` établit une connexion **sortante** vers Cloudflare : **aucun port
entrant** à ouvrir, HTTPS géré par Cloudflare.

| Hostname public | → service interne |
|---|---|
| builder-template.winaity.com | `frontend:3000` |
| api-template-builder.winaity.com | `api-gateway:3000` |
| minio-template-builder.winaity.com | `minio:9000` |
| ai-template-builder.winaity.com | `ai-template-service:8001` |
| image-template-builder.winaity.com | `image-pipeline:8002` |

> ⚠️ **Un token de tunnel = un seul emplacement actif.** Si la stack de production tourne
> simultanément sur un poste de développement et sur le serveur, Cloudflare répartit le trafic
> entre les deux. Toujours arrêter l'autre stack avant.

### 8.4 Ports hôte

Plage assignée **4400–4499** : 4400 frontend, 4401 gateway, 4402 MinIO S3, 4403 AI, 4404 image
pipeline, 4405 console MinIO. PostgreSQL, NATS, auth-service et template-service sont
**internes uniquement**.

> ⚠️ **Jamais 9000/9001 pour MinIO** : un autre MinIO occupe déjà ces ports sur le serveur
> (seule la publication hôte a changé, le port interne du conteneur reste 9000).

### 8.5 Règles d'exploitation à retenir

1. **Les variables `NEXT_PUBLIC_*` sont figées au build du frontend.** Changer une URL publique
   ou la clé Stripe publique impose `up -d --build frontend`, un simple redémarrage ne suffit
   pas. (Ce piège a coûté un diagnostic complet : la clé Stripe n'était pas déclarée en
   `ARG`/`ENV` dans le `frontend/Dockerfile`, elle n'était donc jamais injectée dans le build.)
2. **`DB_SYNC`** : `true` seulement pour un premier déploiement sur base vide, sinon
   l'inscription échoue en 500 « relation users does not exist » ; repasser à `false` ensuite.
3. **Changer de version majeure de PostgreSQL exige `down -v`** (perte des données). PG18 monte
   son volume sur `/var/lib/postgresql`, pas `/data`.
4. En développement, l'override monte `api-gateway/src` : le code est en hot-reload, mais un
   **changement de `.env` nécessite `up -d`** pour recréer le conteneur.

### 8.6 Commandes utiles

```bash
# logs d'un service
docker compose -f docker-compose.prod.yml logs <service> --tail 50

# redémarrer un service
docker compose -f docker-compose.prod.yml up -d <service>

# rebuild après changement d'URL ou de code frontend
docker compose -f docker-compose.prod.yml up -d --build frontend

# arrêter (données conservées)
docker compose -f docker-compose.prod.yml down

# arrêter et EFFACER les données
docker compose -f docker-compose.prod.yml down -v
```

### 8.7 Configuration

Tout est centralisé dans **`infra/.env`**, dont le patron exhaustif et commenté est
**`infra/.env.example`** (seul fichier `.env*` versionné). Familles de variables : base de
données, stockage MinIO, secrets JWT, email, IA et images, ports hôte, URLs publiques, Stripe,
CRM, Convex, token de tunnel. La liste nominative complète figure dans le `README.md`, §8.

---

## 9. Sécurité

- **Secrets hors du dépôt** : `.gitignore` couvre `.env*` avec la seule exception
  `!*.env.example`. Les secrets de production sont distincts de ceux de développement.
- **Mots de passe** hachés (bcrypt) ; **secrets de clients API** hachés en **Argon2id**.
- **JWT en cookie httpOnly** pour le navigateur (pas de token en `localStorage`) ; JWT M2M
  séparé, à scopes, pour les machines.
- **CORS** piloté par `FRONTEND_ORIGIN` (liste séparée par virgules) — plus aucune origine de
  développement en dur.
- **Webhooks Stripe à signature vérifiée** ; pour le faux CRM, signature HMAC-SHA256 sur le
  corps brut.
- **Aucun port entrant ouvert** en production (tunnel sortant uniquement).
- **Isolation multi-tenant** appliquée à chaque requête ; routes transverses réservées au
  `super_admin`.
- **LLM interne** : les prompts et contenus clients ne quittent pas l'infrastructure.
- **`return_url` en liste blanche** par client API dans le flux de session déléguée (protection
  contre la redirection ouverte).

**À faire par l'équipe (hygiène) :** révoquer et régénérer le **token Cloudflare Tunnel** et le
**token d'accès personnel GitLab**, qui ont circulé hors coffre pendant le développement.
Vérifier également que l'URL du remote git sur les postes ne contient pas de PAT en clair
(`git remote -v`) et, le cas échéant, la remplacer par une URL SSH.

---

## 10. Ce qui a été validé, et comment

| Domaine | Validation |
|---|---|
| Parcours complet | inscription → invitation → acceptation → création de template → liste → rendu → favori, testé de bout en bout |
| Les cinq éditeurs | création, édition, aperçu, export (HTML/PDF) et rendu vérifiés |
| Build de production | les 9 conteneurs démarrent, testé localement puis sur le serveur |
| Mise en production | en service depuis le 4 juin 2026, accès public par tunnel Cloudflare |
| Stripe | checkout embarqué, TVA, webhooks, upgrade / annulation / réactivation ; clé publique confirmée injectée dans le build |
| Super-admin | attribution de plans, onglet Commandes avec données Stripe en direct, KPI MRR |
| Intégration CRM | validée **en réel** le 30/07/2026 : token OAuth2 (`expires_in 3600`, claims `sub=service:2abaefcc-…`, `scope:["full"]`) ; POST de notre payload exact → `202` + `correlation_id` ; `GET /api/webhook/status/<id>` → **`SUCCESS`**, enregistré en ~55 ms ; déduplication prouvée par un `correlation_id` identique au rejeu |
| Chaîne Stripe → CRM | validée avec `stripe listen` + un paiement carte 4242 réel : `[CRM] accepted payment.succeeded in_1Tyq… → 202 correlation_id=c9ef90d0-…`, statut `SUCCESS` |
| Typage | `tsc --noEmit` propre sur `api-gateway` et `auth-service` ; sur le frontend les seules erreurs restantes sont préexistantes (`lib/invoice/…`, `lib/tiptap/…`) |

**Chemins jamais exercés en réel** (codés, non éprouvés) : la route
`POST /billing/crm/backfill`, et les événements CRM `payment.failed`, `payment.refunded`,
`subscription.updated`, `subscription.canceled` — ils sont désactivés par `CRM_EVENTS` en
attendant leur prise en charge côté CRM.

**Deux enregistrements de test à faire supprimer côté CRM par Alexandre :**
`in_crmcheck_1785403070310` (tenant « Validation ») et le paiement de test réel
`in_1TyqpM3SDTmZuxcVjK9CCcfg`.

---

## 11. Ce qui reste à faire — Keycloak

> **C'est le seul chantier fonctionnel non réalisé du projet.** Tout le reste de ce document
> décrit du code livré et en service.

### 11.1 Le besoin

Permettre à un utilisateur **déjà authentifié dans l'outil hôte** (le CRM, dont le login est
géré par **Keycloak**) d'entrer dans le Template Builder **sans second login**, avec résolution
automatique de son tenant.

### 11.2 Les deux approches étudiées

Le diagramme `docs/keycloak-approaches.excalidraw` les compare ; `docs/oauth2-flow.excalidraw`
et `docs/crm-flow.excalidraw` complètent le tableau.

**Approche A — access token Keycloak transmis directement**

1. L'utilisateur se connecte au CRM via Keycloak et obtient ID token + access token + refresh
   token.
2. En cliquant « Créer un template », le CRM transmet **l'access token Keycloak** au builder.
3. Le builder **vérifie la signature via le JWKS** (clé publique) de Keycloak, lit les
   groupes/claims pour en déduire le tenant, et ouvre la session.

*Avantages :* peu de code, aucune clé à gérer, standard de l'industrie.
*Inconvénients :* dépendance à Keycloak, un seul fournisseur d'identité possible.

**Approche B — token SSO signé par le CRM**

1. L'utilisateur se connecte au CRM (Keycloak, mais le builder ne le voit jamais).
2. Le CRM génère un **token SSO signé avec son `api_secret`**, valable **5 minutes**, portant
   `user_id`, `email`, `role`, `tenant`.
3. Le builder lit l'`api_key` du token, récupère l'`api_secret` en base, vérifie la signature,
   **auto-crée le tenant** si nécessaire, et ouvre la session.

*Avantages :* indépendant de Keycloak, compatible avec n'importe quel CRM, multi-clients.
*Inconvénients :* plus de code, table de clés à gérer (elle existe déjà : `api_clients`).

**Question à trancher avec le tuteur / l'équipe CRM** (déjà formulée dans le diagramme) :
*« le CRM peut-il envoyer directement l'access token Keycloak au builder ? »* — Si **oui** →
approche A. Si **non**, ou si l'on veut supporter d'autres CRM → approche B.

**Recommandation personnelle :** commencer par l'**approche B**. Elle réutilise presque tout
l'existant, ne crée aucune dépendance à l'infrastructure d'un tiers, et l'approche A pourra être
ajoutée ensuite comme second vérificateur sans rien refondre.

### 11.3 Le socle déjà en place (l'essentiel du travail est fait)

- OAuth 2.1 **client_credentials** opérationnel (`POST /oauth/token`), JWT à scopes.
- Table **`api_clients`** : `client_id`, `client_secret_hash` (Argon2id), `scopes`,
  `expires_at`, `allowed_return_urls`.
- **Guard de scopes** sur les routes template.
- **Flux de session à usage unique déjà livré** : `POST /api/builder-sessions` →
  `/s/<token>` → `POST /s/exchange` → `return_url` en liste blanche.
- Résolution du tenant et création de session côté builder déjà écrites.
- Un **harnais d'outil tiers** (`tool-x-demo/`) pour dérouler le flux de bout en bout.

### 11.4 Étapes concrètes pour finir

1. **Trancher A ou B** avec l'équipe CRM (la question ci-dessus).
2. Ajouter un **vérificateur de token externe** en amont du flux de session existant :
   - approche A : client JWKS (récupération et cache des clés publiques Keycloak),
     vérification `iss` / `aud` / `exp`, mapping groupes/claims → `tenant_id` ;
   - approche B : lecture de l'`api_key`, récupération du secret, vérification de signature et
     de la fenêtre de 5 minutes, auto-création du tenant si inconnu.
3. **Réutiliser** `POST /s/exchange` pour émettre le cookie de session : ne pas créer un second
   chemin d'authentification.
4. Ajouter la configuration : URL du realm Keycloak / URL JWKS / issuer attendu (approche A),
   ou simplement s'appuyer sur `api_clients` (approche B) — dans `infra/.env.example` et les
   deux fichiers compose.
5. **Tester** avec `tool-x-demo/` puis avec le CRM réel ; vérifier explicitement les cas
   d'échec : token expiré, mauvaise signature, tenant inconnu, `return_url` non autorisée.
6. **Décider du sort de l'ancien `/embed`** (`frontend/app/embed/page.tsx`) : iframe avec token
   dans le fragment d'URL, c'est une **démo obsolète** supplantée par `/s/<token>`. À
   supprimer une fois le nouveau flux validé — mais **ne pas la supprimer sans en parler**, elle
   a pu être montrée à des interlocuteurs.
7. Optionnel, si l'on va jusqu'au white-label : `builder.<client>.com` en CNAME vers
   `builder.winaity.com`, l'utilisateur ne voyant jamais changer d'URL (voir
   `docs/white-label-architecture.excalidraw`).

---

## 12. Dette technique et points de vigilance

Classés par priorité.

### Priorité haute

1. **IA indisponible en production — blocage réseau.** Le serveur vLLM n'écoute que sur l'IP
   Tailscale de l'hôte (`100.69.243.67:11434`). La résolution DNS est déjà réglée côté compose
   (`extra_hosts` mappant le nom MagicDNS vers cette IP, ce qui préserve la validité du
   certificat TLS), mais la connexion **expire** : le sous-réseau bridge `172.20.55.0/24` est
   bloqué par le pare-feu INPUT de l'hôte. Depuis l'hôte l'appel répond 200 ; depuis un
   conteneur, `UND_ERR_CONNECT_TIMEOUT`.
   **Correctif, une ligne, à appliquer par un administrateur :**
   ```bash
   sudo ufw allow from 172.20.55.0/24 to any port 11434 proto tcp
   ```
   Règle interne et réversible. Le mode `network_mode: host` pour le frontend **n'est pas une
   option** : cloudflared joint le frontend par son nom de conteneur sur `winaity-net`, cela
   couperait le site public.

2. **Variables CRM absentes du `.env` de production.** Il faut y renseigner les vrais
   `CRM_API_URL` et `CRM_TOKEN_URL`, laisser `CRM_HMAC_SECRET` et `CRM_SCOPE` vides, et
   maintenir `CRM_EVENTS=payment.succeeded`. Documentés en commentaire dans
   `infra/.env.example`. Activer aussi `charge.refunded` dans le tableau de bord Stripe le jour
   où l'on voudra les remboursements.

3. **Rotation de secrets.** Token Cloudflare Tunnel et token d'accès GitLab à révoquer et
   régénérer (ils ont circulé hors coffre). Vérifier `git remote -v` sur les postes : pas de PAT
   en clair dans l'URL.

### Priorité moyenne

4. **Relais CRM sans filet.** L'envoi est en « fire-and-forget » : si le CRM est indisponible,
   l'événement est seulement journalisé, il est perdu. Le durcissement conçu et non réalisé :
   table **`crm_outbox`** dans l'auth-service (`event_id` UNIQUE pour l'idempotence, `payload`
   jsonb, `status pending|delivered|failed|dead`, `attempts`, `next_attempt_at`, `last_error`),
   RPC gRPC `EnqueueCrmEvent` (insert-if-not-exists), worker `@nestjs/schedule` (~30 s, backoff
   1 min → 5 min → 30 min → 2 h → 6 h puis `dead`). L'outbox va dans l'auth-service parce que le
   gateway est **sans état** (ni base ni scheduler). Bonus prévu : un panneau « Livraisons CRM »
   dans le super-admin (livrés / échoués / morts + rejeu).

5. **`typescript.ignoreBuildErrors: true`** dans `frontend/next.config.ts` : des erreurs de
   typage réelles sont masquées (principalement `lib/invoice/ingest/apply.ts` et
   `lib/tiptap/variable-node-view.tsx`). Marche à suivre : `npm run build` dans `frontend/`,
   corriger les erreurs listées, puis retirer le flag.

6. **Schéma géré par `synchronize` et non par migrations.** Fonctionnel pour ce projet, mais
   cela signifie que **le schéma = les entités**. Reprendre une véritable chaîne de migrations
   serait le bon investissement si l'équipe grandit.

### Priorité basse

7. Quelques pages d'éditeur conservent un `export const dynamic = 'force-dynamic'` désormais
   inutile — sans effet néfaste.
8. **Convex** (curseurs live, synchronisation de brouillon) : les variables existent, la
   fonctionnalité n'a pas été développée.
9. **Enregistrement `Consul`** des services : présent dans l'infrastructure, non exploité.
10. La page **`/embed`** historique est une démo obsolète (voir §11.4 point 6).

### ⚠️ Avant tout `git pull` sur le serveur

Des correctifs de production ont été appliqués **directement sur le serveur** par le passé, puis
écrasés par un `git pull` (l'épisode de la clé Stripe). **Règle :** tout correctif appliqué sur
le serveur doit être reporté dans le dépôt et poussé, sinon il disparaîtra au prochain
déploiement.

---

## 13. Prendre la main sur le projet — guide de démarrage

### 13.1 Lancer l'environnement de développement

```bash
git clone git@gitlab.com:ahmedboughdirii/winaity-template-builder.git
cd winaity-template-builder/infra
cp .env.example .env      # renseigner les valeurs (secrets, clés Stripe de test, AI_*)
docker compose up -d --build
docker compose ps
```

Interface : http://localhost:3001 · API : http://localhost:3000

Pour lancer les services hors Docker, voir le `README.md`, §6.

### 13.2 Ports de développement

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

### 13.3 Tester Stripe en local

```bash
stripe listen --forward-to localhost:3000/billing/webhook
# paiement de test : carte 4242 4242 4242 4242
```

> ⚠️ **Le `.env` de développement pointe actuellement vers le CRM de production.** Tout
> paiement de test local crée donc un enregistrement réel côté CRM, et `CRM_EVENTS` doit rester
> limité à `payment.succeeded` tant que c'est le cas (les autres types seraient rejetés en 400).
> Les valeurs du faux CRM sont conservées en commentaire dans le `.env` pour basculer sur
> `crm-gestion-fake/` (port 5600) en développement — c'est le mode à privilégier.

### 13.4 Par où lire le code

| Pour comprendre… | Commencer par |
|---|---|
| Les routes exposées | `api-gateway/src/controllers/` (auth, template, billing, media, super-admin) |
| Le modèle de blocs et le rendu email | `frontend/lib/` (blocs, MJML, design systems) |
| Le moteur IA | `frontend/app/api/ai/chat/route.ts`, `frontend/app/builder/mcp/route.ts`, le planner dans `frontend/lib/` |
| Le paiement et le CRM | `api-gateway/src/controllers/billing.controller.ts` |
| Les plans et quotas | `frontend/lib/plans` + l'application côté gateway |
| L'authentification et les tenants | `auth-service/src/auth/` (CQRS : commands, queries, handlers) |
| Les templates | `template-service/src/` (CQRS) |
| Les contrats gRPC | `packages/proto/` (attention : `keepCase: true`, champs en `snake_case`) |

### 13.5 Pièges déjà rencontrés — à ne pas refaire

- **`keepCase: true`** sur le loader gRPC : les champs restent en `snake_case`. Un mapper qui
  renvoie `isFavorite` au lieu de `is_favorite` casse silencieusement le frontend.
- Le **`dist/` de `shared-kernel` est git-ignoré** : il est construit dans le Dockerfile du
  template-service. Un clone neuf qui builderait sans cela échoue sur
  « Cannot find module @winaity/shared-kernel ».
- **`useSearchParams` doit être enveloppé dans `<Suspense>`** pour que `next build` passe
  (`force-dynamic` ne suffit **pas** avec Next 16 + Turbopack).
- **`NEXT_PUBLIC_*` = figé au build.** Toute variable publique doit être déclarée en
  `ARG` + `ENV` dans le `frontend/Dockerfile`, sinon elle n'est jamais injectée.
- **Ne jamais publier MinIO sur 9000/9001** côté hôte sur ce serveur.
- **Ne jamais poster vers `gestion.winaity.com`** pour le CRM : redirection 307 qui **perd le
  POST**. L'hôte correct est `api-gestion.winaity.com`.
- **Un `202` du CRM ne prouve pas l'enregistrement** : il faut interroger
  `GET /api/webhook/status/<correlation_id>`.

---

## 14. Documentation et livrables

| Document | Contenu |
|---|---|
| `README.md` | Référence du dépôt : périmètre, architecture, démarrage, déploiement, API, reste à faire |
| `DEPLOYMENT.md` | Guide de déploiement serveur, fichiers concernés, incidents résolus, commandes courantes |
| `WINAITY-PROJECT-BRIEF.md` | Brief produit complet (vision, fonctionnalités, chronologie, arguments) |
| `DEMO-SCENARIO.md` | Scénario de démonstration |
| `PRESENTATION-WINAITY-MARKETING.md` | Support de présentation orienté marketing |
| `AI-Assistant-MCP-Explained.pdf` | Explication du fonctionnement MCP de l'assistant |
| `docs/DEVELOPERS_INTEGRATION.md` | Guide d'intégration pour outils tiers |
| `docs/*.excalidraw` | Diagrammes : flux OAuth2, flux CRM, **approches Keycloak**, white-label |
| `architecture-*.drawio`, `diagramme-classes.wsd`, `cas-utilisation.wsd` | Diagrammes d'architecture, de classes, cas d'utilisation |
| `rapport-pfe/` | Rapport de fin d'études (LaTeX) |
| `winaity-builder.postman_collection.json` | Collection Postman de l'API |
| `api-gateway/scripts/crm-check.js` | Sonde de diagnostic de l'intégration CRM |

**Convertir ce document en PDF :**

```bash
# avec pandoc (rendu soigné)
pandoc PASSATION-WINAITY-TEMPLATE-BUILDER.md -o Passation-Winaity-Template-Builder.pdf \
  --pdf-engine=xelatex -V geometry:margin=2cm -V lang=fr --toc

# ou simplement : ouvrir le fichier dans VS Code → aperçu Markdown → Imprimer → PDF
```

---

## 15. Contact

Le projet est livré, en production, et documenté pour être repris sans moi : ce document plus le
`README.md` et le `DEPLOYMENT.md` couvrent l'installation, l'architecture, l'exploitation et la
dette connue.

**Il ne manque que l'intégration Keycloak** ([section 11](#11-ce-qui-reste-à-faire--keycloak)),
dont les deux approches sont documentées, diagrammes à l'appui, et dont le socle technique est
déjà en place.

Si l'équipe a besoin d'un éclaircissement, d'un contexte manquant ou d'un coup de main sur une
partie du code, **n'hésitez pas à me contacter** — mes coordonnées sont déjà connues en
interne. Je reste disponible avec plaisir pour répondre.

Merci pour ces mois de travail et pour la confiance.

**Ahmed Boughdiri**
France Téléphone — groupe Winvest Capital
31 juillet 2026
