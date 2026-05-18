import { Row, RowLayout, BlockData, BlockType, DEFAULT_BLOCK_CONTENT } from './editor-types';
import { v4 as uuid } from 'uuid';

const P = (id: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=800`;

const IMGS = {
  business: [P(23496880), P(7793118),  P(36766707), P(7433828),  P(7109288),  P(34823909)],
  people:   [P(15862623), P(13418642), P(6279104),  P(30968491), P(9630181),  P(37028207)],
  shopping: [P(6207749),  P(1267310),  P(3294472),  P(6567204),  P(13573923), P(17710109)],
  team:     [P(5466283),  P(8067773),  P(23496866), P(3184301),  P(20719271), P(35466549)],
  abstract: [P(247671),   P(7135020),  P(17605562), P(7256104),  P(5625008),  P(7828666)],
  tech:     [P(1181318),  P(19226354), P(4389462),  P(8033087),  P(4976712),  P(34803988)],
  food:     [P(37048263), P(6089623),  P(9315),     P(36984979), P(5951160),  P(1484516)],
  travel:   [P(34432816), P(28841420), P(30516943), P(36521427), P(16705978), P(4881125)],
};

// ─── Block / Row helpers ────────────────────────────────────────────────────
function b(type: string, content?: Record<string, string>, styles?: Record<string, string>): BlockData {
  const defs = DEFAULT_BLOCK_CONTENT[type as BlockType];
  return {
    id: uuid(),
    type: type as BlockType,
    content: { ...(defs?.content || {}), ...(content || {}) } as Record<string, string | string[] | string[][]>,
    styles: { ...(defs?.styles || {}), ...(styles || {}) },
  };
}

function bTable(headers: string[], rows: string[][], styles?: Record<string, string>): BlockData {
  return {
    id: uuid(),
    type: 'table',
    content: { headers, rows } as Record<string, string | string[] | string[][]>,
    styles: { ...DEFAULT_BLOCK_CONTENT.table.styles, ...(styles || {}) },
  };
}

function bSocial(links: string[][], styles?: Record<string, string>): BlockData {
  return {
    id: uuid(),
    type: 'social',
    content: { links, align: 'center' } as Record<string, string | string[] | string[][]>,
    styles: { ...DEFAULT_BLOCK_CONTENT.social.styles, ...(styles || {}) },
  };
}

function row(layout: RowLayout, cols: { width: string; blocks: BlockData[] }[], styles?: Record<string, string>): Row {
  return {
    id: uuid(),
    layout,
    columns: cols.map(c => ({ id: uuid(), width: c.width, blocks: c.blocks })),
    styles: { backgroundColor: 'transparent', padding: '10px 0', ...styles },
  };
}

// ─── Common section helpers ─────────────────────────────────────────────────
function preheader(text: string): Row {
  return row('100', [{ width: '100%', blocks: [
    b('text', { text }, { textAlign: 'center', fontSize: '11px', color: '#94a3b8', padding: '8px 10px' }),
  ]}], { backgroundColor: '#f1f5f9', padding: '0' });
}

function logoHeader(brand: string, accent: string): Row {
  return row('100', [{ width: '100%', blocks: [
    b('heading', { text: brand }, { textAlign: 'center', color: '#ffffff', fontSize: '22px', fontWeight: 'bold', padding: '22px 10px', letterSpacing: '2px' }),
  ]}], { backgroundColor: accent, padding: '0' });
}

function footerBlock(brand: string, accent: string): Row[] {
  return [
    row('100', [{ width: '100%', blocks: [b('divider', undefined, { borderColor: '#e2e8f0', padding: '0' })] }]),
    row('100', [{ width: '100%', blocks: [
      b('heading', { text: brand }, { textAlign: 'center', color: accent, fontSize: '14px', fontWeight: 'bold', padding: '20px 10px 5px', letterSpacing: '1px' }),
      bSocial([['facebook', '#'], ['twitter', '#'], ['instagram', '#'], ['linkedin', '#']], { padding: '5px 10px 10px', iconSize: '32px' }),
      b('text', { text: '© 2026 Votre Marque. Tous droits réservés.' }, { textAlign: 'center', fontSize: '11px', color: '#94a3b8', padding: '5px 10px' }),
      b('text', { text: 'Vous recevez cet email parce que vous êtes inscrit à notre newsletter.\nSe désinscrire · Préférences · Voir dans le navigateur' }, { textAlign: 'center', fontSize: '10px', color: '#cbd5e1', padding: '5px 10px 20px', lineHeight: '1.6' }),
    ]}], { backgroundColor: '#f8fafc' }),
  ];
}

// ─── Public types ───────────────────────────────────────────────────────────
export type PredefinedCategory = { id: string; label: string };

export type PredefinedTemplate = {
  id: string;
  name: string;
  description: string;
  category: string;
  subject: string;
  rows: () => Row[];
};

export const PREDEFINED_CATEGORIES: PredefinedCategory[] = [
  { id: 'all',           label: 'Tous' },
  { id: 'marketing',     label: 'Marketing & Newsletter' },
  { id: 'transactionnel', label: 'Transactionnel' },
  { id: 'ecommerce',     label: 'E-commerce' },
  { id: 'evenement',     label: 'Événements' },
  { id: 'reengagement',  label: 'Re-engagement' },
  { id: 'b2b',           label: 'B2B' },
];

export const CATEGORY_STYLES: Record<string, { bg: string; text: string; accent: string }> = {
  marketing:      { bg: '#eff6ff', text: '#1d4ed8', accent: '#2563eb' },
  transactionnel: { bg: '#f0fdf4', text: '#15803d', accent: '#16a34a' },
  ecommerce:      { bg: '#f5f3ff', text: '#6d28d9', accent: '#7c3aed' },
  evenement:      { bg: '#fff7ed', text: '#c2410c', accent: '#ea580c' },
  reengagement:   { bg: '#fdf2f8', text: '#be185d', accent: '#db2777' },
  b2b:            { bg: '#f8fafc', text: '#334155', accent: '#475569' },
};

// ════════════════════════════════════════════════════════════════════════════
// PREDEFINED TEMPLATES
// ════════════════════════════════════════════════════════════════════════════
export const PREDEFINED_TEMPLATES: PredefinedTemplate[] = [

  // ── MARKETING & NEWSLETTER ─────────────────────────────────────────────────
  {
    id: 'newsletter-classique',
    name: 'Newsletter classique',
    description: 'En-tête + 3 articles + édito + footer social',
    category: 'marketing',
    subject: '📰 La Newsletter — votre dose hebdo d\'inspiration',
    rows: () => [
      preheader("L'édition de cette semaine — temps de lecture : 4 minutes"),
      logoHeader('VOTRE MARQUE', '#0f172a'),
      row('100', [{ width: '100%', blocks: [
        b('text', { text: '— ÉDITION HEBDOMADAIRE —' }, { textAlign: 'center', fontSize: '11px', color: '#94a3b8', fontWeight: 'bold', padding: '20px 10px 5px', letterSpacing: '3px' }),
        b('heading', { text: 'Bienvenue dans votre semaine' }, { textAlign: 'center', fontSize: '28px', fontWeight: 'bold', padding: '5px 30px 10px' }),
        b('text', { text: 'Découvrez nos sélections, actualités et coups de cœur de la semaine.' }, { textAlign: 'center', fontSize: '15px', color: '#64748b', padding: '0 30px 20px' }),
      ]}]),
      row('100', [{ width: '100%', blocks: [b('image', { src: IMGS.business[0], alt: 'À la une' }, { width: '100%' })] }]),
      row('100', [{ width: '100%', blocks: [
        b('text', { text: 'À LA UNE' }, { fontSize: '11px', color: '#2563eb', fontWeight: 'bold', padding: '20px 30px 5px', letterSpacing: '2px' }),
        b('heading', { text: 'Le sujet incontournable de la semaine' }, { fontSize: '22px', fontWeight: 'bold', padding: '0 30px 8px' }),
        b('text', { text: 'Cette semaine, nous explorons un sujet qui mérite toute votre attention. Plongée approfondie, analyse et points de vue d\'experts pour vous aider à mieux comprendre les enjeux actuels.' }, { fontSize: '14px', color: '#475569', padding: '0 30px 15px', lineHeight: '1.7' }),
        b('button', { text: "Lire l'article →", href: '#' }, { textAlign: 'left', padding: '0 30px 25px' }),
      ]}]),
      row('100', [{ width: '100%', blocks: [b('divider', undefined, { borderColor: '#e2e8f0', padding: '0 30px' })] }]),
      row('100', [{ width: '100%', blocks: [
        b('text', { text: 'NOS SÉLECTIONS' }, { textAlign: 'center', fontSize: '11px', color: '#2563eb', fontWeight: 'bold', padding: '20px 10px 5px', letterSpacing: '2px' }),
        b('heading', { text: 'À ne pas manquer' }, { textAlign: 'center', fontSize: '22px', fontWeight: 'bold', padding: '0 10px 15px' }),
      ]}]),
      row('50-50', [
        { width: '50%', blocks: [
          b('image',   { src: IMGS.people[0], alt: 'Article 1' }, { width: '100%', borderRadius: '8px' }),
          b('text',    { text: 'CATÉGORIE' }, { fontSize: '10px', color: '#94a3b8', fontWeight: 'bold', padding: '12px 15px 0', letterSpacing: '1px' }),
          b('heading', { text: 'Le titre du premier article' }, { fontSize: '15px', fontWeight: 'bold', padding: '5px 15px' }),
          b('text',    { text: 'Un aperçu engageant qui donne envie de cliquer pour en savoir plus.' }, { fontSize: '13px', color: '#64748b', padding: '0 15px 12px' }),
          b('button',  { text: 'Lire →', href: '#' }, { textAlign: 'left', padding: '0 15px 15px', backgroundColor: '#ffffff', color: '#2563eb', borderSize: '1px', borderColor: '#2563eb' }),
        ]},
        { width: '50%', blocks: [
          b('image',   { src: IMGS.people[1], alt: 'Article 2' }, { width: '100%', borderRadius: '8px' }),
          b('text',    { text: 'CATÉGORIE' }, { fontSize: '10px', color: '#94a3b8', fontWeight: 'bold', padding: '12px 15px 0', letterSpacing: '1px' }),
          b('heading', { text: 'Le titre du deuxième article' }, { fontSize: '15px', fontWeight: 'bold', padding: '5px 15px' }),
          b('text',    { text: 'Un aperçu engageant qui donne envie de cliquer pour en savoir plus.' }, { fontSize: '13px', color: '#64748b', padding: '0 15px 12px' }),
          b('button',  { text: 'Lire →', href: '#' }, { textAlign: 'left', padding: '0 15px 15px', backgroundColor: '#ffffff', color: '#2563eb', borderSize: '1px', borderColor: '#2563eb' }),
        ]},
      ]),
      ...footerBlock('VOTRE MARQUE', '#0f172a'),
    ],
  },

  {
    id: 'annonce-produit',
    name: 'Annonce produit',
    description: 'Lancement avec hero, 3 fonctionnalités + témoignage',
    category: 'marketing',
    subject: '🚀 Découvrez notre nouveauté — disponible maintenant',
    rows: () => [
      preheader('Le moment que vous attendiez est enfin arrivé.'),
      logoHeader('VOTRE MARQUE', '#0f172a'),
      row('100', [{ width: '100%', blocks: [
        b('text', { text: 'NOUVEAU · DISPONIBLE MAINTENANT' }, { textAlign: 'center', fontSize: '11px', color: '#dc2626', fontWeight: 'bold', padding: '25px 10px 8px', letterSpacing: '2px' }),
        b('heading', { text: 'Voici notre dernière innovation' }, { textAlign: 'center', fontSize: '32px', fontWeight: 'bold', padding: '5px 30px 10px', lineHeight: '1.2' }),
        b('text', { text: 'Conçu pour transformer votre quotidien. Pensé jusque dans les moindres détails.' }, { textAlign: 'center', fontSize: '15px', color: '#64748b', padding: '0 30px 25px' }),
      ]}]),
      row('100', [{ width: '100%', blocks: [b('image', { src: IMGS.tech[0], alt: 'Produit' }, { width: '100%' })] }]),
      row('100', [{ width: '100%', blocks: [
        b('button', { text: 'Acheter maintenant', href: '#' }, { textAlign: 'center', padding: '25px 10px 5px' }),
        b('text',   { text: 'Livraison gratuite · Retours sous 30 jours' }, { textAlign: 'center', fontSize: '12px', color: '#94a3b8', padding: '0 10px 25px' }),
      ]}]),
      row('100', [{ width: '100%', blocks: [
        b('text', { text: 'CE QUI LE REND UNIQUE' }, { textAlign: 'center', fontSize: '11px', color: '#2563eb', fontWeight: 'bold', padding: '20px 10px 5px', letterSpacing: '2px' }),
        b('heading', { text: 'Trois caractéristiques qui changent tout' }, { textAlign: 'center', fontSize: '22px', fontWeight: 'bold', padding: '0 30px 25px' }),
      ]}], { backgroundColor: '#f8fafc' }),
      row('33-33-33', [
        { width: '33.33%', blocks: [
          b('heading', { text: '⚡' }, { textAlign: 'center', fontSize: '36px', padding: '0 10px 0' }),
          b('heading', { text: 'Performance' }, { textAlign: 'center', fontSize: '15px', fontWeight: 'bold', padding: '5px 10px' }),
          b('text',    { text: 'Une rapidité d\'exécution inégalée pour des résultats immédiats.' }, { textAlign: 'center', fontSize: '13px', color: '#64748b', padding: '0 15px 25px' }),
        ]},
        { width: '33.33%', blocks: [
          b('heading', { text: '🎯' }, { textAlign: 'center', fontSize: '36px', padding: '0 10px 0' }),
          b('heading', { text: 'Précision' }, { textAlign: 'center', fontSize: '15px', fontWeight: 'bold', padding: '5px 10px' }),
          b('text',    { text: 'Un niveau de détail qui fait toute la différence au quotidien.' }, { textAlign: 'center', fontSize: '13px', color: '#64748b', padding: '0 15px 25px' }),
        ]},
        { width: '33.33%', blocks: [
          b('heading', { text: '🔒' }, { textAlign: 'center', fontSize: '36px', padding: '0 10px 0' }),
          b('heading', { text: 'Fiabilité' }, { textAlign: 'center', fontSize: '15px', fontWeight: 'bold', padding: '5px 10px' }),
          b('text',    { text: 'Une qualité de fabrication pensée pour durer dans le temps.' }, { textAlign: 'center', fontSize: '13px', color: '#64748b', padding: '0 15px 25px' }),
        ]},
      ], { backgroundColor: '#f8fafc' }),
      row('100', [{ width: '100%', blocks: [
        b('text', { text: '★★★★★' }, { textAlign: 'center', fontSize: '20px', color: '#facc15', padding: '30px 10px 8px' }),
        b('text', { text: '« Un produit qui dépasse toutes mes attentes. Je recommande à 100%. »' }, { textAlign: 'center', fontSize: '17px', fontWeight: 'normal', padding: '0 40px 10px', lineHeight: '1.5', fontStyle: 'italic' }),
        b('text', { text: '— Marie L., cliente vérifiée' }, { textAlign: 'center', fontSize: '12px', color: '#94a3b8', padding: '0 10px 30px' }),
      ]}]),
      ...footerBlock('VOTRE MARQUE', '#0f172a'),
    ],
  },

  {
    id: 'promotion-soldes',
    name: 'Promotion / Soldes',
    description: 'Bannière soldes + grille produits + countdown CTA',
    category: 'marketing',
    subject: '🔥 SOLDES — Jusqu\'à -50% pendant 7 jours',
    rows: () => [
      preheader("L'événement de l'année. Stocks limités."),
      row('100', [{ width: '100%', blocks: [
        b('text',    { text: 'OFFRE LIMITÉE' }, { textAlign: 'center', color: '#fbbf24', fontSize: '12px', fontWeight: 'bold', padding: '20px 10px 5px', letterSpacing: '4px' }),
        b('heading', { text: 'SOLDES' }, { textAlign: 'center', color: '#ffffff', fontSize: '64px', fontWeight: 'bold', padding: '5px 10px 5px', letterSpacing: '8px' }),
        b('heading', { text: 'jusqu\'à -50%' }, { textAlign: 'center', color: '#fbbf24', fontSize: '24px', fontWeight: 'bold', padding: '0 10px 25px' }),
      ]}], { backgroundColor: '#0f172a' }),
      row('100', [{ width: '100%', blocks: [
        b('text', { text: '⏰ Plus que 7 jours · 23 h · 45 min' }, { textAlign: 'center', color: '#ffffff', fontSize: '14px', fontWeight: 'bold', padding: '15px 10px' }),
      ]}], { backgroundColor: '#dc2626' }),
      row('100', [{ width: '100%', blocks: [
        b('heading', { text: 'Nos best-sellers en promo' }, { textAlign: 'center', fontSize: '24px', fontWeight: 'bold', padding: '30px 10px 8px' }),
        b('text',    { text: 'Sélection de nos produits les plus aimés à prix imbattables.' }, { textAlign: 'center', fontSize: '14px', color: '#64748b', padding: '0 30px 20px' }),
      ]}]),
      row('50-50', [
        { width: '50%', blocks: [
          b('image',   { src: IMGS.shopping[0], alt: 'Produit' }, { width: '100%', borderRadius: '8px' }),
          b('text',    { text: '-40%' }, { textAlign: 'center', fontSize: '12px', fontWeight: 'bold', color: '#dc2626', padding: '10px 15px 2px' }),
          b('heading', { text: 'Best-seller A' }, { textAlign: 'center', fontSize: '15px', fontWeight: 'bold', padding: '0 15px' }),
          b('text',    { text: '29,99 €' }, { textAlign: 'center', fontSize: '18px', fontWeight: 'bold', color: '#dc2626', padding: '5px 15px 0' }),
          b('text',    { text: '49,99 €' }, { textAlign: 'center', fontSize: '12px', color: '#94a3b8', padding: '0 15px 15px', textDecoration: 'underline' }),
        ]},
        { width: '50%', blocks: [
          b('image',   { src: IMGS.shopping[1], alt: 'Produit' }, { width: '100%', borderRadius: '8px' }),
          b('text',    { text: '-50%' }, { textAlign: 'center', fontSize: '12px', fontWeight: 'bold', color: '#dc2626', padding: '10px 15px 2px' }),
          b('heading', { text: 'Best-seller B' }, { textAlign: 'center', fontSize: '15px', fontWeight: 'bold', padding: '0 15px' }),
          b('text',    { text: '39,99 €' }, { textAlign: 'center', fontSize: '18px', fontWeight: 'bold', color: '#dc2626', padding: '5px 15px 0' }),
          b('text',    { text: '79,99 €' }, { textAlign: 'center', fontSize: '12px', color: '#94a3b8', padding: '0 15px 15px', textDecoration: 'underline' }),
        ]},
      ]),
      row('100', [{ width: '100%', blocks: [
        b('button', { text: 'Profiter des soldes →', href: '#' }, { textAlign: 'center', padding: '25px 10px 10px', backgroundColor: '#dc2626' }),
        b('text',   { text: 'Code promo automatique · Cumulable avec la livraison gratuite' }, { textAlign: 'center', fontSize: '11px', color: '#94a3b8', padding: '0 10px 25px' }),
      ]}]),
      ...footerBlock('VOTRE MARQUE', '#0f172a'),
    ],
  },

  {
    id: 'flash-sale',
    name: 'Vente flash',
    description: 'Offre 24h urgente + 4 produits + urgence',
    category: 'marketing',
    subject: '⚡ FLASH — 24H seulement pour en profiter',
    rows: () => [
      preheader("Cette offre disparaît dans 24 heures. Ne tardez pas."),
      row('100', [{ width: '100%', blocks: [
        b('heading', { text: '⚡ VENTE FLASH ⚡' }, { textAlign: 'center', color: '#ffffff', fontSize: '28px', fontWeight: 'bold', padding: '20px 10px 5px', letterSpacing: '3px' }),
        b('text',    { text: '24 HEURES · STOCKS LIMITÉS' }, { textAlign: 'center', color: '#fbbf24', fontSize: '13px', fontWeight: 'bold', padding: '0 10px 18px', letterSpacing: '3px' }),
      ]}], { backgroundColor: '#b91c1c' }),
      row('100', [{ width: '100%', blocks: [
        b('heading', { text: 'Quatre offres exceptionnelles' }, { textAlign: 'center', fontSize: '22px', fontWeight: 'bold', padding: '25px 10px 8px' }),
        b('text',    { text: 'Sélectionnés rien que pour vous, à des prix qu\'on ne reverra pas avant longtemps.' }, { textAlign: 'center', fontSize: '14px', color: '#64748b', padding: '0 30px 20px' }),
      ]}]),
      row('50-50', [
        { width: '50%', blocks: [
          b('image',   { src: IMGS.shopping[1], alt: 'Produit 1' }, { width: '100%', borderRadius: '6px' }),
          b('heading', { text: 'Produit 1' }, { textAlign: 'center', fontSize: '14px', fontWeight: 'bold', padding: '10px 10px 2px' }),
          b('text',    { text: '29,99 €' }, { textAlign: 'center', fontSize: '16px', fontWeight: 'bold', color: '#b91c1c', padding: '0 10px 15px' }),
        ]},
        { width: '50%', blocks: [
          b('image',   { src: IMGS.shopping[2], alt: 'Produit 2' }, { width: '100%', borderRadius: '6px' }),
          b('heading', { text: 'Produit 2' }, { textAlign: 'center', fontSize: '14px', fontWeight: 'bold', padding: '10px 10px 2px' }),
          b('text',    { text: '39,99 €' }, { textAlign: 'center', fontSize: '16px', fontWeight: 'bold', color: '#b91c1c', padding: '0 10px 15px' }),
        ]},
      ]),
      row('50-50', [
        { width: '50%', blocks: [
          b('image',   { src: IMGS.shopping[3], alt: 'Produit 3' }, { width: '100%', borderRadius: '6px' }),
          b('heading', { text: 'Produit 3' }, { textAlign: 'center', fontSize: '14px', fontWeight: 'bold', padding: '10px 10px 2px' }),
          b('text',    { text: '19,99 €' }, { textAlign: 'center', fontSize: '16px', fontWeight: 'bold', color: '#b91c1c', padding: '0 10px 15px' }),
        ]},
        { width: '50%', blocks: [
          b('image',   { src: IMGS.shopping[4], alt: 'Produit 4' }, { width: '100%', borderRadius: '6px' }),
          b('heading', { text: 'Produit 4' }, { textAlign: 'center', fontSize: '14px', fontWeight: 'bold', padding: '10px 10px 2px' }),
          b('text',    { text: '49,99 €' }, { textAlign: 'center', fontSize: '16px', fontWeight: 'bold', color: '#b91c1c', padding: '0 10px 15px' }),
        ]},
      ]),
      row('100', [{ width: '100%', blocks: [
        b('button', { text: 'Profiter de la vente flash →', href: '#' }, { textAlign: 'center', padding: '20px 10px 10px', backgroundColor: '#b91c1c' }),
        b('text',   { text: '⏰ L\'offre se termine ce soir à minuit' }, { textAlign: 'center', fontSize: '12px', color: '#b91c1c', fontWeight: 'bold', padding: '0 10px 25px' }),
      ]}]),
      ...footerBlock('VOTRE MARQUE', '#0f172a'),
    ],
  },

  // ── TRANSACTIONNEL ─────────────────────────────────────────────────────────
  {
    id: 'confirmation-commande',
    name: 'Confirmation de commande',
    description: 'Commande validée + récap + livraison + support',
    category: 'transactionnel',
    subject: '✓ Commande #2026-XXXXX confirmée',
    rows: () => [
      preheader('Votre commande est confirmée et en cours de préparation.'),
      logoHeader('VOTRE MARQUE', '#0f172a'),
      row('100', [{ width: '100%', blocks: [
        b('heading', { text: '✓' }, { textAlign: 'center', color: '#16a34a', fontSize: '48px', fontWeight: 'bold', padding: '30px 10px 10px' }),
        b('heading', { text: 'Merci pour votre commande !' }, { textAlign: 'center', fontSize: '24px', fontWeight: 'bold', padding: '0 30px 8px' }),
        b('text',    { text: 'Bonjour [Prénom], votre commande est confirmée. Vous recevrez un email dès qu\'elle sera expédiée.' }, { textAlign: 'center', fontSize: '14px', color: '#64748b', padding: '0 30px 25px', lineHeight: '1.6' }),
      ]}]),
      row('100', [{ width: '100%', blocks: [
        b('text', { text: 'COMMANDE #2026-XXXXX' }, { textAlign: 'center', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', padding: '20px 10px 5px', letterSpacing: '2px' }),
        b('heading', { text: 'Récapitulatif' }, { textAlign: 'center', fontSize: '18px', fontWeight: 'bold', padding: '0 10px 15px' }),
        bTable(
          ['Produit', 'Qté', 'Prix'],
          [
            ['Produit A', '1', '49,99 €'],
            ['Produit B', '2', '29,99 €'],
            ['Sous-total HT', '—', '99,97 €'],
            ['Livraison', '—', 'Gratuite'],
            ['TVA (20%)', '—', '20,00 €'],
            ['TOTAL TTC', '—', '119,97 €'],
          ],
        ),
      ]}], { backgroundColor: '#f8fafc' }),
      row('100', [{ width: '100%', blocks: [
        b('text', { text: 'PROCHAINES ÉTAPES' }, { textAlign: 'center', fontSize: '11px', fontWeight: 'bold', color: '#16a34a', padding: '25px 10px 5px', letterSpacing: '2px' }),
        b('heading', { text: 'Voici ce qui se passe ensuite' }, { textAlign: 'center', fontSize: '20px', fontWeight: 'bold', padding: '0 10px 20px' }),
      ]}]),
      row('33-33-33', [
        { width: '33.33%', blocks: [
          b('heading', { text: '📦' }, { textAlign: 'center', fontSize: '32px', padding: '0 10px 5px' }),
          b('heading', { text: 'Préparation' }, { textAlign: 'center', fontSize: '13px', fontWeight: 'bold', padding: '0 10px 5px' }),
          b('text',    { text: 'Sous 24 heures ouvrées' }, { textAlign: 'center', fontSize: '12px', color: '#64748b', padding: '0 15px 15px' }),
        ]},
        { width: '33.33%', blocks: [
          b('heading', { text: '🚚' }, { textAlign: 'center', fontSize: '32px', padding: '0 10px 5px' }),
          b('heading', { text: 'Livraison' }, { textAlign: 'center', fontSize: '13px', fontWeight: 'bold', padding: '0 10px 5px' }),
          b('text',    { text: '3 à 5 jours ouvrés' }, { textAlign: 'center', fontSize: '12px', color: '#64748b', padding: '0 15px 15px' }),
        ]},
        { width: '33.33%', blocks: [
          b('heading', { text: '🎉' }, { textAlign: 'center', fontSize: '32px', padding: '0 10px 5px' }),
          b('heading', { text: 'Réception' }, { textAlign: 'center', fontSize: '13px', fontWeight: 'bold', padding: '0 10px 5px' }),
          b('text',    { text: 'Profitez de votre achat !' }, { textAlign: 'center', fontSize: '12px', color: '#64748b', padding: '0 15px 15px' }),
        ]},
      ]),
      row('100', [{ width: '100%', blocks: [
        b('button', { text: 'Suivre ma commande', href: '#' }, { textAlign: 'center', padding: '15px 10px 10px' }),
        b('text',   { text: 'Une question ? Notre support répond en moins d\'une heure : support@example.com' }, { textAlign: 'center', fontSize: '12px', color: '#64748b', padding: '5px 30px 25px', lineHeight: '1.6' }),
      ]}]),
      ...footerBlock('VOTRE MARQUE', '#0f172a'),
    ],
  },

  {
    id: 'bienvenue-compte',
    name: 'Bienvenue / Compte créé',
    description: 'Accueil chaleureux + 3 étapes onboarding + CTA',
    category: 'transactionnel',
    subject: '🎉 Bienvenue chez Votre Marque, [Prénom] !',
    rows: () => [
      preheader('Votre compte est prêt. Voici comment bien démarrer en 3 étapes.'),
      logoHeader('VOTRE MARQUE', '#0f172a'),
      row('100', [{ width: '100%', blocks: [
        b('heading', { text: '👋' }, { textAlign: 'center', fontSize: '54px', padding: '30px 10px 5px' }),
        b('heading', { text: 'Bienvenue à bord !' }, { textAlign: 'center', fontSize: '30px', fontWeight: 'bold', padding: '5px 30px 8px' }),
        b('text',    { text: 'Bonjour [Prénom], nous sommes ravis de vous compter parmi nous. Découvrons ensemble comment tirer le meilleur de votre nouveau compte.' }, { textAlign: 'center', fontSize: '15px', color: '#64748b', padding: '0 30px 25px', lineHeight: '1.6' }),
      ]}]),
      row('100', [{ width: '100%', blocks: [
        b('image', { src: IMGS.team[0], alt: 'Bienvenue' }, { width: '100%', borderRadius: '8px' }),
      ]}], { padding: '0 30px 25px' }),
      row('100', [{ width: '100%', blocks: [
        b('text', { text: 'POUR DÉMARRER' }, { textAlign: 'center', fontSize: '11px', fontWeight: 'bold', color: '#2563eb', padding: '15px 10px 5px', letterSpacing: '2px' }),
        b('heading', { text: '3 étapes pour bien commencer' }, { textAlign: 'center', fontSize: '22px', fontWeight: 'bold', padding: '0 10px 25px' }),
      ]}], { backgroundColor: '#f8fafc' }),
      row('100', [{ width: '100%', blocks: [
        b('heading', { text: '1️⃣  Personnalisez votre profil' }, { fontSize: '16px', fontWeight: 'bold', padding: '0 30px 5px' }),
        b('text',    { text: 'Ajoutez votre photo, vos préférences et complétez vos informations pour une expérience sur mesure.' }, { fontSize: '14px', color: '#64748b', padding: '0 30px 20px', lineHeight: '1.6' }),
      ]}], { backgroundColor: '#f8fafc' }),
      row('100', [{ width: '100%', blocks: [
        b('heading', { text: '2️⃣  Explorez les fonctionnalités' }, { fontSize: '16px', fontWeight: 'bold', padding: '0 30px 5px' }),
        b('text',    { text: 'Faites le tour des outils à votre disposition. Nos guides vous accompagnent à chaque étape.' }, { fontSize: '14px', color: '#64748b', padding: '0 30px 20px', lineHeight: '1.6' }),
      ]}], { backgroundColor: '#f8fafc' }),
      row('100', [{ width: '100%', blocks: [
        b('heading', { text: '3️⃣  Invitez votre équipe' }, { fontSize: '16px', fontWeight: 'bold', padding: '0 30px 5px' }),
        b('text',    { text: 'La collaboration commence ici. Invitez vos collègues et travaillez ensemble efficacement.' }, { fontSize: '14px', color: '#64748b', padding: '0 30px 25px', lineHeight: '1.6' }),
      ]}], { backgroundColor: '#f8fafc' }),
      row('100', [{ width: '100%', blocks: [
        b('button', { text: 'Accéder à mon espace →', href: '#' }, { textAlign: 'center', padding: '25px 10px 10px' }),
        b('text',   { text: 'Besoin d\'aide ? Notre équipe support est là pour vous : help@example.com' }, { textAlign: 'center', fontSize: '12px', color: '#64748b', padding: '5px 30px 25px' }),
      ]}]),
      ...footerBlock('VOTRE MARQUE', '#0f172a'),
    ],
  },

  {
    id: 'reinitialisation-mdp',
    name: 'Réinitialisation mot de passe',
    description: 'Email sécurisé minimal + note de sécurité',
    category: 'transactionnel',
    subject: '🔐 Réinitialisez votre mot de passe',
    rows: () => [
      preheader('Lien valable pendant 24 heures. Si ce n\'est pas vous, ignorez cet email.'),
      logoHeader('VOTRE MARQUE', '#0f172a'),
      row('100', [{ width: '100%', blocks: [
        b('heading', { text: '🔐' }, { textAlign: 'center', fontSize: '48px', padding: '40px 10px 10px' }),
        b('heading', { text: 'Réinitialiser votre mot de passe' }, { textAlign: 'center', fontSize: '24px', fontWeight: 'bold', padding: '5px 30px 12px' }),
        b('text',    { text: 'Bonjour, vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour en créer un nouveau.' }, { textAlign: 'center', fontSize: '14px', color: '#64748b', padding: '0 40px 25px', lineHeight: '1.7' }),
        b('button',  { text: 'Réinitialiser mon mot de passe', href: '#' }, { textAlign: 'center', padding: '5px 10px 10px' }),
        b('text',    { text: 'Ce lien expire dans 24 heures.' }, { textAlign: 'center', fontSize: '12px', color: '#94a3b8', padding: '5px 10px 30px' }),
      ]}]),
      row('100', [{ width: '100%', blocks: [
        b('heading', { text: '🛡️ Conseils de sécurité' }, { fontSize: '14px', fontWeight: 'bold', padding: '20px 30px 8px', color: '#475569' }),
        b('text',    { text: '• Si vous n\'avez pas demandé cette réinitialisation, ignorez cet email\n• Ne partagez jamais votre mot de passe avec personne\n• Choisissez un mot de passe unique et robuste (min. 12 caractères)' }, { fontSize: '12px', color: '#64748b', padding: '0 30px 20px', lineHeight: '1.8' }),
      ]}], { backgroundColor: '#fef3c7' }),
      row('100', [{ width: '100%', blocks: [
        b('text', { text: 'Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :\nhttps://app.example.com/reset-password?token=XXXXX' }, { textAlign: 'center', fontSize: '11px', color: '#94a3b8', padding: '20px 30px 25px', lineHeight: '1.6' }),
      ]}]),
      ...footerBlock('VOTRE MARQUE', '#0f172a'),
    ],
  },

  {
    id: 'recu-paiement',
    name: 'Reçu de paiement',
    description: 'Reçu professionnel avec ligne de paiement détaillée',
    category: 'transactionnel',
    subject: '💳 Reçu de paiement — Facture #F2026-XXXXX',
    rows: () => [
      preheader('Votre paiement a bien été reçu. Voici votre justificatif.'),
      logoHeader('VOTRE MARQUE', '#0f172a'),
      row('100', [{ width: '100%', blocks: [
        b('heading', { text: 'Paiement reçu ✓' }, { textAlign: 'center', color: '#16a34a', fontSize: '24px', fontWeight: 'bold', padding: '30px 10px 8px' }),
        b('text',    { text: 'Merci pour votre paiement. Voici le récapitulatif de votre transaction.' }, { textAlign: 'center', fontSize: '14px', color: '#64748b', padding: '0 30px 25px' }),
      ]}]),
      row('50-50', [
        { width: '50%', blocks: [
          b('text',    { text: 'NUMÉRO' }, { fontSize: '10px', fontWeight: 'bold', color: '#94a3b8', padding: '20px 30px 4px', letterSpacing: '1.5px' }),
          b('heading', { text: '#F2026-00142' }, { fontSize: '15px', fontWeight: 'bold', padding: '0 30px 8px' }),
        ]},
        { width: '50%', blocks: [
          b('text',    { text: 'DATE' }, { fontSize: '10px', fontWeight: 'bold', color: '#94a3b8', padding: '20px 30px 4px', letterSpacing: '1.5px' }),
          b('heading', { text: '07 mai 2026' }, { fontSize: '15px', fontWeight: 'bold', padding: '0 30px 8px' }),
        ]},
      ], { backgroundColor: '#f8fafc' }),
      row('100', [{ width: '100%', blocks: [
        bTable(
          ['Désignation', 'Qté', 'Prix unitaire', 'Total HT'],
          [
            ['Abonnement Pro — Mensuel', '1', '49,00 €', '49,00 €'],
            ['Frais de configuration', '1', '0,00 €', '0,00 €'],
            ['Sous-total HT', '—', '—', '49,00 €'],
            ['TVA (20%)', '—', '—', '9,80 €'],
            ['TOTAL TTC', '—', '—', '58,80 €'],
          ],
        ),
      ]}], { backgroundColor: '#f8fafc' }),
      row('100', [{ width: '100%', blocks: [
        b('text',    { text: 'MODE DE PAIEMENT' }, { fontSize: '10px', fontWeight: 'bold', color: '#94a3b8', padding: '25px 30px 5px', letterSpacing: '1.5px' }),
        b('text',    { text: '💳 Carte Visa se terminant par •••• 4242' }, { fontSize: '14px', padding: '0 30px 20px' }),
        b('text',    { text: 'Ce reçu fait office de justificatif de paiement.\nConservez-le pour vos archives.' }, { textAlign: 'center', fontSize: '12px', color: '#64748b', padding: '15px 30px 25px', lineHeight: '1.7' }),
        b('button',  { text: 'Télécharger le PDF', href: '#' }, { textAlign: 'center', padding: '10px 10px 25px', backgroundColor: '#ffffff', color: '#0f172a', borderSize: '1px', borderColor: '#0f172a' }),
      ]}]),
      ...footerBlock('VOTRE MARQUE', '#0f172a'),
    ],
  },

  // ── E-COMMERCE ─────────────────────────────────────────────────────────────
  {
    id: 'panier-abandonne',
    name: 'Panier abandonné',
    description: 'Relance avec produit + code promo + réassurance',
    category: 'ecommerce',
    subject: '🛒 Vous avez oublié quelque chose...',
    rows: () => [
      preheader('Vos articles vous attendent encore. Code -10% à l\'intérieur.'),
      logoHeader('VOTRE MARQUE', '#0f172a'),
      row('100', [{ width: '100%', blocks: [
        b('heading', { text: 'Vos articles vous attendent...' }, { textAlign: 'center', fontSize: '26px', fontWeight: 'bold', padding: '30px 30px 10px' }),
        b('text',    { text: 'Vous avez laissé votre panier en plan ! Pas d\'inquiétude, nous l\'avons gardé pour vous.' }, { textAlign: 'center', fontSize: '15px', color: '#64748b', padding: '0 30px 25px', lineHeight: '1.6' }),
      ]}]),
      row('100', [{ width: '100%', blocks: [
        b('image', { src: IMGS.shopping[5], alt: 'Votre panier' }, { width: '100%', borderRadius: '8px' }),
      ]}], { padding: '0 30px 0' }),
      row('100', [{ width: '100%', blocks: [
        b('text', { text: 'DANS VOTRE PANIER' }, { textAlign: 'center', fontSize: '11px', fontWeight: 'bold', color: '#7c3aed', padding: '25px 10px 8px', letterSpacing: '2px' }),
      ]}]),
      row('33-67', [
        { width: '33%', blocks: [b('image', { src: IMGS.shopping[0], alt: 'Produit A' }, { width: '100%', borderRadius: '6px' })] },
        { width: '67%', blocks: [
          b('heading', { text: 'Produit A' }, { fontSize: '16px', fontWeight: 'bold', padding: '15px 15px 4px' }),
          b('text',    { text: 'Description courte du produit' }, { fontSize: '12px', color: '#94a3b8', padding: '0 15px 8px' }),
          b('text',    { text: '49,99 €' }, { fontSize: '18px', fontWeight: 'bold', color: '#7c3aed', padding: '0 15px 12px' }),
        ]},
      ]),
      row('33-67', [
        { width: '33%', blocks: [b('image', { src: IMGS.shopping[1], alt: 'Produit B' }, { width: '100%', borderRadius: '6px' })] },
        { width: '67%', blocks: [
          b('heading', { text: 'Produit B' }, { fontSize: '16px', fontWeight: 'bold', padding: '15px 15px 4px' }),
          b('text',    { text: 'Description courte du produit' }, { fontSize: '12px', color: '#94a3b8', padding: '0 15px 8px' }),
          b('text',    { text: '29,99 €' }, { fontSize: '18px', fontWeight: 'bold', color: '#7c3aed', padding: '0 15px 12px' }),
        ]},
      ]),
      row('100', [{ width: '100%', blocks: [
        b('text',    { text: '🎁 Cadeau de bienvenue : -10% avec le code' }, { textAlign: 'center', fontSize: '13px', color: '#64748b', padding: '20px 10px 5px' }),
        b('heading', { text: 'PANIER10' }, { textAlign: 'center', fontSize: '24px', fontWeight: 'bold', color: '#7c3aed', padding: '0 10px 5px', letterSpacing: '3px' }),
        b('text',    { text: 'Valable 48 heures' }, { textAlign: 'center', fontSize: '11px', color: '#94a3b8', padding: '0 10px 18px' }),
        b('button',  { text: 'Finaliser ma commande →', href: '#' }, { textAlign: 'center', padding: '5px 10px 25px', backgroundColor: '#7c3aed' }),
      ]}], { backgroundColor: '#f5f3ff' }),
      row('33-33-33', [
        { width: '33.33%', blocks: [
          b('text', { text: '🚚' }, { textAlign: 'center', fontSize: '24px', padding: '20px 10px 0' }),
          b('text', { text: 'Livraison\ngratuite > 50€' }, { textAlign: 'center', fontSize: '11px', color: '#475569', padding: '0 10px 20px', lineHeight: '1.5' }),
        ]},
        { width: '33.33%', blocks: [
          b('text', { text: '↩️' }, { textAlign: 'center', fontSize: '24px', padding: '20px 10px 0' }),
          b('text', { text: 'Retours gratuits\n30 jours' }, { textAlign: 'center', fontSize: '11px', color: '#475569', padding: '0 10px 20px', lineHeight: '1.5' }),
        ]},
        { width: '33.33%', blocks: [
          b('text', { text: '🔒' }, { textAlign: 'center', fontSize: '24px', padding: '20px 10px 0' }),
          b('text', { text: 'Paiement\n100% sécurisé' }, { textAlign: 'center', fontSize: '11px', color: '#475569', padding: '0 10px 20px', lineHeight: '1.5' }),
        ]},
      ]),
      ...footerBlock('VOTRE MARQUE', '#7c3aed'),
    ],
  },

  {
    id: 'nouveautes',
    name: 'Nouveautés',
    description: 'Collection saison + grille produits + lookbook',
    category: 'ecommerce',
    subject: '✨ La nouvelle collection est arrivée',
    rows: () => [
      preheader('Découvrez nos pièces phares de la saison.'),
      logoHeader('VOTRE MARQUE', '#0f172a'),
      row('100', [{ width: '100%', blocks: [b('image', { src: IMGS.shopping[5], alt: 'Nouvelle collection' }, { width: '100%' })] }]),
      row('100', [{ width: '100%', blocks: [
        b('text',    { text: 'COLLECTION PRINTEMPS-ÉTÉ 2026' }, { textAlign: 'center', fontSize: '11px', fontWeight: 'bold', color: '#7c3aed', padding: '25px 10px 5px', letterSpacing: '2px' }),
        b('heading', { text: 'Les nouveautés sont là' }, { textAlign: 'center', fontSize: '30px', fontWeight: 'bold', padding: '0 30px 10px' }),
        b('text',    { text: 'Une sélection inédite de pièces uniques, conçues avec passion pour vous accompagner cette saison.' }, { textAlign: 'center', fontSize: '14px', color: '#64748b', padding: '0 30px 25px', lineHeight: '1.6' }),
      ]}]),
      row('50-50', [
        { width: '50%', blocks: [
          b('image',   { src: IMGS.shopping[0], alt: 'Produit A' }, { width: '100%', borderRadius: '6px' }),
          b('text',    { text: 'NOUVEAU' }, { textAlign: 'center', fontSize: '10px', fontWeight: 'bold', color: '#dc2626', padding: '8px 10px 2px', letterSpacing: '1.5px' }),
          b('heading', { text: 'Pièce A' }, { textAlign: 'center', fontSize: '15px', fontWeight: 'bold', padding: '0 10px' }),
          b('text',    { text: '49,99 €' }, { textAlign: 'center', fontSize: '14px', fontWeight: 'bold', padding: '5px 10px 8px' }),
          b('button',  { text: 'Découvrir', href: '#' }, { textAlign: 'center', padding: '0 10px 15px', backgroundColor: '#ffffff', color: '#0f172a', borderSize: '1px', borderColor: '#0f172a' }),
        ]},
        { width: '50%', blocks: [
          b('image',   { src: IMGS.shopping[1], alt: 'Produit B' }, { width: '100%', borderRadius: '6px' }),
          b('text',    { text: 'NOUVEAU' }, { textAlign: 'center', fontSize: '10px', fontWeight: 'bold', color: '#dc2626', padding: '8px 10px 2px', letterSpacing: '1.5px' }),
          b('heading', { text: 'Pièce B' }, { textAlign: 'center', fontSize: '15px', fontWeight: 'bold', padding: '0 10px' }),
          b('text',    { text: '39,99 €' }, { textAlign: 'center', fontSize: '14px', fontWeight: 'bold', padding: '5px 10px 8px' }),
          b('button',  { text: 'Découvrir', href: '#' }, { textAlign: 'center', padding: '0 10px 15px', backgroundColor: '#ffffff', color: '#0f172a', borderSize: '1px', borderColor: '#0f172a' }),
        ]},
      ]),
      row('50-50', [
        { width: '50%', blocks: [
          b('image',   { src: IMGS.shopping[2], alt: 'Produit C' }, { width: '100%', borderRadius: '6px' }),
          b('heading', { text: 'Pièce C' }, { textAlign: 'center', fontSize: '15px', fontWeight: 'bold', padding: '10px 10px 0' }),
          b('text',    { text: '59,99 €' }, { textAlign: 'center', fontSize: '14px', fontWeight: 'bold', padding: '5px 10px 8px' }),
          b('button',  { text: 'Découvrir', href: '#' }, { textAlign: 'center', padding: '0 10px 15px', backgroundColor: '#ffffff', color: '#0f172a', borderSize: '1px', borderColor: '#0f172a' }),
        ]},
        { width: '50%', blocks: [
          b('image',   { src: IMGS.shopping[3], alt: 'Produit D' }, { width: '100%', borderRadius: '6px' }),
          b('heading', { text: 'Pièce D' }, { textAlign: 'center', fontSize: '15px', fontWeight: 'bold', padding: '10px 10px 0' }),
          b('text',    { text: '29,99 €' }, { textAlign: 'center', fontSize: '14px', fontWeight: 'bold', padding: '5px 10px 8px' }),
          b('button',  { text: 'Découvrir', href: '#' }, { textAlign: 'center', padding: '0 10px 15px', backgroundColor: '#ffffff', color: '#0f172a', borderSize: '1px', borderColor: '#0f172a' }),
        ]},
      ]),
      row('100', [{ width: '100%', blocks: [
        b('button', { text: 'Voir toute la collection →', href: '#' }, { textAlign: 'center', padding: '25px 10px 25px' }),
      ]}]),
      ...footerBlock('VOTRE MARQUE', '#0f172a'),
    ],
  },

  {
    id: 'demande-avis',
    name: "Demande d'avis",
    description: 'Post-achat — invitation à laisser un avis',
    category: 'ecommerce',
    subject: '⭐ Comment s\'est passée votre commande ?',
    rows: () => [
      preheader('2 minutes pour partager votre expérience.'),
      logoHeader('VOTRE MARQUE', '#0f172a'),
      row('100', [{ width: '100%', blocks: [
        b('heading', { text: '🙏' }, { textAlign: 'center', fontSize: '54px', padding: '30px 10px 5px' }),
        b('heading', { text: 'Merci pour votre achat !' }, { textAlign: 'center', fontSize: '26px', fontWeight: 'bold', padding: '5px 30px 10px' }),
        b('text',    { text: 'Bonjour [Prénom], nous espérons que votre commande répond à toutes vos attentes. Votre avis compte énormément pour nous.' }, { textAlign: 'center', fontSize: '14px', color: '#64748b', padding: '0 30px 25px', lineHeight: '1.7' }),
      ]}]),
      row('100', [{ width: '100%', blocks: [
        b('image', { src: IMGS.shopping[0], alt: 'Votre achat' }, { width: '60%', borderRadius: '8px', textAlign: 'center' }),
      ]}]),
      row('100', [{ width: '100%', blocks: [
        b('text',    { text: 'NOTEZ VOTRE EXPÉRIENCE' }, { textAlign: 'center', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', padding: '25px 10px 8px', letterSpacing: '2px' }),
        b('text',    { text: '★ ★ ★ ★ ★' }, { textAlign: 'center', fontSize: '36px', color: '#facc15', padding: '5px 10px', letterSpacing: '8px' }),
        b('text',    { text: 'Comment évalueriez-vous votre commande ?' }, { textAlign: 'center', fontSize: '15px', color: '#475569', padding: '15px 30px 18px' }),
        b('button',  { text: 'Laisser un avis →', href: '#' }, { textAlign: 'center', padding: '5px 10px 12px' }),
        b('text',    { text: 'Cela ne prend que 2 minutes — promis !' }, { textAlign: 'center', fontSize: '11px', color: '#94a3b8', padding: '0 10px 25px' }),
      ]}], { backgroundColor: '#f8fafc' }),
      row('100', [{ width: '100%', blocks: [
        b('heading', { text: '🎁 Une surprise vous attend' }, { textAlign: 'center', fontSize: '15px', fontWeight: 'bold', padding: '20px 30px 5px' }),
        b('text',    { text: 'En remerciement, nous vous offrons -10% sur votre prochaine commande après votre avis.' }, { textAlign: 'center', fontSize: '13px', color: '#64748b', padding: '0 30px 25px', lineHeight: '1.6' }),
      ]}]),
      ...footerBlock('VOTRE MARQUE', '#0f172a'),
    ],
  },

  {
    id: 'recommandations-produits',
    name: 'Recommandations produits',
    description: 'Suggestions personnalisées 3 colonnes',
    category: 'ecommerce',
    subject: '✨ Vous aimerez aussi...',
    rows: () => [
      preheader('Sélectionnés rien que pour vous selon vos préférences.'),
      logoHeader('VOTRE MARQUE', '#0f172a'),
      row('100', [{ width: '100%', blocks: [
        b('text',    { text: 'NOS COUPS DE CŒUR' }, { textAlign: 'center', fontSize: '11px', fontWeight: 'bold', color: '#7c3aed', padding: '25px 10px 5px', letterSpacing: '2px' }),
        b('heading', { text: 'Vous aimerez aussi...' }, { textAlign: 'center', fontSize: '28px', fontWeight: 'bold', padding: '0 30px 10px' }),
        b('text',    { text: 'Une sélection inspirée de vos derniers achats. Cliquez pour découvrir.' }, { textAlign: 'center', fontSize: '14px', color: '#64748b', padding: '0 30px 25px' }),
      ]}]),
      row('33-33-33', [
        { width: '33.33%', blocks: [
          b('image',   { src: IMGS.shopping[1], alt: 'Recommandé 1' }, { width: '100%', borderRadius: '6px' }),
          b('heading', { text: 'Produit A' }, { textAlign: 'center', fontSize: '14px', fontWeight: 'bold', padding: '10px 10px 2px' }),
          b('text',    { text: '★★★★★ (124)' }, { textAlign: 'center', fontSize: '10px', color: '#94a3b8', padding: '0 10px 4px' }),
          b('text',    { text: '29,99 €' }, { textAlign: 'center', fontSize: '15px', fontWeight: 'bold', color: '#7c3aed', padding: '0 10px 8px' }),
          b('button',  { text: 'Voir', href: '#' }, { textAlign: 'center', padding: '0 10px 15px', backgroundColor: '#ffffff', color: '#7c3aed', borderSize: '1px', borderColor: '#7c3aed' }),
        ]},
        { width: '33.33%', blocks: [
          b('image',   { src: IMGS.shopping[2], alt: 'Recommandé 2' }, { width: '100%', borderRadius: '6px' }),
          b('heading', { text: 'Produit B' }, { textAlign: 'center', fontSize: '14px', fontWeight: 'bold', padding: '10px 10px 2px' }),
          b('text',    { text: '★★★★★ (87)' }, { textAlign: 'center', fontSize: '10px', color: '#94a3b8', padding: '0 10px 4px' }),
          b('text',    { text: '44,99 €' }, { textAlign: 'center', fontSize: '15px', fontWeight: 'bold', color: '#7c3aed', padding: '0 10px 8px' }),
          b('button',  { text: 'Voir', href: '#' }, { textAlign: 'center', padding: '0 10px 15px', backgroundColor: '#ffffff', color: '#7c3aed', borderSize: '1px', borderColor: '#7c3aed' }),
        ]},
        { width: '33.33%', blocks: [
          b('image',   { src: IMGS.shopping[3], alt: 'Recommandé 3' }, { width: '100%', borderRadius: '6px' }),
          b('heading', { text: 'Produit C' }, { textAlign: 'center', fontSize: '14px', fontWeight: 'bold', padding: '10px 10px 2px' }),
          b('text',    { text: '★★★★★ (203)' }, { textAlign: 'center', fontSize: '10px', color: '#94a3b8', padding: '0 10px 4px' }),
          b('text',    { text: '59,99 €' }, { textAlign: 'center', fontSize: '15px', fontWeight: 'bold', color: '#7c3aed', padding: '0 10px 8px' }),
          b('button',  { text: 'Voir', href: '#' }, { textAlign: 'center', padding: '0 10px 15px', backgroundColor: '#ffffff', color: '#7c3aed', borderSize: '1px', borderColor: '#7c3aed' }),
        ]},
      ]),
      row('100', [{ width: '100%', blocks: [
        b('button', { text: 'Voir toutes les suggestions →', href: '#' }, { textAlign: 'center', padding: '25px 10px 25px', backgroundColor: '#7c3aed' }),
      ]}]),
      ...footerBlock('VOTRE MARQUE', '#7c3aed'),
    ],
  },

  // ── ÉVÉNEMENTS & WEBINAIRES ────────────────────────────────────────────────
  {
    id: 'invitation-evenement',
    name: 'Invitation événement',
    description: 'Invitation premium + agenda + speakers + RSVP',
    category: 'evenement',
    subject: '🎟️ Vous êtes invité — Conférence Annuelle 2026',
    rows: () => [
      preheader('Places limitées · Inscription gratuite'),
      logoHeader('VOTRE MARQUE', '#0f172a'),
      row('100', [{ width: '100%', blocks: [b('image', { src: IMGS.people[2], alt: 'Événement' }, { width: '100%' })] }]),
      row('100', [{ width: '100%', blocks: [
        b('text',    { text: '🎟️ INVITATION EXCLUSIVE' }, { textAlign: 'center', fontSize: '11px', fontWeight: 'bold', color: '#ea580c', padding: '25px 10px 8px', letterSpacing: '2.5px' }),
        b('heading', { text: 'Conférence Annuelle 2026' }, { textAlign: 'center', fontSize: '30px', fontWeight: 'bold', padding: '5px 30px 10px', lineHeight: '1.2' }),
        b('text',    { text: 'Une journée inspirante avec les acteurs qui façonnent demain. Conférences, ateliers et networking.' }, { textAlign: 'center', fontSize: '15px', color: '#64748b', padding: '0 30px 25px', lineHeight: '1.6' }),
      ]}]),
      row('33-33-33', [
        { width: '33.33%', blocks: [
          b('text', { text: '📅' }, { textAlign: 'center', fontSize: '28px', padding: '15px 10px 0' }),
          b('text', { text: 'DATE' }, { textAlign: 'center', fontSize: '10px', fontWeight: 'bold', color: '#94a3b8', padding: '5px 10px 2px', letterSpacing: '1.5px' }),
          b('heading', { text: '15 juin' }, { textAlign: 'center', fontSize: '18px', fontWeight: 'bold', padding: '0 10px 2px' }),
          b('text', { text: '2026' }, { textAlign: 'center', fontSize: '12px', color: '#64748b', padding: '0 10px 15px' }),
        ]},
        { width: '33.33%', blocks: [
          b('text', { text: '⏰' }, { textAlign: 'center', fontSize: '28px', padding: '15px 10px 0' }),
          b('text', { text: 'HORAIRE' }, { textAlign: 'center', fontSize: '10px', fontWeight: 'bold', color: '#94a3b8', padding: '5px 10px 2px', letterSpacing: '1.5px' }),
          b('heading', { text: '9h – 18h' }, { textAlign: 'center', fontSize: '18px', fontWeight: 'bold', padding: '0 10px 2px' }),
          b('text', { text: 'Journée complète' }, { textAlign: 'center', fontSize: '12px', color: '#64748b', padding: '0 10px 15px' }),
        ]},
        { width: '33.33%', blocks: [
          b('text', { text: '📍' }, { textAlign: 'center', fontSize: '28px', padding: '15px 10px 0' }),
          b('text', { text: 'LIEU' }, { textAlign: 'center', fontSize: '10px', fontWeight: 'bold', color: '#94a3b8', padding: '5px 10px 2px', letterSpacing: '1.5px' }),
          b('heading', { text: 'Paris' }, { textAlign: 'center', fontSize: '18px', fontWeight: 'bold', padding: '0 10px 2px' }),
          b('text', { text: 'Salle des Fêtes' }, { textAlign: 'center', fontSize: '12px', color: '#64748b', padding: '0 10px 15px' }),
        ]},
      ], { backgroundColor: '#fff7ed' }),
      row('100', [{ width: '100%', blocks: [
        b('button', { text: 'Je réserve ma place →', href: '#' }, { textAlign: 'center', padding: '25px 10px 8px', backgroundColor: '#ea580c' }),
        b('text',   { text: 'Inscription gratuite · 200 places disponibles' }, { textAlign: 'center', fontSize: '12px', color: '#94a3b8', padding: '0 10px 25px' }),
      ]}]),
      row('100', [{ width: '100%', blocks: [b('divider', undefined, { borderColor: '#e2e8f0', padding: '0 30px' })] }]),
      row('100', [{ width: '100%', blocks: [
        b('text',    { text: 'AU PROGRAMME' }, { textAlign: 'center', fontSize: '11px', fontWeight: 'bold', color: '#ea580c', padding: '25px 10px 5px', letterSpacing: '2px' }),
        b('heading', { text: 'Une journée pleine d\'inspiration' }, { textAlign: 'center', fontSize: '22px', fontWeight: 'bold', padding: '0 30px 20px' }),
        b('text',    { text: '🎤  Keynote d\'ouverture par notre invité d\'honneur\n💡  3 conférences thématiques par des experts reconnus\n🤝  Sessions de networking avec les participants\n🍽️  Cocktail dînatoire pour clôturer la journée' }, { fontSize: '14px', color: '#475569', padding: '0 40px 30px', lineHeight: '2' }),
      ]}]),
      ...footerBlock('VOTRE MARQUE', '#ea580c'),
    ],
  },

  {
    id: 'rappel-evenement',
    name: 'Rappel événement',
    description: 'Rappel J-1 avec checklist + accès',
    category: 'evenement',
    subject: '⏰ C\'est demain ! Tout ce qu\'il faut savoir',
    rows: () => [
      preheader('Votre événement a lieu demain. Voici l\'essentiel.'),
      row('100', [{ width: '100%', blocks: [
        b('heading', { text: '⏰ C\'EST DEMAIN !' }, { textAlign: 'center', color: '#ffffff', fontSize: '24px', fontWeight: 'bold', padding: '22px 10px', letterSpacing: '2px' }),
      ]}], { backgroundColor: '#1e40af' }),
      row('100', [{ width: '100%', blocks: [
        b('heading', { text: 'On vous attend demain' }, { textAlign: 'center', fontSize: '26px', fontWeight: 'bold', padding: '30px 30px 10px' }),
        b('text',    { text: 'Bonjour [Prénom], votre événement est prévu pour demain. Voici un récapitulatif pour ne rien oublier.' }, { textAlign: 'center', fontSize: '14px', color: '#64748b', padding: '0 30px 20px', lineHeight: '1.6' }),
      ]}]),
      row('100', [{ width: '100%', blocks: [b('image', { src: IMGS.people[3], alt: 'Événement' }, { width: '100%', borderRadius: '8px' })] }], { padding: '0 30px' }),
      row('50-50', [
        { width: '50%', blocks: [
          b('text',    { text: 'QUAND' }, { fontSize: '10px', fontWeight: 'bold', color: '#1e40af', padding: '20px 25px 5px', letterSpacing: '1.5px' }),
          b('heading', { text: 'Vendredi 16 juin' }, { fontSize: '15px', fontWeight: 'bold', padding: '0 25px 3px' }),
          b('text',    { text: 'Accueil dès 8h45 — Début 9h00' }, { fontSize: '12px', color: '#64748b', padding: '0 25px 20px' }),
        ]},
        { width: '50%', blocks: [
          b('text',    { text: 'OÙ' }, { fontSize: '10px', fontWeight: 'bold', color: '#1e40af', padding: '20px 25px 5px', letterSpacing: '1.5px' }),
          b('heading', { text: '123 rue Exemple' }, { fontSize: '15px', fontWeight: 'bold', padding: '0 25px 3px' }),
          b('text',    { text: 'Métro · Ligne 4 · Station X' }, { fontSize: '12px', color: '#64748b', padding: '0 25px 20px' }),
        ]},
      ], { backgroundColor: '#eff6ff' }),
      row('100', [{ width: '100%', blocks: [
        b('text',    { text: 'À NE PAS OUBLIER' }, { textAlign: 'center', fontSize: '11px', fontWeight: 'bold', color: '#1e40af', padding: '25px 10px 8px', letterSpacing: '2px' }),
        b('heading', { text: 'Votre checklist' }, { textAlign: 'center', fontSize: '20px', fontWeight: 'bold', padding: '0 10px 15px' }),
        b('text',    { text: '✅  Votre billet (sur smartphone ou imprimé)\n✅  Une pièce d\'identité\n✅  Tenue confortable recommandée\n✅  De l\'énergie et de la curiosité !' }, { fontSize: '14px', color: '#475569', padding: '0 40px 25px', lineHeight: '2.2' }),
      ]}]),
      row('100', [{ width: '100%', blocks: [
        b('button', { text: '📅 Ajouter au calendrier', href: '#' }, { textAlign: 'center', padding: '0 10px 12px', backgroundColor: '#1e40af' }),
        b('button', { text: '🗺️  Voir l\'itinéraire', href: '#' }, { textAlign: 'center', padding: '0 10px 25px', backgroundColor: '#ffffff', color: '#1e40af', borderSize: '1px', borderColor: '#1e40af' }),
      ]}]),
      ...footerBlock('VOTRE MARQUE', '#1e40af'),
    ],
  },

  {
    id: 'confirmation-inscription',
    name: "Confirmation d'inscription",
    description: 'Confirmation événement + récap + ticket',
    category: 'evenement',
    subject: '✓ Inscription confirmée — Conférence 2026',
    rows: () => [
      preheader('Votre place est réservée. Voici votre confirmation.'),
      logoHeader('VOTRE MARQUE', '#0f172a'),
      row('100', [{ width: '100%', blocks: [
        b('heading', { text: '✓' }, { textAlign: 'center', color: '#16a34a', fontSize: '54px', padding: '30px 10px 5px' }),
        b('heading', { text: 'Inscription confirmée !' }, { textAlign: 'center', fontSize: '26px', fontWeight: 'bold', padding: '5px 30px 10px' }),
        b('text',    { text: 'Bonjour [Prénom], votre place est officiellement réservée. Nous avons hâte de vous accueillir !' }, { textAlign: 'center', fontSize: '14px', color: '#64748b', padding: '0 30px 25px', lineHeight: '1.6' }),
      ]}]),
      row('100', [{ width: '100%', blocks: [
        b('text',    { text: 'VOTRE BILLET' }, { textAlign: 'center', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', padding: '25px 10px 5px', letterSpacing: '2px' }),
        b('heading', { text: 'Conférence Annuelle 2026' }, { textAlign: 'center', fontSize: '20px', fontWeight: 'bold', padding: '0 30px 15px' }),
        bTable(
          ['Détail', 'Information'],
          [
            ['📅  Date',         'Jeudi 15 juin 2026'],
            ['⏰  Horaire',      '09h00 – 18h00'],
            ['📍  Lieu',          'Paris, Salle des Fêtes'],
            ['🎟️  Billet n°',     '#TKT-2026-XXXX'],
            ['👤  Participant',  'Prénom NOM'],
            ['🪑  Place',         'Libre service'],
          ],
        ),
      ]}], { backgroundColor: '#f0fdf4' }),
      row('100', [{ width: '100%', blocks: [
        b('button', { text: '📥 Télécharger mon billet', href: '#' }, { textAlign: 'center', padding: '20px 10px 8px' }),
        b('button', { text: '📅 Ajouter à mon calendrier', href: '#' }, { textAlign: 'center', padding: '0 10px 20px', backgroundColor: '#ffffff', color: '#16a34a', borderSize: '1px', borderColor: '#16a34a' }),
      ]}]),
      row('100', [{ width: '100%', blocks: [
        b('text', { text: 'Vous ne pouvez plus venir ? Annulez gratuitement jusqu\'au 14 juin :\nsupport@example.com' }, { textAlign: 'center', fontSize: '12px', color: '#64748b', padding: '15px 30px 25px', lineHeight: '1.7' }),
      ]}]),
      ...footerBlock('VOTRE MARQUE', '#16a34a'),
    ],
  },

  // ── RE-ENGAGEMENT & FIDÉLITÉ ───────────────────────────────────────────────
  {
    id: 'win-back',
    name: 'Win-back "On vous manque"',
    description: 'Relance émotionnelle + offre généreuse de retour',
    category: 'reengagement',
    subject: '💙 [Prénom], on ne vous oublie pas...',
    rows: () => [
      preheader('Ça fait un moment. Voici quelque chose de spécial pour votre retour.'),
      logoHeader('VOTRE MARQUE', '#0f172a'),
      row('100', [{ width: '100%', blocks: [
        b('heading', { text: '💙' }, { textAlign: 'center', fontSize: '64px', padding: '30px 10px 5px' }),
        b('heading', { text: 'Vous nous manquez vraiment' }, { textAlign: 'center', fontSize: '28px', fontWeight: 'bold', padding: '5px 30px 10px' }),
        b('text',    { text: 'Bonjour [Prénom], ça fait un moment qu\'on ne vous a pas vu. On a pensé à vous, et on a une petite surprise...' }, { textAlign: 'center', fontSize: '15px', color: '#64748b', padding: '0 30px 25px', lineHeight: '1.7' }),
      ]}]),
      row('100', [{ width: '100%', blocks: [b('image', { src: IMGS.abstract[0], alt: 'On vous manque' }, { width: '100%', borderRadius: '8px' })] }], { padding: '0 30px' }),
      row('100', [{ width: '100%', blocks: [
        b('text',    { text: '🎁  CADEAU DE RETOUR' }, { textAlign: 'center', fontSize: '11px', fontWeight: 'bold', color: '#db2777', padding: '30px 10px 5px', letterSpacing: '2px' }),
        b('heading', { text: '-25% sur tout' }, { textAlign: 'center', fontSize: '36px', fontWeight: 'bold', padding: '5px 10px 5px', color: '#db2777' }),
        b('text',    { text: 'Avec le code ci-dessous' }, { textAlign: 'center', fontSize: '14px', color: '#64748b', padding: '0 10px 12px' }),
        b('heading', { text: 'BIENVENUE25' }, { textAlign: 'center', fontSize: '22px', fontWeight: 'bold', padding: '0 10px 8px', letterSpacing: '4px' }),
        b('text',    { text: 'Valable 7 jours · Sans minimum d\'achat' }, { textAlign: 'center', fontSize: '12px', color: '#94a3b8', padding: '0 10px 18px' }),
        b('button',  { text: 'J\'en profite maintenant →', href: '#' }, { textAlign: 'center', padding: '5px 10px 25px', backgroundColor: '#db2777' }),
      ]}], { backgroundColor: '#fdf2f8' }),
      row('100', [{ width: '100%', blocks: [
        b('text',    { text: 'CE QUI A CHANGÉ DEPUIS' }, { textAlign: 'center', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', padding: '25px 10px 8px', letterSpacing: '2px' }),
        b('heading', { text: 'On s\'est amélioré pour vous' }, { textAlign: 'center', fontSize: '20px', fontWeight: 'bold', padding: '0 30px 18px' }),
      ]}]),
      row('33-33-33', [
        { width: '33.33%', blocks: [
          b('text', { text: '✨' }, { textAlign: 'center', fontSize: '32px', padding: '0 10px 5px' }),
          b('text', { text: 'Nouvelle\ncollection' }, { textAlign: 'center', fontSize: '12px', fontWeight: 'bold', padding: '0 10px 18px', lineHeight: '1.5' }),
        ]},
        { width: '33.33%', blocks: [
          b('text', { text: '🚚' }, { textAlign: 'center', fontSize: '32px', padding: '0 10px 5px' }),
          b('text', { text: 'Livraison\nplus rapide' }, { textAlign: 'center', fontSize: '12px', fontWeight: 'bold', padding: '0 10px 18px', lineHeight: '1.5' }),
        ]},
        { width: '33.33%', blocks: [
          b('text', { text: '💬' }, { textAlign: 'center', fontSize: '32px', padding: '0 10px 5px' }),
          b('text', { text: 'Support\nencore mieux' }, { textAlign: 'center', fontSize: '12px', fontWeight: 'bold', padding: '0 10px 18px', lineHeight: '1.5' }),
        ]},
      ]),
      ...footerBlock('VOTRE MARQUE', '#db2777'),
    ],
  },

  {
    id: 'anniversaire-client',
    name: 'Anniversaire client',
    description: 'Bon anniversaire + cadeau exclusif personnalisé',
    category: 'reengagement',
    subject: '🎂 Joyeux anniversaire [Prénom] ! Votre cadeau à l\'intérieur',
    rows: () => [
      preheader('Une journée spéciale mérite une surprise spéciale.'),
      row('100', [{ width: '100%', blocks: [
        b('heading', { text: '🎂  🎉  🎁' }, { textAlign: 'center', color: '#ffffff', fontSize: '40px', padding: '25px 10px 8px', letterSpacing: '6px' }),
        b('heading', { text: 'Joyeux anniversaire !' }, { textAlign: 'center', color: '#ffffff', fontSize: '28px', fontWeight: 'bold', padding: '0 10px 25px' }),
      ]}], { backgroundColor: '#7c3aed' }),
      row('100', [{ width: '100%', blocks: [
        b('text',    { text: 'Bonjour [Prénom],' }, { textAlign: 'center', fontSize: '17px', fontWeight: 'bold', padding: '30px 30px 10px' }),
        b('text',    { text: 'En ce jour si spécial, toute notre équipe se joint à moi pour vous souhaiter un merveilleux anniversaire ! 🎈' }, { textAlign: 'center', fontSize: '15px', color: '#475569', padding: '0 30px 20px', lineHeight: '1.7' }),
        b('text',    { text: 'Et comme un anniversaire ne serait pas complet sans cadeau...' }, { textAlign: 'center', fontSize: '14px', color: '#64748b', padding: '0 30px 25px', fontStyle: 'italic' }),
      ]}]),
      row('100', [{ width: '100%', blocks: [
        b('text',    { text: '🎁  VOTRE CADEAU' }, { textAlign: 'center', fontSize: '11px', fontWeight: 'bold', color: '#7c3aed', padding: '25px 10px 5px', letterSpacing: '2.5px' }),
        b('heading', { text: '-30%' }, { textAlign: 'center', fontSize: '64px', fontWeight: 'bold', color: '#7c3aed', padding: '5px 10px 5px' }),
        b('text',    { text: 'sur votre prochaine commande' }, { textAlign: 'center', fontSize: '14px', color: '#64748b', padding: '0 10px 18px' }),
        b('heading', { text: 'BDAY30' }, { textAlign: 'center', fontSize: '22px', fontWeight: 'bold', padding: '0 10px 8px', color: '#0f172a', letterSpacing: '5px' }),
        b('text',    { text: 'Valable 7 jours · Sans minimum d\'achat' }, { textAlign: 'center', fontSize: '12px', color: '#94a3b8', padding: '0 10px 20px' }),
        b('button',  { text: '🎂 Utiliser mon cadeau', href: '#' }, { textAlign: 'center', padding: '5px 10px 30px', backgroundColor: '#7c3aed' }),
      ]}], { backgroundColor: '#faf5ff' }),
      row('100', [{ width: '100%', blocks: [
        b('text', { text: 'Encore une fois, joyeux anniversaire ! 🥳\nQue cette nouvelle année vous apporte plein de bonheur.' }, { textAlign: 'center', fontSize: '14px', color: '#475569', padding: '25px 30px 25px', lineHeight: '1.8', fontStyle: 'italic' }),
      ]}]),
      ...footerBlock('VOTRE MARQUE', '#7c3aed'),
    ],
  },

  {
    id: 'programme-fidelite',
    name: 'Programme fidélité',
    description: 'Tableau de bord points + niveaux + récompenses',
    category: 'reengagement',
    subject: '⭐ Votre récap fidélité — Vous êtes Gold !',
    rows: () => [
      preheader('Vos points, votre niveau, vos récompenses disponibles.'),
      row('100', [{ width: '100%', blocks: [
        b('text',    { text: '⭐ PROGRAMME FIDÉLITÉ' }, { textAlign: 'center', color: '#fbbf24', fontSize: '12px', fontWeight: 'bold', padding: '20px 10px 5px', letterSpacing: '2.5px' }),
        b('heading', { text: 'Votre statut Gold' }, { textAlign: 'center', color: '#ffffff', fontSize: '26px', fontWeight: 'bold', padding: '5px 10px 22px' }),
      ]}], { backgroundColor: '#0f172a' }),
      row('33-33-33', [
        { width: '33.33%', blocks: [
          b('heading', { text: '1 240' }, { textAlign: 'center', fontSize: '32px', fontWeight: 'bold', color: '#b45309', padding: '20px 10px 0' }),
          b('text',    { text: 'POINTS' }, { textAlign: 'center', fontSize: '10px', fontWeight: 'bold', color: '#94a3b8', padding: '5px 10px 20px', letterSpacing: '2px' }),
        ]},
        { width: '33.33%', blocks: [
          b('heading', { text: 'Gold' }, { textAlign: 'center', fontSize: '32px', fontWeight: 'bold', color: '#b45309', padding: '20px 10px 0' }),
          b('text',    { text: 'NIVEAU' }, { textAlign: 'center', fontSize: '10px', fontWeight: 'bold', color: '#94a3b8', padding: '5px 10px 20px', letterSpacing: '2px' }),
        ]},
        { width: '33.33%', blocks: [
          b('heading', { text: '260' }, { textAlign: 'center', fontSize: '32px', fontWeight: 'bold', color: '#b45309', padding: '20px 10px 0' }),
          b('text',    { text: 'AVANT PLATINUM' }, { textAlign: 'center', fontSize: '10px', fontWeight: 'bold', color: '#94a3b8', padding: '5px 10px 20px', letterSpacing: '2px' }),
        ]},
      ], { backgroundColor: '#fef3c7' }),
      row('100', [{ width: '100%', blocks: [
        b('text',    { text: 'PROCHAINE RÉCOMPENSE' }, { textAlign: 'center', fontSize: '11px', fontWeight: 'bold', color: '#b45309', padding: '25px 10px 5px', letterSpacing: '2px' }),
        b('heading', { text: 'Plus que 260 points' }, { textAlign: 'center', fontSize: '22px', fontWeight: 'bold', padding: '0 30px 5px' }),
        b('text',    { text: 'pour atteindre le niveau Platinum et débloquer livraison express gratuite + 2× les points sur tous vos achats !' }, { textAlign: 'center', fontSize: '14px', color: '#64748b', padding: '0 30px 25px', lineHeight: '1.6' }),
      ]}]),
      row('100', [{ width: '100%', blocks: [
        b('text', { text: 'VOS AVANTAGES GOLD' }, { textAlign: 'center', fontSize: '11px', fontWeight: 'bold', color: '#b45309', padding: '20px 10px 12px', letterSpacing: '2px' }),
      ]}]),
      row('33-33-33', [
        { width: '33.33%', blocks: [
          b('text', { text: '🎁' }, { textAlign: 'center', fontSize: '28px', padding: '0 10px 5px' }),
          b('text', { text: 'Cadeau\nd\'anniversaire' }, { textAlign: 'center', fontSize: '12px', fontWeight: 'bold', padding: '0 10px 5px', lineHeight: '1.5' }),
          b('text', { text: 'Disponible' }, { textAlign: 'center', fontSize: '10px', color: '#16a34a', padding: '0 10px 18px' }),
        ]},
        { width: '33.33%', blocks: [
          b('text', { text: '🚚' }, { textAlign: 'center', fontSize: '28px', padding: '0 10px 5px' }),
          b('text', { text: 'Livraison\noffert > 30€' }, { textAlign: 'center', fontSize: '12px', fontWeight: 'bold', padding: '0 10px 5px', lineHeight: '1.5' }),
          b('text', { text: 'Disponible' }, { textAlign: 'center', fontSize: '10px', color: '#16a34a', padding: '0 10px 18px' }),
        ]},
        { width: '33.33%', blocks: [
          b('text', { text: '⏰' }, { textAlign: 'center', fontSize: '28px', padding: '0 10px 5px' }),
          b('text', { text: 'Accès en\navant-première' }, { textAlign: 'center', fontSize: '12px', fontWeight: 'bold', padding: '0 10px 5px', lineHeight: '1.5' }),
          b('text', { text: 'Disponible' }, { textAlign: 'center', fontSize: '10px', color: '#16a34a', padding: '0 10px 18px' }),
        ]},
      ]),
      row('100', [{ width: '100%', blocks: [
        b('button', { text: 'Voir mes récompenses →', href: '#' }, { textAlign: 'center', padding: '20px 10px 25px', backgroundColor: '#b45309' }),
      ]}]),
      ...footerBlock('VOTRE MARQUE', '#b45309'),
    ],
  },

  // ── B2B / PROFESSIONNEL ────────────────────────────────────────────────────
  {
    id: 'prospection-b2b',
    name: 'Email de prospection',
    description: 'Cold outreach pro avec preuve sociale + CTA',
    category: 'b2b',
    subject: 'Question rapide sur [Entreprise]',
    rows: () => [
      preheader("3 minutes pour découvrir comment économiser 20% de votre temps."),
      row('100', [{ width: '100%', blocks: [
        b('text',    { text: 'Bonjour [Prénom],' }, { fontSize: '17px', padding: '30px 30px 12px' }),
        b('text',    { text: 'Je me permets de vous contacter car j\'ai vu que [Entreprise] travaille sur [sujet pertinent]. Nous accompagnons des sociétés similaires — comme [Client A] et [Client B] — à atteindre [résultat mesurable] en quelques semaines.' }, { fontSize: '15px', color: '#475569', padding: '0 30px 20px', lineHeight: '1.7' }),
      ]}]),
      row('100', [{ width: '100%', blocks: [
        b('text', { text: 'NOS RÉSULTATS POUR DES ENTREPRISES COMME LA VÔTRE' }, { textAlign: 'center', fontSize: '10px', fontWeight: 'bold', color: '#475569', padding: '20px 10px 12px', letterSpacing: '1.5px' }),
      ]}], { backgroundColor: '#f8fafc' }),
      row('33-33-33', [
        { width: '33.33%', blocks: [
          b('heading', { text: '+45%' }, { textAlign: 'center', fontSize: '28px', fontWeight: 'bold', color: '#475569', padding: '0 10px 0' }),
          b('text',    { text: 'de productivité' }, { textAlign: 'center', fontSize: '12px', color: '#64748b', padding: '5px 10px 20px' }),
        ]},
        { width: '33.33%', blocks: [
          b('heading', { text: '−30%' }, { textAlign: 'center', fontSize: '28px', fontWeight: 'bold', color: '#475569', padding: '0 10px 0' }),
          b('text',    { text: 'de coûts' }, { textAlign: 'center', fontSize: '12px', color: '#64748b', padding: '5px 10px 20px' }),
        ]},
        { width: '33.33%', blocks: [
          b('heading', { text: '+200' }, { textAlign: 'center', fontSize: '28px', fontWeight: 'bold', color: '#475569', padding: '0 10px 0' }),
          b('text',    { text: 'clients satisfaits' }, { textAlign: 'center', fontSize: '12px', color: '#64748b', padding: '5px 10px 20px' }),
        ]},
      ], { backgroundColor: '#f8fafc' }),
      row('100', [{ width: '100%', blocks: [
        b('text',    { text: 'Concrètement, voici ce que nous pourrions faire pour vous :' }, { fontSize: '15px', padding: '25px 30px 10px' }),
        b('text',    { text: '✓  Diagnostic gratuit de votre process actuel\n✓  Plan d\'action personnalisé en 48h\n✓  Mise en place sans interruption de service' }, { fontSize: '14px', color: '#475569', padding: '0 35px 20px', lineHeight: '2.2' }),
      ]}]),
      row('100', [{ width: '100%', blocks: [
        b('text',    { text: 'Êtes-vous disponible pour un échange de 20 minutes la semaine prochaine ?' }, { fontSize: '15px', padding: '0 30px 15px', lineHeight: '1.6' }),
        b('button',  { text: '📅 Réserver un créneau', href: '#' }, { textAlign: 'left', padding: '0 30px 25px', backgroundColor: '#475569' }),
      ]}]),
      row('100', [{ width: '100%', blocks: [b('divider', undefined, { borderColor: '#e2e8f0', padding: '0 30px' })] }]),
      row('100', [{ width: '100%', blocks: [
        b('signature', { name: 'Prénom NOM', title: 'Business Developer · Votre Marque\ncontact@example.com · +33 6 XX XX XX XX' }),
      ]}], { padding: '0 30px 30px' }),
      ...footerBlock('VOTRE MARQUE', '#475569'),
    ],
  },

  {
    id: 'rapport-mensuel',
    name: 'Rapport mensuel',
    description: 'Dashboard pro avec KPIs + insights + actions',
    category: 'b2b',
    subject: '📊 Votre rapport mensuel — Mai 2026',
    rows: () => [
      preheader('Vos performances, vos KPIs et nos recommandations.'),
      row('100', [{ width: '100%', blocks: [
        b('text',    { text: 'RAPPORT MENSUEL' }, { textAlign: 'center', color: '#94a3b8', fontSize: '11px', fontWeight: 'bold', padding: '20px 10px 5px', letterSpacing: '3px' }),
        b('heading', { text: 'Mai 2026' }, { textAlign: 'center', color: '#ffffff', fontSize: '32px', fontWeight: 'bold', padding: '0 10px 22px' }),
      ]}], { backgroundColor: '#0f172a' }),
      row('100', [{ width: '100%', blocks: [
        b('heading', { text: 'Bonjour [Prénom],' }, { fontSize: '18px', fontWeight: 'bold', padding: '25px 30px 8px' }),
        b('text',    { text: 'Voici le récapitulatif de vos performances pour le mois de mai. Excellent mois, on continue !' }, { fontSize: '14px', color: '#64748b', padding: '0 30px 20px', lineHeight: '1.7' }),
      ]}]),
      row('100', [{ width: '100%', blocks: [
        b('text', { text: 'INDICATEURS CLÉS' }, { textAlign: 'center', fontSize: '11px', fontWeight: 'bold', color: '#475569', padding: '15px 10px 12px', letterSpacing: '2px' }),
      ]}], { backgroundColor: '#f8fafc' }),
      row('33-33-33', [
        { width: '33.33%', blocks: [
          b('heading', { text: '1 284' }, { textAlign: 'center', fontSize: '30px', fontWeight: 'bold', color: '#2563eb', padding: '0 10px 0' }),
          b('text',    { text: 'Visiteurs uniques' }, { textAlign: 'center', fontSize: '11px', color: '#64748b', padding: '4px 10px 4px' }),
          b('text',    { text: '↑ +12% vs avril' }, { textAlign: 'center', fontSize: '10px', fontWeight: 'bold', color: '#16a34a', padding: '0 10px 20px' }),
        ]},
        { width: '33.33%', blocks: [
          b('heading', { text: '4,2/5' }, { textAlign: 'center', fontSize: '30px', fontWeight: 'bold', color: '#2563eb', padding: '0 10px 0' }),
          b('text',    { text: 'Satisfaction client' }, { textAlign: 'center', fontSize: '11px', color: '#64748b', padding: '4px 10px 4px' }),
          b('text',    { text: '↑ +0,3 vs avril' }, { textAlign: 'center', fontSize: '10px', fontWeight: 'bold', color: '#16a34a', padding: '0 10px 20px' }),
        ]},
        { width: '33.33%', blocks: [
          b('heading', { text: '98,7%' }, { textAlign: 'center', fontSize: '30px', fontWeight: 'bold', color: '#2563eb', padding: '0 10px 0' }),
          b('text',    { text: 'Disponibilité' }, { textAlign: 'center', fontSize: '11px', color: '#64748b', padding: '4px 10px 4px' }),
          b('text',    { text: '⚠ Objectif : 99%' }, { textAlign: 'center', fontSize: '10px', fontWeight: 'bold', color: '#f59e0b', padding: '0 10px 20px' }),
        ]},
      ], { backgroundColor: '#f8fafc' }),
      row('100', [{ width: '100%', blocks: [
        b('text',    { text: 'POINTS CLÉS DU MOIS' }, { fontSize: '11px', fontWeight: 'bold', color: '#475569', padding: '25px 30px 8px', letterSpacing: '2px' }),
        b('heading', { text: 'Ce qui a marqué le mois' }, { fontSize: '20px', fontWeight: 'bold', padding: '0 30px 12px' }),
        b('text',    { text: '✅  Lancement réussi de la fonctionnalité X (+18% d\'utilisation)\n✅  Migration cloud finalisée — gain de 35% en performance\n⚠️  Pic d\'erreurs le 14 mai — résolu en 2h\n📈  Nouveau record de conversion : 4,8% sur les pages produits' }, { fontSize: '14px', color: '#475569', padding: '0 35px 25px', lineHeight: '2.2' }),
      ]}]),
      row('100', [{ width: '100%', blocks: [
        b('heading', { text: '🎯 Recommandations pour juin' }, { fontSize: '15px', fontWeight: 'bold', padding: '20px 30px 8px' }),
        b('text',    { text: '1. Optimiser la disponibilité pour atteindre l\'objectif 99%\n2. Continuer l\'investissement sur les pages produits\n3. Étendre la fonctionnalité X aux comptes premium' }, { fontSize: '14px', color: '#475569', padding: '0 35px 20px', lineHeight: '2' }),
      ]}], { backgroundColor: '#eff6ff' }),
      row('100', [{ width: '100%', blocks: [
        b('button', { text: '📥 Télécharger le rapport complet (PDF)', href: '#' }, { textAlign: 'center', padding: '20px 10px 25px' }),
      ]}]),
      ...footerBlock('VOTRE MARQUE', '#0f172a'),
    ],
  },

  {
    id: 'suivi-client',
    name: 'Suivi client',
    description: 'Email de suivi avec status projet + timeline',
    category: 'b2b',
    subject: 'Suivi de votre projet — Point de la semaine',
    rows: () => [
      preheader("Récap des avancées et prochaines étapes."),
      row('100', [{ width: '100%', blocks: [
        b('text',    { text: 'Bonjour [Prénom],' }, { fontSize: '17px', padding: '30px 30px 10px' }),
        b('text',    { text: 'J\'espère que vous allez bien. Je voulais faire un point avec vous sur l\'avancement de votre projet et nos prochaines étapes ensemble.' }, { fontSize: '15px', color: '#475569', padding: '0 30px 20px', lineHeight: '1.7' }),
      ]}]),
      row('100', [{ width: '100%', blocks: [
        b('text', { text: 'STATUT DU PROJET' }, { textAlign: 'center', fontSize: '11px', fontWeight: 'bold', color: '#475569', padding: '15px 10px 5px', letterSpacing: '2px' }),
        b('heading', { text: 'Bien parti — 60% complété' }, { textAlign: 'center', fontSize: '20px', fontWeight: 'bold', padding: '0 10px 18px', color: '#16a34a' }),
        bTable(
          ['Action', 'Statut', 'Échéance'],
          [
            ['Cadrage & spécifications', '✅ Terminé', '15/04/2026'],
            ['Maquettes UI/UX', '✅ Terminé', '30/04/2026'],
            ['Développement Backend', '🚧 En cours (75%)', '15/05/2026'],
            ['Développement Frontend', '🚧 En cours (40%)', '01/06/2026'],
            ['Tests & QA', '📅 Planifié', '15/06/2026'],
            ['Mise en production', '📅 Planifié', '30/06/2026'],
          ],
        ),
      ]}], { backgroundColor: '#f8fafc' }),
      row('100', [{ width: '100%', blocks: [
        b('heading', { text: '🎯 Prochaines étapes' }, { fontSize: '16px', fontWeight: 'bold', padding: '25px 30px 8px' }),
        b('text',    { text: '• Validation du module de paiement (cette semaine)\n• Intégration de l\'API tierce (semaine prochaine)\n• Point d\'avancement bi-mensuel : vendredi à 10h' }, { fontSize: '14px', color: '#475569', padding: '0 35px 25px', lineHeight: '2' }),
      ]}]),
      row('100', [{ width: '100%', blocks: [
        b('text',    { text: 'N\'hésitez pas à me contacter si vous avez des questions ou des retours sur les éléments en cours.' }, { fontSize: '14px', padding: '15px 30px 15px', lineHeight: '1.7' }),
        b('button',  { text: 'Répondre à cet email', href: '#' }, { textAlign: 'left', padding: '0 30px 10px', backgroundColor: '#475569' }),
        b('button',  { text: '📅 Planifier un point', href: '#' }, { textAlign: 'left', padding: '0 30px 25px', backgroundColor: '#ffffff', color: '#475569', borderSize: '1px', borderColor: '#475569' }),
      ]}]),
      row('100', [{ width: '100%', blocks: [b('divider', undefined, { borderColor: '#e2e8f0', padding: '0 30px' })] }]),
      row('100', [{ width: '100%', blocks: [
        b('signature', { name: 'Prénom NOM', title: 'Chef de projet · Votre Marque\nProjet [Nom] · +33 6 XX XX XX XX' }),
      ]}], { padding: '0 30px 30px' }),
      ...footerBlock('VOTRE MARQUE', '#475569'),
    ],
  },
];
