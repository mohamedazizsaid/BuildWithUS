# L'intégration développeurs — explication simple

Comment d'autres applications peuvent intégrer WinTemplate dans leur produit. On va expliquer ça étape par étape, en français, avec des exemples concrets.

---

## 1. Le problème qu'on voulait résoudre

WinTemplate, c'est une plateforme qui aide à créer des modèles (emails, factures, contrats). Normalement, un utilisateur s'inscrit directement chez nous.

Mais imagine une autre entreprise — appelons-la **Outil X** (son site : `exemple.com`). Outil X a déjà ses utilisateurs, son application, sa marque. Et un jour, Outil X nous dit :

> *« On voudrait que, quand notre utilisateur clique sur "Créer un template" dans NOTRE app, le builder de WinTemplate s'ouvre. Il fait son template. Et quand il sauvegarde, il revient chez nous, et on récupère l'ID du template. »*

Bonne idée ! Mais il y a 3 problèmes à régler avant de pouvoir le faire :

### Problème 1 — deux comptes pour le même utilisateur
L'utilisateur a déjà un compte chez Outil X. C'est pénible de lui demander un deuxième mot de passe juste pour ouvrir le builder.

### Problème 2 — la clé secrète qui se balade dans le navigateur
Si Outil X met sa clé secrète directement dans la page web (front-end), n'importe qui peut faire « clic droit → inspecter » et la voir. Et avec cette clé, on peut tout faire au nom d'Outil X. **Catastrophe.**

### Problème 3 — la redirection ouverte (open redirect)
Quand l'utilisateur a fini, il faut le renvoyer chez Outil X. Mais si on accepte n'importe quelle URL, un attaquant pourrait faire :
*« Hé WinTemplate, renvoie l'utilisateur vers `https://phishing.com` ! »*
Et notre site servirait de tremplin à du phishing. **Catastrophe aussi.**

On a résolu les trois en s'inspirant de ce que fait **Stripe Checkout** : une URL à usage unique, créée par le serveur d'Outil X, validée contre une liste blanche.

---

## 2. Le scénario complet (en images)

Voici, pas à pas, ce qui se passe quand Alice (utilisatrice d'Outil X) clique sur "Créer un template" :

```
┌────────────┐          ┌──────────────┐         ┌────────────────┐
│   ALICE    │          │   OUTIL X    │         │   WINTEMPLATE  │
│ (le navig.)│          │ (exemple.com)│         │ (builder.com)  │
└─────┬──────┘          └──────┬───────┘         └────────┬───────┘
      │                        │                          │
      │ 1. Clic « Créer        │                          │
      │    un template »       │                          │
      │───────────────────────►│                          │
      │                        │                          │
      │                        │ 2. Le serveur d'Outil X  │
      │                        │    appelle WinTemplate   │
      │                        │    avec sa clé secrète   │
      │                        │─────────────────────────►│
      │                        │                          │
      │                        │                          │── vérifie la clé
      │                        │                          │── vérifie l'URL
      │                        │                          │   de retour
      │                        │                          │── crée une session
      │                        │                          │   à usage unique
      │                        │                          │
      │                        │ 3. Réponse :             │
      │                        │    « voici une URL :     │
      │                        │      builder.com/s/abc » │
      │                        │◄─────────────────────────│
      │                        │                          │
      │ 4. Outil X redirige    │                          │
      │    Alice vers cette    │                          │
      │    URL spéciale        │                          │
      │◄───────────────────────│                          │
      │                                                   │
      │ 5. Alice arrive sur builder.com/s/abc             │
      │──────────────────────────────────────────────────►│
      │                                                   │── échange l'URL
      │                                                   │   contre un JWT
      │                                                   │   de 24h
      │                                                   │── détruit l'URL
      │                                                   │   (usage unique)
      │                                                   │
      │ 6. Alice est connectée dans le builder            │
      │    (sans mot de passe !)                          │
      │◄──────────────────────────────────────────────────│
      │                                                   │
      │ 7. Elle choisit "email", crée son template,       │
      │    clique « Sauvegarder »                         │
      │──────────────────────────────────────────────────►│
      │                                                   │── enregistre
      │                                                   │   le template
      │                                                   │
      │ 8. WinTemplate renvoie Alice chez Outil X         │
      │    avec l'ID du template en paramètre             │
      │◄──────────────────────────────────────────────────│
      │                                                   │
      │ 9. Alice arrive sur exemple.com/callback?         │
      │       template_id=tpl_xyz                         │
      │───────────────────────►│                          │
      │                        │── Outil X enregistre     │
      │                        │   l'ID, affiche un       │
      │                        │   message « créé ! »     │
```

Important : ce schéma a **deux moments très différents**.

- **Étapes 2 et 3 : serveur à serveur.** C'est le *backend* d'Outil X qui parle au backend de WinTemplate. La clé secrète ne quitte JAMAIS les serveurs. Le navigateur d'Alice ne la voit pas.
- **Étapes 4 à 9 : tout dans le navigateur.** Alice navigue normalement, avec une URL temporaire à usage unique.

Cette séparation, c'est la clé de la sécurité.

---

## 3. Les trois sécurités, en une phrase chacune

| Le risque | Notre protection |
|---|---|
| Quelqu'un vole la clé secrète dans le navigateur | **La clé n'est jamais dans le navigateur** — uniquement sur le serveur d'Outil X |
| Quelqu'un vole une URL `/s/abc` et essaie de la rejouer | **L'URL est à usage unique** — on la détruit dès qu'elle sert, et elle expire après 24h |
| Quelqu'un essaie de rediriger un utilisateur vers du phishing | **Liste blanche obligatoire** — Outil X doit déclarer à l'avance quelles URL il peut recevoir |

Chacune de ces 3 protections est dans **un seul morceau de code**, qu'on peut auditer en 5 minutes (voir section 6).

---

## 4. Ce qu'on a ajouté concrètement

### 4.1 Dans la base de données

Deux changements dans la base `auth_db` :

**(a) Nouvelle colonne dans la table `api_clients` :**

```
allowed_return_urls  TEXT  (peut être vide)
```

C'est la liste des URL où Outil X a le droit de recevoir ses utilisateurs. Format : URL séparées par des virgules. Vide = aucune intégration possible.

**(b) Nouvelle table `builder_sessions` :**

C'est la table qui stocke les « tickets » à usage unique. Chaque fois qu'Outil X demande une session, on y ajoute une ligne :

```
id            UUID                              -- identifiant interne
token         TEXTE UNIQUE                      -- le « abc123 » dans /s/abc123
tenant_id     UUID                              -- à quel client appartient
client_id     UUID                              -- quelle API client a fait la demande
mode          'new' | 'edit' | 'list'           -- que veut faire l'utilisateur
template_id   UUID (optionnel)                  -- si on édite un template précis
return_url    TEXTE                             -- où renvoyer après le save
user_ref      TEXTE (optionnel)                 -- l'ID interne de l'user chez Outil X
expires_at    DATE                              -- maintenant + 24h
used_at       DATE (vide au début)              -- la date où le ticket a été utilisé
created_at    DATE
```

**Comment ça vit :** une ligne est créée à la demande, puis « brûlée » dès qu'elle sert (on met `used_at` à la date actuelle). Si quelqu'un essaie de la réutiliser, on refuse.

> *À noter :* en développement, `synchronize: true` est activé dans TypeORM. Ça veut dire que ces changements de base sont appliqués **automatiquement** quand le service `auth-service` redémarre. Pas besoin d'écrire une migration SQL.

### 4.2 Les trois sortes de JWT (jetons d'authentification)

Avant, on avait 2 types de JWT. Maintenant on en a 3 :

| Type | Pour qui | Durée | Comment il voyage |
|---|---|---|---|
| `user` | Un vrai humain qui s'est connecté avec mot de passe | 24 h | Cookie du navigateur |
| `m2m` | Le serveur d'Outil X qui appelle notre API directement | 1 h | Header `Authorization: Bearer ...` |
| **`integration_session`** *(nouveau)* | L'utilisateur d'Outil X, dans le builder embarqué | 24 h | Header `Authorization: Bearer ...` (stocké dans le `sessionStorage` du navigateur) |

À quoi ressemble un `integration_session` décodé :

```json
{
  "sub":          "id-du-tenant",
  "tenant_id":    "id-du-tenant",
  "client_id":    "id-de-l-api-client",
  "mode":         "new",
  "return_url":   "https://exemple.com/callback",
  "scopes":       ["templates:read", "templates:write"],
  "type":         "integration_session",
  "exp":          1730086400
}
```

Quand notre passerelle (api-gateway) reçoit ce JWT dans un header, elle le reconnaît et traite la requête **comme si c'était un utilisateur normal avec le rôle "editor"**. C'est ça qui permet au builder de fonctionner à 100% (sauvegarde, liste, édition...) sans que l'utilisateur ait jamais saisi de mot de passe.

### 4.3 Les quatre nouveaux endpoints HTTP

Tous exposés par la passerelle sur le port 3000. Aucun n'est derrière un login — ils s'authentifient par `client_id` + `client_secret`.

| Méthode + URL | À quoi ça sert | Qui appelle |
|---|---|---|
| `POST /developers/register` | Inscription : crée un tenant + une paire de clés | N'importe qui (formulaire public) |
| `POST /developers/return-urls` | Déclare les URL autorisées | Le backend d'Outil X |
| `POST /api/builder-sessions` | Génère une URL `/s/<token>` à usage unique | Le backend d'Outil X |
| `POST /s/exchange` | Échange un token contre un JWT de 24h | La page `/s/<token>` dans le navigateur |

---

## 5. Un exemple complet — du début à la fin

Suivons **Acme CRM**, une entreprise qui veut intégrer WinTemplate.

### Étape 1 — Le CTO d'Acme s'inscrit

Il ouvre `http://localhost:3001/developers` et remplit :

```
Nom de l'application : Acme CRM
E-mail de contact    : dev@acme.com
```

Il clique sur **Générer mes clés**. Une fenêtre s'ouvre :

```
TENANT_ID              : 9c8b3e2a-...
BUILDER_CLIENT_ID      : 5e02f209-4d44-4eb7-aad7-f0c01353d70f
BUILDER_CLIENT_SECRET  : KUjFgrEgKWT6ZJcjfTNpT5U51T9EgqzVaJn0erVfFKM
```

La fenêtre **oblige le CTO à cocher « j'ai sauvegardé ma clé secrète »** avant de fermer. Ensuite, le secret n'est plus visible **nulle part** dans WinTemplate. Notre base ne contient qu'un hash argon2 — même nous, on ne peut pas le récupérer.

Côté technique, ce formulaire appelle :

```http
POST /developers/register
Content-Type: application/json

{ "name": "Acme CRM", "email": "dev@acme.com" }
```

…et derrière, le handler `RegisterDeveloperHandler` fait :
1. Crée un nouveau Tenant (`Acme CRM`)
2. Génère un `client_id` aléatoire (UUID)
3. Génère un `client_secret` aléatoire (32 bytes en base64)
4. Hash le secret avec argon2, stocke le hash en BDD
5. Renvoie le secret **en clair, une seule fois**, dans la réponse

### Étape 2 — Acme déclare ses URL de retour

Le CTO met les clés dans son `.env` et appelle, une seule fois :

```http
POST /developers/return-urls
Content-Type: application/json

{
  "client_id":     "5e02f209-...",
  "client_secret": "KUjFgrEgKWT6...",
  "urls": [
    "https://acme.com/builder/callback",
    "http://localhost:4444/callback"
  ]
}
```

Le backend vérifie la clé, valide que chaque URL est correcte (commence par `http://` ou `https://`), puis enregistre la liste.

### Étape 3 — Acme intègre le bouton dans son CRM

Maintenant, dans le CRM d'Acme, la commerciale **Alice** voit un bouton **« Créer un modèle d'email »**. Elle clique. Son navigateur fait une requête au backend d'Acme :

```javascript
// Code côté backend d'Acme — pas dans le navigateur !
app.get('/start-builder', async (req, res) => {

  // On demande à WinTemplate de créer une session
  const r = await fetch('http://wintemplate.com/api/builder-sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id:     process.env.BUILDER_CLIENT_ID,
      client_secret: process.env.BUILDER_CLIENT_SECRET,
      mode:          'new',
      return_url:    'https://acme.com/builder/callback',
      user_ref:      req.user.id, // optionnel, pour l'audit
    }),
  });

  // WinTemplate nous renvoie l'URL spéciale
  const { url } = await r.json();

  // On redirige Alice vers cette URL
  res.redirect(url);
});
```

Côté WinTemplate, voici ce qui se passe pendant cet appel :

1. On retrouve l'api_client avec son `client_id`
2. On vérifie le secret avec argon2 (≈ 30 ms — c'est volontaire, ça rend les attaques brute-force impossibles)
3. On découpe `allowed_return_urls` par les virgules
4. On vérifie que `return_url` est dans la liste. Sinon → **refusé** (403)
5. Si la liste est vide → **refusé** (« vous devez d'abord déclarer vos URLs »)
6. On génère un token aléatoire de 256 bits
7. On enregistre une nouvelle ligne dans `builder_sessions` avec `expires_at = maintenant + 24h`
8. On renvoie `{ token, expires_at }`
9. La passerelle transforme ça en `{ url: "https://wintemplate.com/s/<token>" }`

Alice est maintenant en train d'être redirigée vers `http://localhost:3001/s/abc123...`.

### Étape 4 — La page /s échange le token

Quand Alice arrive sur `/s/abc123`, notre composant React fait immédiatement :

```http
POST /s/exchange
{ "token": "abc123..." }
```

Le handler `ExchangeBuilderSessionHandler` :

1. Cherche la session par son token
2. Refuse si le token est inconnu, déjà utilisé, ou expiré
3. **Met `used_at` à maintenant** — à partir d'ici, le token est mort
4. Génère un JWT de type `integration_session`
5. Renvoie le JWT à Alice

La page `/s/<token>` fait alors :
- Stocke le JWT dans `sessionStorage` (clé : `winaity_embed_token`)
- Stocke l'URL de retour dans `sessionStorage` (clé : `winaity_builder_return_url`)
- Redirige Alice vers `/dashboard/templates/new`

À partir de là, toutes les requêtes que fait le builder ajoutent automatiquement le header `Authorization: Bearer <JWT>`.

### Étape 5 — Alice utilise le builder normalement

Alice arrive sur la page « Nouveau modèle ». Elle choisit **Email**, fait son template, et clique sur **Sauvegarder**.

Le code du builder fait son travail habituel :
- Construit le contenu MJML
- Fait un `POST /templates` à la passerelle
- La passerelle voit le JWT, le valide, autorise la requête
- Le template est enregistré
- Réponse : `{ id: "tpl_xyz", ... }`

**Et puis** une nouvelle ligne de code que j'ai ajoutée s'exécute :

```javascript
const returnUrl = getBuilderReturnUrl(); // lit dans sessionStorage

if (returnUrl && resultId) {
  setBuilderReturnUrl(null); // on nettoie
  window.location.href = `${returnUrl}?template_id=${resultId}`;
  return;
}
```

Alice quitte WinTemplate. Son navigateur charge `https://acme.com/builder/callback?template_id=tpl_xyz`.

### Étape 6 — Alice est de retour chez Acme

Le backend d'Acme reçoit la requête :

```javascript
app.get('/builder/callback', (req, res) => {
  const templateId = req.query.template_id;
  // → "tpl_xyz"

  // Acme enregistre l'ID dans sa propre BDD, l'associe à Alice
  saveTemplateForUser(req.user.id, templateId);

  // Redirige Alice où elle voulait aller au départ
  res.redirect('/dashboard?created=' + templateId);
});
```

Alice voit le tableau de bord d'Acme avec une bannière « Template créé ! ». Pour elle, ça lui a pris 5 minutes. Pour WinTemplate, une ligne de session a été créée, utilisée une fois, et reste maintenant inutilement en BDD (un nettoyage automatique est prévu plus tard).

---

## 6. Les 5 endroits-clés du code (pour un audit rapide)

Si quelqu'un veut vérifier que tout est sécurisé, voici les **seuls** fichiers à lire :

### 1. La clé secrète ne touche jamais le navigateur

→ Fichier : `auth-service/src/auth/application/commands/handlers/mint-builder-session.handler.ts`

Le secret arrive **uniquement** via gRPC depuis le *backend* d'Outil X. Il n'existe **aucune route frontend** qui accepte un `client_secret` en entrée, à part la page `/developers` qui en *génère* un.

### 2. La liste blanche est respectée

Toujours dans le même fichier, vers la ligne 40 :

```typescript
const allowed = (client.allowedReturnUrls ?? '')
  .split(',').map(u => u.trim()).filter(Boolean);

if (allowed.length === 0) {
  throw new ForbiddenException('Aucune URL autorisée — déclarez-en une');
}
if (!allowed.includes(command.returnUrl)) {
  throw new ForbiddenException('Cette URL n\'est pas dans la liste blanche');
}
```

Comparaison **stricte** (exacte). Pas de joker, pas de match partiel.

### 3. Le token est à usage unique

→ Fichier : `auth-service/src/auth/application/commands/handlers/exchange-builder-session.handler.ts`

```typescript
if (session.usedAt) {
  throw new UnauthorizedException('Token déjà utilisé');
}
if (session.expiresAt < now) {
  throw new UnauthorizedException('Token expiré');
}

await this.builderSessionRepository.markUsed(command.token, now);
// → après cette ligne, plus aucun exchange ne peut réussir avec ce token
```

L'ordre est crucial : on **brûle le token AVANT de signer le JWT**.

### 4. Le JWT a une durée de vie maximale

Toujours dans le même fichier :

```typescript
const remainingMs = session.expiresAt.getTime() - now.getTime();
const ttlSeconds = Math.max(60, Math.floor(remainingMs / 1000));
```

Le JWT ne peut **jamais survivre plus longtemps que la session**. Même si Outil X demande une session 23h59m avant l'expiration, le JWT ne durera que 1 minute.

### 5. Le JWT a des permissions limitées

Le JWT `integration_session` porte uniquement les scopes `templates:read` et `templates:write`. Donc même si quelqu'un volait ce JWT, il ne pourrait :
- **Pas** changer la facturation
- **Pas** inviter des utilisateurs
- **Pas** accéder à l'admin
- **Pas** voir les données d'un autre tenant

Juste manipuler les templates d'un seul tenant.

---

## 7. Les fichiers ajoutés (par ordre de lecture)

### Côté backend

```
auth-service/proto/auth.proto
  → Le « contrat » : on a ajouté 4 nouvelles méthodes gRPC tout en bas.

auth-service/src/auth/infrastructure/persistence/entities/
  ├─ api-client.orm-entity.ts         → Ajout de la colonne allowed_return_urls
  └─ builder-session.orm-entity.ts    → Nouvelle table

auth-service/src/auth/application/commands/handlers/
  ├─ register-developer.handler.ts         → Étape 1 : l'inscription
  ├─ update-allowed-return-urls.handler.ts → Étape 2 : la liste blanche
  ├─ mint-builder-session.handler.ts       → Étape 3 : créer une URL
  └─ exchange-builder-session.handler.ts   → Étape 4 : échanger l'URL

auth-service/src/auth/application/services/jwt.service.ts
  → Ajout de signIntegrationSession() pour signer le nouveau type de JWT.

auth-service/src/auth/infrastructure/grpc/auth.grpc-controller.ts
  → Branche les 4 nouvelles méthodes gRPC + reconnaît integration_session
    dans ValidateToken.

api-gateway/src/controllers/auth.controller.ts
  → Tout en bas : la classe DevelopersController avec les 4 routes HTTP.

api-gateway/src/guards/auth.guard.ts
  → Ajout d'un cas "else if integration_session" pour transformer
    le JWT en utilisateur fictif.
```

### Côté frontend

```
frontend/app/developers/page.tsx
  → La page publique d'inscription, avec la fenêtre qui montre le secret.

frontend/app/s/[token]/page.tsx
  → La page qui échange le token contre un JWT, puis redirige.

frontend/lib/api.ts
  → Ajout de setBuilderReturnUrl() et getBuilderReturnUrl().

frontend/context/auth.tsx
  → Reconnaît le JWT integration_session et crée un faux utilisateur
    pour que le dashboard puisse s'afficher.

frontend/app/dashboard/templates/editor/page.tsx
frontend/app/dashboard/templates/invoice-editor/page.tsx
frontend/app/dashboard/templates/contract-editor/page.tsx
  → Chaque handler de save vérifie maintenant : s'il y a une URL de
    retour en mémoire, on redirige vers Outil X à la place de rester
    dans le builder.
```

### Le bac à sable de test (`tool-x-demo/`)

```
tool-x-demo/
  ├─ package.json
  ├─ server.js          → ≈200 lignes : settings, mint, callback, log
  ├─ README.md
  └─ .env.example
```

C'est une mini-application qui *simule* Outil X. Elle sert à :
- Démontrer le flux complet sans avoir besoin d'un vrai client
- Servir de documentation vivante : « voilà concrètement comment vous intégrez »
- Tester rapidement chaque morceau

---

## 8. La fiche pratique pour quelqu'un qui veut intégrer

Si demain quelqu'un nous demande « comment je m'intègre ? », voici ce qu'on lui envoie :

```
─────────────────────────────────────────────────────────────────
GUIDE D'INTÉGRATION RAPIDE

1. Allez sur http://wintemplate.com/developers
2. Remplissez le formulaire (nom + email)
3. SAUVEGARDEZ votre client_secret. Il ne sera affiché qu'UNE FOIS.

4. Depuis votre serveur, déclarez vos URL de retour :

   POST /developers/return-urls
   {
     "client_id":     "VOTRE_CLIENT_ID",
     "client_secret": "VOTRE_CLIENT_SECRET",
     "urls": ["https://votre-site.com/callback"]
   }

5. Quand votre utilisateur clique « ouvrir le builder »,
   demandez une session DEPUIS VOTRE BACKEND :

   POST /api/builder-sessions
   {
     "client_id":     "VOTRE_CLIENT_ID",
     "client_secret": "VOTRE_CLIENT_SECRET",
     "mode":          "new",  // ou "list"
     "return_url":    "https://votre-site.com/callback",
     "user_ref":      "id-interne-de-votre-user"
   }

   → Réponse : { "url": "https://wintemplate.com/s/xxx" }

6. Redirigez votre utilisateur vers cette URL.

7. À la fin, l'utilisateur revient sur votre callback :

   GET https://votre-site.com/callback?template_id=tpl_xxx

   → Vous avez l'ID, à vous de jouer.

8. Plus tard, pour récupérer le contenu du template :

   - D'abord récupérer un token M2M :

     POST /oauth/token
     { "client_id": "...", "client_secret": "..." }
     → { "access_token": "..." }

   - Puis appeler l'API :

     GET /templates/tpl_xxx
     Authorization: Bearer <access_token>
─────────────────────────────────────────────────────────────────
```

Voilà. C'est ça, tout le contrat public.

---

## 9. Petit lexique

- **Tenant** : un client (une organisation) chez WinTemplate. Tout est cloisonné par tenant.
- **API client** : une paire `client_id` + `client_secret` qui appartient à un tenant. Comme un « compte de service ».
- **Token M2M** : un JWT obtenu via `POST /oauth/token`. Utilisé par les *machines* (le serveur d'Outil X) pour appeler notre API directement.
- **Integration session** : un JWT obtenu via `POST /s/exchange`. Utilisé par un *navigateur*, ressemble à une session utilisateur mais limité à un tenant et à un flux d'édition.
- **Session token** : la chaîne aléatoire dans l'URL `/s/<token>`. Détruit dès qu'il est utilisé.
- **Return URL** : l'URL où Outil X veut que son utilisateur revienne après sauvegarde. Doit être dans la liste blanche.
- **Allowlist (liste blanche)** : la liste des URL de retour autorisées pour un tenant. La protection contre les attaques de redirection ouverte.

---

## 10. Ce qu'on n'a PAS fait, et pourquoi

Pour rester focalisé sur l'essentiel, on a **volontairement** mis de côté plusieurs choses. Ce sont des évolutions possibles plus tard, pas des oublis :

| Pas fait | Pourquoi |
|---|---|
| Sous-domaine personnalisé (ex: `builder.exemple.com`) | Nécessite un certificat TLS wildcard et de la config DNS chez Outil X. Le `/s/<token>` fait le même job sans aucune config. |
| Vérification d'email à l'inscription | Pour le MVP, l'inscription est ouverte. On ajoutera quand on verra de l'abus. |
| Captcha sur l'inscription | Pareil. |
| Permissions par utilisateur final | Tout est cloisonné par tenant uniquement. `user_ref` est noté mais pas utilisé pour les permissions. Plus simple à comprendre, moins de cas spéciaux. |
| Webhooks (notifications à Outil X) | Le `template_id` arrive dans le callback, ce qui suffit pour le MVP. Les webhooks viendront comme feature séparée. |
| Page de gestion des clés pour les tenants connectés | Si un tenant perd sa clé, il faut passer par le support (ou recréer). Une page `/dashboard/integrations` est prévue mais comme feature séparée. |

---

## 11. Résumé en 3 phrases

1. **Outil X demande à notre serveur une URL spéciale** en s'authentifiant avec sa clé secrète (qui ne quitte jamais son serveur).
2. **Cette URL est à usage unique, expire en 24h, et oblige Outil X à avoir déclaré l'URL de retour à l'avance.**
3. **Quand l'utilisateur sauvegarde dans le builder, il est automatiquement renvoyé chez Outil X** avec l'ID du template.

Et voilà — vous savez maintenant comment fonctionne l'intégration développeurs de WinTemplate.
