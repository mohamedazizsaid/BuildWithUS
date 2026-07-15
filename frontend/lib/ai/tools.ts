import { tool } from 'ai';
import { z } from 'zod';
import { TemplateBuilder } from './block-factory';

/**
 * The tool set the model uses to assemble an email. Every tool mutates the
 * request-scoped `builder`, whose methods own the design system (palette, tone,
 * type scale, spacing, contrast). The model supplies content + intent; the
 * builder guarantees it renders beautifully and readably. Zod validates every
 * input, so the model can never produce a block the editor can't render.
 */

const ALIGN = z.enum(['left', 'center', 'right']);
const TONE = z.enum(['default', 'surface', 'dark', 'accent']);
const LAYOUT = z.enum([
  '100',
  '50-50',
  '33-33-33',
  '25-25-25-25',
  '33-67',
  '67-33',
]);

const ok = (added: string) => ({ ok: true, added });

export function createBlockTools(builder: TemplateBuilder) {
  return {
    setTheme: tool({
      description:
        "Définit la charte visuelle de l'email. À appeler EN PREMIER. Choisis une couleur d'accent qui CORRESPOND au sujet/à la marque (ex NBA → bleu #1d428a ou rouge ; forêt/nature → vert #2e7d32 ; luxe/tech → sombre). Fournis aussi le mood ('light' ou 'dark'), et un title + previewText (texte d'aperçu affiché dans la boîte de réception). Les couleurs de texte lisibles sont calculées automatiquement — ne les choisis pas toi-même.",
      inputSchema: z.object({
        accentColor: z.string().optional().describe("Couleur d'accent de la marque, ex #1d428a"),
        mood: z.enum(['light', 'dark']).optional().describe("Ambiance ('dark' pour un rendu premium/sombre)"),
        backgroundColor: z.string().optional().describe('Couleur de fond du corps si spécifique'),
        fontFamily: z.string().optional().describe('Police, ex "Georgia, serif"'),
        title: z.string().optional().describe("Titre de l'email (onglet/objet technique)"),
        previewText: z.string().optional().describe("Texte d'aperçu affiché dans la boîte de réception"),
      }),
      execute: async (p) => {
        builder.setTheme(p);
        return ok('theme');
      },
    }),

    startSection: tool({
      description:
        "Démarre une nouvelle section (rangée). Utilise `tone` pour la lisibilité : 'default' (fond clair), 'surface' (légèrement teinté), 'dark' (bande sombre, ex en-tête/pied de page), 'accent' (fond couleur de marque). Les blocs s'empilent automatiquement en pleine largeur ; n'utilise un `layout` multi-colonnes QUE pour des éléments parallèles de même nature (ex 2 produits côte à côte).",
      inputSchema: z.object({
        layout: LAYOUT.default('100').describe('Disposition des colonnes'),
        tone: TONE.optional().describe('Tonalité de fond — gère la lisibilité du texte'),
        backgroundColor: z.string().optional().describe('Fond personnalisé (sinon déduit du tone)'),
      }),
      execute: async ({ layout, tone, backgroundColor }) => {
        builder.startSection(layout, { tone, backgroundColor });
        return ok('section');
      },
    }),

    startCard: tool({
      description:
        "Démarre une CARTE encadrée (bordure + fond légèrement contrasté + coins arrondis), pleine largeur. Idéale pour mettre en avant une offre, un prix, ou un encadré clé. Les blocs ajoutés ensuite (addHeading, addText…) se placent DANS la carte, jusqu'à la prochaine section. Ex : titre 'FORFAIT', gros prix, mention.",
      inputSchema: z.object({
        borderColor: z.string().optional().describe("Couleur de bordure (sinon l'accent)"),
        backgroundColor: z.string().optional().describe('Fond de la carte (sinon déduit)'),
      }),
      execute: async (p) => {
        builder.startCard(p);
        return ok('card');
      },
    }),

    addPricingRow: tool({
      description:
        "Ajoute une rangée de FORFAITS/tarifs présentés CÔTE À CÔTE (1 à 3 forfaits). C'est le SEUL bon outil pour plusieurs forfaits/offres : la mise en page côte à côte (colonnes égales, une carte par forfait avec nom → prix → caractéristiques → bouton) est gérée automatiquement — n'assemble PAS les forfaits à la main avec startSection/nextColumn/addButton. Reprends les prix VERBATIM. Un seul forfait → une carte pleine largeur.",
      inputSchema: z.object({
        plans: z
          .array(
            z.object({
              name: z.string().describe("Nom du forfait, ex '100 Go', 'Pro'"),
              price: z.string().optional().describe("Prix EXACT/verbatim, ex '12,90 €/mois'"),
              features: z.array(z.string()).optional().describe('Caractéristiques du forfait'),
              ctaText: z.string().optional().describe("Libellé du bouton, ex 'Choisir'"),
            }),
          )
          .min(1)
          .max(3)
          .describe('Les forfaits, dans l\'ordre. 1 = carte pleine largeur ; 2-3 = côte à côte.'),
      }),
      execute: async ({ plans }) => {
        builder.addPricingRow(plans);
        return ok('pricing-row');
      },
    }),

    nextColumn: tool({
      description:
        'Passe à la colonne suivante d\'une section multi-colonnes. À utiliser une fois la première colonne remplie. NE mets PAS de bouton, séparateur, liste ou pied de page dans une section multi-colonnes — démarre une nouvelle section pleine largeur pour ça.',
      inputSchema: z.object({}),
      execute: async () => {
        builder.nextColumn();
        return ok('nextColumn');
      },
    }),

    addEyebrow: tool({
      description:
        "Ajoute un intitulé (petit texte court en majuscules, espacé, couleur d'accent) au-dessus d'un titre. Touche éditoriale : ex « NOUVEAUTÉ », « OFFRE LIMITÉE », « À LA UNE ».",
      inputSchema: z.object({ text: z.string(), align: ALIGN.optional() }),
      execute: async (p) => {
        builder.addEyebrow(p);
        return ok('eyebrow');
      },
    }),

    addHeading: tool({
      description: 'Ajoute un titre. h1 = grand titre principal (un seul par email), h2 = titre de section, h3 = sous-titre.',
      inputSchema: z.object({
        text: z.string(),
        level: z.enum(['h1', 'h2', 'h3']).optional(),
        align: ALIGN.optional(),
      }),
      execute: async (p) => {
        builder.addHeading(p);
        return ok('heading');
      },
    }),

    addText: tool({
      description:
        "Ajoute un paragraphe. `role`: 'lede' (chapô d'introduction en plus grand), 'body' (texte courant), 'caption' (légende discrète). Le texte peut contenir du HTML simple : <strong>, <em>, <br>, <a href=\"...\">.",
      inputSchema: z.object({
        text: z.string(),
        role: z.enum(['lede', 'body', 'caption']).optional(),
        align: ALIGN.optional(),
      }),
      execute: async (p) => {
        builder.addText(p);
        return ok('text');
      },
    }),

    addButton: tool({
      description: "Ajoute un bouton d'action (call-to-action). La couleur reprend l'accent par défaut. `pill: true` pour un bouton aux coins très arrondis (style moderne).",
      inputSchema: z.object({
        text: z.string(),
        url: z.string(),
        align: ALIGN.optional(),
        pill: z.boolean().optional(),
      }),
      execute: async (p) => {
        builder.addButton(p);
        return ok('button');
      },
    }),

    addColorBar: tool({
      description:
        "Ajoute une fine barre d'accent multicolore (2 à 8 couleurs de la marque) — touche graphique premium, idéale juste sous la bannière d'en-tête. Donne les couleurs en hex, dans l'ordre.",
      inputSchema: z.object({
        colors: z.array(z.string()).min(2).max(8).describe('Couleurs hex, ex ["#1d428a","#c8102e","#ffffff"]'),
      }),
      execute: async ({ colors }) => {
        builder.addColorBar(colors);
        return ok('colorbar');
      },
    }),

    addSpacer: tool({
      description:
        "Ajoute un espace vertical vide (respiration) entre deux éléments. Utilise-le avec parcimonie pour aérer une mise en page trop dense.",
      inputSchema: z.object({
        height: z.string().optional().describe("Hauteur de l'espace, ex '24px' ou '40px'"),
      }),
      execute: async ({ height }) => {
        builder.addSpacer(height);
        return ok('spacer');
      },
    }),

    startHero: tool({
      description:
        "Démarre une bannière HÉRO plein cadre : une photo de fond avec le texte PAR-DESSUS (et non au-dessus). Idéale comme en-tête d'accroche. Fournis `query` (mots-clés ANGLAIS pour la photo de fond) OU `src` (URL http). Les blocs ajoutés ensuite (addEyebrow, addHeading h1, addText, addButton) se posent sur la photo en texte clair lisible.",
      inputSchema: z.object({
        query: z.string().optional().describe("Mots-clés de la photo de fond, ex 'dark basketball arena night'"),
        src: z.string().optional().describe('URL http directe de la photo (si connue)'),
      }),
      execute: async (p) => {
        builder.startHero(p);
        return ok('hero');
      },
    }),

    addImage: tool({
      description:
        "Ajoute une image. Fournis `query` (mots-clés en ANGLAIS) pour qu'une vraie photo soit recherchée automatiquement, OU `src` si tu as déjà une URL.",
      inputSchema: z.object({
        query: z.string().optional().describe("Mots-clés de recherche, ex 'nba basketball jersey'"),
        src: z.string().optional().describe('URL directe (http...) si déjà connue'),
        alt: z.string().optional(),
        width: z.string().optional().describe('ex 600px ou 100%'),
        align: ALIGN.optional(),
        href: z.string().optional(),
        borderRadius: z.string().optional(),
      }),
      execute: async (p) => {
        const alt = p.alt || p.query || 'Image';
        builder.addImage({ ...p, alt });
        return ok('image');
      },
    }),

    addDivider: tool({
      description: 'Ajoute un séparateur horizontal discret.',
      inputSchema: z.object({
        color: z.string().optional(),
        thickness: z.string().optional().describe('ex 1px'),
      }),
      execute: async (p) => {
        builder.addDivider(p);
        return ok('divider');
      },
    }),

    addTable: tool({
      description: 'Ajoute un tableau de données (ex lignes de facture, comparatif).',
      inputSchema: z.object({
        headers: z.array(z.string()).describe('En-têtes de colonnes'),
        rows: z.array(z.array(z.string())).describe('Lignes, chaque ligne = tableau de cellules'),
      }),
      execute: async (p) => {
        builder.addTable(p);
        return ok('table');
      },
    }),

    addIconList: tool({
      description:
        'Ajoute une liste à puces avec icônes (avantages, points clés). Chaque élément a une icône (emoji/symbole) et un texte.',
      inputSchema: z.object({
        items: z
          .array(
            z.object({
              icon: z.string().optional().describe('emoji ou symbole, ex ✓ ★ •'),
              text: z.string(),
              color: z.string().optional(),
            }),
          )
          .min(1),
        align: ALIGN.optional(),
        iconColor: z.string().optional(),
      }),
      execute: async (p) => {
        builder.addIconList(p);
        return ok('icon-list');
      },
    }),

    addSocial: tool({
      description: 'Ajoute des icônes de réseaux sociaux. Plateformes : facebook, twitter, instagram, linkedin, youtube, tiktok.',
      inputSchema: z.object({
        links: z
          .array(z.object({ platform: z.string(), url: z.string() }))
          .min(1),
        align: ALIGN.optional(),
      }),
      execute: async (p) => {
        builder.addSocial(p);
        return ok('social');
      },
    }),

    addMenu: tool({
      description: 'Ajoute un menu de navigation (liens horizontaux ou verticaux).',
      inputSchema: z.object({
        items: z.array(z.object({ label: z.string(), url: z.string() })).min(1),
        layout: z.enum(['horizontal', 'vertical']).optional(),
        align: ALIGN.optional(),
      }),
      execute: async (p) => {
        builder.addMenu(p);
        return ok('menu');
      },
    }),

    addSignature: tool({
      description: 'Ajoute une signature (nom + fonction).',
      inputSchema: z.object({ name: z.string(), title: z.string().optional() }),
      execute: async (p) => {
        builder.addSignature(p);
        return ok('signature');
      },
    }),

    addVideo: tool({
      description: 'Ajoute une vidéo (URL YouTube ou fichier vidéo).',
      inputSchema: z.object({
        url: z.string(),
        width: z.string().optional(),
        align: ALIGN.optional(),
      }),
      execute: async (p) => {
        builder.addVideo(p);
        return ok('video');
      },
    }),
  };
}

export type BlockTools = ReturnType<typeof createBlockTools>;

/**
 * Edit-only tools: target existing blocks by id. The builder is pre-loaded with
 * the current email, so the model applies only the requested change.
 */
export function createEditTools(builder: TemplateBuilder) {
  return {
    updateBlock: tool({
      description:
        "Modifie un bloc existant ciblé par son blockId (vu dans l'email actuel). Ne change que les propriétés fournies.",
      inputSchema: z.object({
        blockId: z.string(),
        content: z.record(z.string(), z.string()).optional().describe('Champs de contenu à changer'),
        styles: z.record(z.string(), z.string()).optional().describe('Styles à changer'),
      }),
      execute: async ({ blockId, content, styles }) => {
        const done = builder.updateBlock(blockId, { content, styles });
        return done ? ok('update') : { ok: false, error: 'blockId introuvable' };
      },
    }),

    removeBlock: tool({
      description: 'Supprime un bloc existant ciblé par son blockId.',
      inputSchema: z.object({ blockId: z.string() }),
      execute: async ({ blockId }) => {
        const done = builder.removeBlock(blockId);
        return done ? ok('remove') : { ok: false, error: 'blockId introuvable' };
      },
    }),

    setImage: tool({
      description:
        "Remplace la PHOTO d'un bloc image existant (ne touche à rien d'autre). Cible le bloc de type 'image' par son blockId, et fournis `query` (mots-clés ANGLAIS, ex 'gaming setup neon') pour chercher une nouvelle photo, OU `src` (URL http directe). C'est le SEUL bon outil pour « changer l'image ».",
      inputSchema: z.object({
        blockId: z.string(),
        query: z.string().optional().describe("Mots-clés de recherche en anglais"),
        src: z.string().optional().describe('URL http directe (si connue)'),
      }),
      execute: async ({ blockId, query, src }) => {
        const done = builder.setImage(blockId, { query, src });
        return done ? ok('image') : { ok: false, error: "bloc image introuvable (vérifie le blockId et que c'est bien une image)" };
      },
    }),

    updateSection: tool({
      description:
        "Modifie le STYLE d'une SECTION entière (rangée), ciblée par sectionId : `padding` = espacement vertical de la section (ex '48px 0'), `backgroundColor` = fond de section. Pour « ajoute de l'espacement / du padding à la section ».",
      inputSchema: z.object({
        sectionId: z.string(),
        padding: z.string().optional().describe("ex '48px 0' (haut/bas) ou '40px 24px'"),
        backgroundColor: z.string().optional(),
      }),
      execute: async ({ sectionId, padding, backgroundColor }) => {
        const done = builder.updateSection(sectionId, { padding, backgroundColor });
        return done ? ok('section-style') : { ok: false, error: 'sectionId introuvable' };
      },
    }),

    updateCard: tool({
      description:
        "Modifie la BOÎTE/carte d'une section (la colonne encadrée), ciblée par sectionId : `padding` = espacement INTÉRIEUR de la boîte autour du contenu (ex '32px'), `backgroundColor`, `borderColor`, `borderRadius`. Pour « du padding à l'intérieur du petit box ».",
      inputSchema: z.object({
        sectionId: z.string(),
        padding: z.string().optional().describe("padding intérieur, ex '32px'"),
        backgroundColor: z.string().optional(),
        borderColor: z.string().optional(),
        borderRadius: z.string().optional(),
      }),
      execute: async ({ sectionId, padding, backgroundColor, borderColor, borderRadius }) => {
        const done = builder.updateCard(sectionId, { padding, backgroundColor, borderColor, borderRadius });
        return done ? ok('card-style') : { ok: false, error: 'sectionId introuvable' };
      },
    }),

    removeSection: tool({
      description:
        "Supprime une SECTION entière par son sectionId — utile pour enlever une section en doublon ou superflue d'un coup (plutôt que bloc par bloc).",
      inputSchema: z.object({ sectionId: z.string() }),
      execute: async ({ sectionId }) => {
        const done = builder.removeSection(sectionId);
        return done ? ok('remove-section') : { ok: false, error: 'sectionId introuvable' };
      },
    }),

    moveBlock: tool({
      description:
        'Réordonne : déplace un bloc AVANT ou APRÈS un autre bloc. `blockId` = bloc à déplacer, `targetId` = bloc de référence, `position` = before|after. Pour « déplace X avant/après Y ».',
      inputSchema: z.object({
        blockId: z.string(),
        targetId: z.string(),
        position: z.enum(['before', 'after']),
      }),
      execute: async ({ blockId, targetId, position }) => {
        const done = builder.moveBlock(blockId, targetId, position);
        return done ? ok('move') : { ok: false, error: 'bloc(s) introuvable(s)' };
      },
    }),

    changeLayout: tool({
      description:
        "Change la DISPOSITION EN COLONNES d'une section existante, ciblée par sectionId — les blocs existants sont redistribués dans les nouvelles colonnes (aucun contenu perdu). `layout` : '100' (pleine largeur, 1 colonne), '50-50' (2 colonnes), '33-33-33' (3), '25-25-25-25' (4), '33-67', '67-33'. C'est le SEUL bon outil pour « mets cette section en 2 colonnes / en 50-50 / sur une seule colonne » ou pour réduire le nombre de colonnes après avoir supprimé un élément. N'utilise PAS removeBlock pour ça.",
      inputSchema: z.object({
        sectionId: z.string(),
        layout: LAYOUT,
      }),
      execute: async ({ sectionId, layout }) => {
        const done = builder.changeLayout(sectionId, layout);
        return done ? ok('layout') : { ok: false, error: 'sectionId introuvable ou disposition déjà en place' };
      },
    }),

    moveSection: tool({
      description:
        'Réordonne une SECTION entière avant/après une autre. `sectionId` = section à déplacer, `targetSectionId` = section de référence, `position` = before|after. Utilise les sectionId de l\'email actuel. Pour « déplace toute la partie X avant/après Y ».',
      inputSchema: z.object({
        sectionId: z.string(),
        targetSectionId: z.string(),
        position: z.enum(['before', 'after']),
      }),
      execute: async ({ sectionId, targetSectionId, position }) => {
        const done = builder.moveSection(sectionId, targetSectionId, position);
        return done ? ok('move-section') : { ok: false, error: 'section(s) introuvable(s)' };
      },
    }),

    insertSectionAt: tool({
      description:
        "Positionne la PROCHAINE nouvelle section AVANT ou APRÈS une section existante (au lieu de l'ajouter à la fin). Appelle CET outil EN PREMIER avec `targetSectionId` (section de référence) + `position` (before|after), PUIS appelle startSection/startCard/startHero/addColorBar et ses blocs : ils se placeront au bon endroit. Pour « ajoute une section ENTRE X et Y » ou « insère … avant Z » en un seul geste.",
      inputSchema: z.object({
        targetSectionId: z.string(),
        position: z.enum(['before', 'after']),
      }),
      execute: async ({ targetSectionId, position }) => {
        const done = builder.setInsertAnchor(targetSectionId, position);
        return done ? ok('insert-anchor') : { ok: false, error: 'sectionId introuvable' };
      },
    }),
  };
}
