# Scénario de démonstration — Winaity Template Builder

> **Objectif :** dérouler une histoire cohérente qui montre toute la plateforme en ~12–15 min.
> **Fil rouge / persona :** *« Léa, responsable marketing chez une PME, doit lancer une campagne
> Black Friday par email — puis gérer son équipe et son abonnement. »*
>
> 💡 **Conseils** : prépare **2 comptes** avant la démo (un compte *free* neuf pour montrer les
> limites + upgrade, et ton compte *internal/pro* pour tout le reste). Aie une **affiche/poster**
> prête sur le bureau pour la conversion image→email. Répète une fois pour maîtriser le timing.

---

## Vue d'ensemble du parcours

| # | Étape | Fonctionnalité mise en avant | Durée |
|---|-------|------------------------------|-------|
| 0 | Site vitrine | Positionnement produit | 30 s |
| 1 | Inscription / Connexion | Multi-tenant, JWT | 1 min |
| 2 | Tableau de bord | Vue d'ensemble | 30 s |
| 3 | Éditeur email + drag-and-drop | Builder visuel | 1,5 min |
| 4 | **Génération IA par prompt** | ⭐ Différenciateur | 2 min |
| 5 | **Édition conversationnelle** | ⭐ IA agentique | 2 min |
| 6 | **Affiche → email (vision)** | ⭐⭐ Le "wow" | 2 min |
| 7 | Export HTML / PDF | Livrable concret | 30 s |
| 8 | Autres canaux (facture, contrat, SMS, RCS) | Multi-canal | 1 min |
| 9 | Galerie prédéfinie (rôle marketing) | Collaboration | 1 min |
| 10 | Équipe : inviter un utilisateur | Gestion d'équipe | 1 min |
| 11 | **Abonnement : passage à Pro (Stripe)** | Business model | 2 min |
| 12 | Intégrations / clés API + embed | Ouverture plateforme | 1 min |
| 13 | Super-admin : attribuer un plan | Administration | 30 s |

---

## Le scénario, étape par étape

### 0. Le site vitrine *(30 s — accroche)*
- **Tu fais :** ouvre la page d'accueil publique (`/`).
- **Tu dis :** « Winaity Template Builder, c'est un SaaS multi-entreprises pour créer des modèles
  de communication — emails, factures, contrats, SMS, RCS — assisté par une IA. »
- **À souligner :** le positionnement « Canva + copilote IA pour la communication d'entreprise ».

### 1. Inscription / Connexion *(1 min)*
- **Tu fais :** clique sur *S'inscrire*, crée un compte (ou connecte-toi). Montre brièvement la
  page de connexion.
- **Tu dis :** « Chaque entreprise est un *tenant* : toutes ses données sont isolées. »
- **À souligner :** **multi-tenancy** — isolation par `tenant_id`, authentification par **JWT**.

### 2. Le tableau de bord *(30 s)*
- **Tu fais :** montre la sidebar (Modèles, Favoris, Équipe, Paramètres).
- **Tu dis :** « Voici l'espace de travail de l'entreprise. »

### 3. L'éditeur email — glisser-déposer *(1,5 min)*
- **Tu fais :** *Nouveau modèle → Email*. Glisse **1–2 blocs** (titre, image, bouton),
  change une couleur, montre l'**aperçu en direct** et l'onglet **code MJML** (Monaco).
- **Tu dis :** « L'éditeur produit de vrais blocs éditables ; le rendu MJML est responsive. »
- **À souligner :** 11 types de blocs, aperçu live, export propre — **et surtout** que l'IA
  produit *exactement les mêmes blocs* (transition vers l'étape suivante).

### 4. ⭐ Génération par un simple prompt *(2 min)*
- **Tu fais :** ouvre l'**Assistant IA**, tape par ex. :
  > *« Crée un email Black Friday pour notre boutique NBA, ton premium, avec une offre -40% »*
- **Tu dis :** « En ~10 secondes, l'IA construit un email complet et sur-mesure : héro, carte
  d'offre, grille produits, pied de page — tout est éditable. »
- **À souligner :** génération **agentique** (l'IA appelle des outils qui créent des blocs, pas
  du HTML jetable) ; design cohérent (palette + contraste garantis).

### 5. ⭐ Édition conversationnelle *(2 min)*
- **Tu fais :** enchaîne 2–3 demandes en langage naturel :
  1. *« Passe tout l'email en thème sombre »*
  2. *« Change la première image »*
  3. Sélectionne un bloc dans le canvas, puis : *« mets ce titre en rouge »* (édition ciblée)
- **Tu dis :** « L'IA cible le bon élément, applique le changement, et confirme *honnêtement*
  seulement si ça a réellement changé. »
- **À souligner :** édition **ciblée par sélection**, confirmations **fiables**, thème/mise en page
  modifiables par la conversation.

### 6. ⭐⭐ Affiche → email (vision) — le moment "wow" *(2 min)*
- **Tu fais :** clique sur l'upload 🖼️, **charge une affiche marketing** (poster promo).
- **Tu dis :** « L'IA *lit* l'affiche par vision — texte exact, prix, offre, couleurs, ambiance —
  puis **reconstruit** un email éditable et sur-marque. Elle ne colle pas l'image : elle
  recompose la campagne. »
- **À souligner :** lecture OCR + offres/prix **verbatim**, reconstruction native, passe critique
  "directeur artistique" qui vérifie le résultat. **C'est ton meilleur argument de différenciation.**

### 7. Export HTML / PDF *(30 s)*
- **Tu fais :** exporte l'email en **HTML** (et montre le **PDF** pour facture/contrat).
- **Tu dis :** « Le livrable est prêt à l'emploi. »

### 8. Le multi-canal *(1 min)*
- **Tu fais :** crée rapidement un modèle **Facture** ou **Contrat** (aperçu PDF), puis montre
  l'éditeur **SMS** et **RCS** (aperçu téléphone avec carte + boutons).
- **Tu dis :** « La même plateforme couvre 5 canaux. »
- **À souligner :** **RCS** (messagerie riche) et la génération PDF des documents.

### 9. Galerie prédéfinie & rôle marketing *(1 min)*
- **Tu fais :** montre *Templates → Templates prédéfinis*, explique qu'un membre **marketing**
  peut curer la galerie de son entreprise.
- **Tu dis :** « Chaque entreprise construit sa propre bibliothèque de modèles de référence. »
- **À souligner :** **rôles** (admin / éditeur / marketing) + visibilité **par tenant**.

### 10. Gestion d'équipe : inviter un utilisateur *(1 min)*
- **Tu fais :** *Équipe → Inviter*, saisis un email + un rôle, montre le flux d'invitation.
- **Tu dis :** « L'admin invite des collaborateurs, chacun avec son rôle. »
- **À souligner :** collaboration multi-utilisateurs (fonction **Pro Organisation**).

### 11. ⭐ Abonnement : passage à Pro avec Stripe *(2 min)*
- **Tu fais :** avec le **compte free**, essaie une action bloquée (créer un 2ᵉ email, ou une
  interaction IA de trop) → la **modale d'upgrade** apparaît. Va sur **Tarifs → Pro**,
  paiement par carte de test **`4242 4242 4242 4242`** (checkout **intégré**, TVA 20 % affichée).
- **Tu dis :** « Le plan gratuit est limité ; le passage à Pro se fait par un paiement Stripe
  intégré, sans quitter le site, TVA française incluse. »
- **À souligner :** **plans + enforcement des quotas**, **Stripe Checkout intégré**, TVA 20 %,
  mensuel/annuel.

### 12. Intégrations / clés API + embed *(1 min)*
- **Tu fais :** *Paramètres → Intégrations*, génère une **clé API**. Explique (ou montre le
  harnais de démo) le flux d'**ouverture du builder depuis un outil externe** (CRM) puis retour.
- **Tu dis :** « Un CRM peut envoyer ses utilisateurs dans notre builder, sans double
  authentification, et récupérer le modèle créé. »
- **À souligner :** **ouverture de la plateforme** (API + embed), et l'endpoint **MCP** qui expose
  les 32 outils de construction à l'IA.

### 13. Super-admin : attribuer un plan *(30 s)*
- **Tu fais :** ouvre la page **super-admin**, change le plan d'un tenant (ex. → *internal*).
- **Tu dis :** « Côté administration, on gère les plans des entreprises. »

---

## Phrase de conclusion *(à dire à la fin)*
> « En résumé : une plateforme SaaS multi-tenant, multi-canal, avec une IA agentique qui génère
> de vrais blocs éditables — capable même de transformer une affiche en email — le tout en
> production, sur une architecture microservices, avec abonnements et intégrations. »

---

## Plan B — si le réseau / l'IA lâche pendant la démo
- **Aie des captures d'écran** (ou une courte vidéo) des étapes IA (4, 5, 6) : ce sont les plus
  impressionnantes mais les plus dépendantes du serveur vLLM.
- Prépare **un email déjà généré** enregistré dans les modèles, pour montrer le résultat sans
  refaire la génération live.
- Garde un **compte de test Stripe** déjà configuré (carte 4242…) pour éviter toute saisie hésitante.
- Si l'export PDF est lent, montre un PDF déjà exporté.

## Ordre de priorité si tu manques de temps
1. **Génération IA (4)** + **Affiche → email (6)** — l'essentiel du "wow".
2. Éditeur visuel (3) + édition conversationnelle (5).
3. Abonnement Stripe (11).
4. Le reste selon le temps.
