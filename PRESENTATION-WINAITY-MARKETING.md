# Winaity Template Builder — Présentation Projet

> Doc de brief pour Gamma — **10 slides**. Chaque `---` = une nouvelle page.
> 💡 Pour les visuels : soit tu laisses Gamma générer l'image à partir du texte `📸 Image :`, soit tu remplaces par une vraie capture d'écran du produit (glisser-déposer dans Gamma).

---

## Slide 1 — Winaity Template Builder

**« Canva rencontre un copilote IA » pour la communication d'entreprise.**

Une plateforme SaaS multi-entreprises pour créer, gérer et générer des modèles de communication professionnels — **emails, factures, contrats, SMS et messages RCS** — via un éditeur visuel glisser-déposer boosté par une **IA agentique**.

✅ **En production**, architecture microservices moderne, facturation Stripe intégrée.

📸 Image : capture de l'éditeur d'email Winaity avec un template coloré à l'écran + l'assistant IA ouvert sur le côté. (Ambiance produit SaaS, moderne, épuré.)

---

## Slide 2 — Le problème

- Les entreprises ont besoin de modèles **cohérents, à leur image, professionnels** sur plusieurs canaux (email, facture, contrat, SMS, RCS).
- Les construire est **lent** et demande des compétences **design + techniques**.
- Les outils existants sont soit **trop génériques** (mono-canal, pas de multi-entreprises), soit **trop techniques** (édition HTML/MJML brute).
- Les équipes marketing veulent juste **décrire** ce qu'elles veulent — ou **réutiliser un design existant** — et obtenir un résultat éditable instantanément.

📸 Image : illustration « avant / après » — à gauche un développeur frustré devant du code HTML, à droite une personne marketing détendue devant une belle interface visuelle.

---

## Slide 3 — Notre réponse

Un **éditeur visuel** + un **assistant IA** qui génèrent de **vrais blocs éditables** (pas du HTML jetable), le tout **isolé par entreprise** en toute sécurité.

- On **glisse-dépose** des blocs, ou on **écrit une consigne** à l'IA, ou on **importe une affiche**.
- Les modifications visuelles et les modifications IA sont **100 % interchangeables** (même modèle de données).
- Résultat : un email pro, à la marque, **en quelques minutes**.

📸 Image : mockup du canvas de blocs avec une main qui glisse un bloc « image » à sa place. Flèches de flux : Consigne → IA → Template éditable.

---

## Slide 4 — Multi-canal : 5 types de modèles

| Type | Canal | Ce qu'on peut faire |
|------|-------|---------------------|
| ✉️ **Email** | Email (MJML) | Éditeur glisser-déposer complet, aperçu live, export HTML/PDF |
| 🧾 **Facture** | Facture | Constructeur structuré, variables, génération PDF |
| 📄 **Contrat** | Contrat | Texte riche paginé, génération PDF |
| 💬 **SMS** | SMS | Texte simple avec variables `{{prénom}}` |
| 📱 **RCS** | Messagerie riche | Cartes, carrousels, boutons (répondre / ouvrir URL / appeler) + aperçu téléphone |

Modèles stockés **par entreprise**, avec variables de personnalisation, favoris, duplication et galerie de modèles prédéfinis.

📸 Image : 5 cartes/icônes alignées (email, facture, contrat, SMS, RCS), chacune avec un petit aperçu de rendu.

---

## Slide 5 — L'éditeur d'email visuel (le produit phare)

- **Glisser-déposer** sur un canvas de blocs.
- **11 types de blocs** : titre, texte, image, vidéo, bouton, séparateur, tableau, signature, réseaux sociaux, menu, liste à icônes.
- Colonnes (jusqu'à 4), largeurs par colonne, styles par section.
- **Aperçu email en direct** + **éditeur de code** (Monaco) pour les experts.
- Export **HTML responsive** et **PDF**.

📸 Image : capture réelle de l'éditeur — canvas au centre avec un email construit, panneau de blocs à gauche, panneau de style à droite.

---

## Slide 6 — L'assistant IA (le vrai différenciateur)

Trois façons de l'utiliser :

1. **Générer depuis une consigne** — *« Crée un email Black Friday pour notre boutique NBA »* → email complet et à la marque en ~10 secondes.
2. **Éditer en conversation** — *« passe-le en thème sombre »*, *« change la première image »*, *« ajoute une boîte de prix »* → l'IA vise le bon bloc et applique le changement.
3. **Édition ciblée par sélection** — je sélectionne un bloc, j'écris ma consigne, ça s'applique exactement là.

🎯 L'IA produit de **vrais blocs éditables**, pas du HTML figé — et ne confirme un succès que si le template a réellement changé (« confirmations honnêtes »).

📸 Image : capture du chat IA à côté du template, avec une consigne tapée et le résultat généré. Effet « magie » (petites étincelles / sparkles).

---

## Slide 7 — De l'affiche à l'email éditable (Image → Template)

On **importe une affiche marketing** → l'IA la **lit avec la vision** (texte exact, prix, offres, couleurs de marque, ambiance, mise en page) → puis la **reconstruit nativement** en email éditable et à la marque.

⚠️ Elle ne colle **pas** l'image : elle **recrée** la campagne en blocs éditables.
Une passe « **directeur artistique critique** » vérifie et élève le résultat.

Intelligence design intégrée : palette de couleurs automatique, **garantie de contraste** (texte toujours lisible), **5 systèmes de design** (éditorial / bold / minimal / luxe / corporate).

📸 Image : split-screen — à gauche une affiche promo, à droite le même contenu reconstruit en email éditable Winaity. Flèche « → » au milieu.

---

## Slide 8 — Une vraie plateforme SaaS

- 🏢 **Multi-entreprises (multi-tenant)** : toutes les données isolées par entreprise (`tenant_id`).
- 👥 **Collaboration & rôles** : admin, éditeur, **marketing** (gère la galerie de modèles de l'entreprise), clients API.
- 💳 **Abonnements Stripe** : Free, Pro (25€/mois), Pro Organisation (55€/mois) — paiement embarqué, mensuel ou annuel, **TVA 20 %** correcte.
- 🔒 **Limites par plan** : Free = email + 1 modèle + 1 interaction IA ; Pro = tous les canaux + IA illimitée ; Pro Org = équipe + accès API.
- 🛠️ **Super-admin** pour attribuer les plans, **API / intégrations** pour connecter des outils externes (CRM…).

📸 Image : capture du tableau de bord facturation / plans + petit schéma « une plateforme, plusieurs entreprises isolées ».

---

## Slide 9 — Sous le capot (rassurant, pas trop technique)

- **Frontend** : Next.js 16 + React 19, Tailwind, animations — une interface moderne et fluide.
- **Backend** : architecture **microservices** (authentification, modèles, passerelle API) — robuste et évolutif.
- **IA maison** : un serveur LLM **auto-hébergé** (vLLM / Gemma) — **les données restent chez nous**, pas de dépendance à une API tierce.
- **Déploiement** : **en production** via Cloudflare (sécurisé, HTTPS), stacks Docker séparées dev / prod.
- **MCP** : les 32 outils de l'éditeur sont exposés à l'IA de façon standardisée — une architecture « agentique » moderne.

📸 Image : schéma d'architecture simplifié (Navigateur → Passerelle API → services Auth / Templates → Bases + IA). Style propre, peu de texte, icônes.

---

## Slide 10 — Ce qui nous démarque + prochaines étapes

**Points forts à retenir**
1. **Multi-canal** : email, facture, contrat, SMS, RCS sur une seule plateforme.
2. **IA agentique** qui produit de vrais blocs éditables.
3. **Affiche → email** grâce à la vision.
4. **Intelligence design** intégrée (palettes, contraste, 5 styles).
5. **SaaS de production** : multi-entreprises, rôles, Stripe + TVA, super-admin.
6. **IA privée auto-hébergée** — souveraineté des données.

**Prochaines étapes / pistes**
- Site marketing public déjà en ligne → à alimenter (contenu, SEO, démos).
- Flux d'intégration/embed pour partenaires (CRM).
- Temps réel (curseurs live) prévu.

📸 Image : visuel de clôture inspirant — logo Winaity + tagline « La communication d'entreprise, propulsée par l'IA ». Fond dégradé de marque.

---

### 🎨 Conseils rapides pour Gamma
- Colle ce fichier dans Gamma → mode **« Coller du texte »** → il découpe automatiquement en 10 slides sur les `---`.
- Pour chaque `📸 Image :`, soit tu laisses l'IA de Gamma générer le visuel, soit tu déposes une **vraie capture** du produit (plus impactant pour une responsable marketing).
- Garde une **palette de marque cohérente** et une **police unique** pour un rendu pro.
