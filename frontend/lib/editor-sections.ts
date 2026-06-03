import { Row, RowLayout, BlockType, BlockData, DEFAULT_BLOCK_CONTENT } from './editor-types';
import { v4 as uuid } from 'uuid';

// Helper to create a block with defaults
function b(type: string, content?: Record<string, string>, styles?: Record<string, string>): BlockData {
  const defaults = DEFAULT_BLOCK_CONTENT[type as keyof typeof DEFAULT_BLOCK_CONTENT];
  return {
    id: uuid(),
    type: type as BlockType,
    content: { ...(defaults?.content || {}), ...content } as Record<string, string | string[] | string[][]>,
    styles: { ...(defaults?.styles || {}), ...styles } as Record<string, string>,
  };
}

function row(layout: RowLayout, columns: { width: string; blocks: ReturnType<typeof b>[] }[], styles?: Record<string, string>): Row {
  return {
    id: uuid(),
    layout,
    columns: columns.map(c => ({ id: uuid(), width: c.width, blocks: c.blocks })),
    styles: { backgroundColor: 'transparent', padding: '10px 0', ...styles },
  };
}

// Visual layout descriptor for mini preview rendering
// Each row is an array of cells, each cell has a type and width percentage
export type CellType = 'img' | 'title' | 'text' | 'btn' | 'divider' | 'empty';
export interface LayoutRow {
  cells: { type: CellType; w: number; src?: string }[];
}

// Pool of real HD stock images from MinIO (Pexels collection)
const MINIO = (process.env.NEXT_PUBLIC_MINIO_URL ?? 'http://localhost:9000') + '/stock-images';
const P = (id: number) => `${MINIO}/pexels_${id}.jpg`;

// Curated image pools per theme
const IMG = {
  business:  [P(23496880), P(7793118),  P(36766707), P(7433828),  P(7109288),  P(34823909)],
  people:    [P(15862623), P(13418642), P(6279104),  P(30968491), P(9630181),  P(37028207)],
  nature:    [P(34559690), P(8021347),  P(37019808), P(36574411), P(37001458), P(37044385)],
  food:      [P(37048263), P(6089623),  P(9315),     P(36984979), P(5951160),  P(1484516)],
  tech:      [P(1181318),  P(19226354), P(4389462),  P(8033087),  P(4976712),  P(34803988)],
  shopping:  [P(6207749),  P(1267310),  P(3294472),  P(6567204),  P(13573923), P(17710109)],
  team:      [P(5466283),  P(8067773),  P(23496866), P(3184301),  P(20719271), P(35466549)],
  health:    [P(34852961), P(36764412), P(30191517), P(30677591), P(7615564),  P(8933575)],
  travel:    [P(34432816), P(28841420), P(30516943), P(36521427), P(16705978), P(4881125)],
  abstract:  [P(247671),   P(7135020),  P(17605562), P(7256104),  P(5625008),  P(7828666)],
};

// Pick image by section index — spreads nicely across the pool
const pick = (pool: string[], i = 0) => pool[i % pool.length];

export interface SectionDef {
  id: string;
  name: string;
  category: 'text-image' | 'text' | 'images';
  preview: string; // Fallback text
  layout: LayoutRow[]; // Visual layout for mini preview
  rows: () => Row[]; // Function so each insertion gets fresh UUIDs
}

export const SECTION_CATEGORIES = [
  { id: 'text-image', label: 'Textes et images', icon: '📄' },
  { id: 'text', label: 'Textes', icon: '📝' },
  { id: 'images', label: 'Images', icon: '🖼️' },
];

export const SECTIONS: SectionDef[] = [
  // ═══════════════════════════════
  // TEXTES ET IMAGES
  // ═══════════════════════════════
  {
    id: 'ti-1',
    name: 'Image + Titre + Texte + Bouton',
    category: 'text-image',
    preview: '🖼️\n━━━\n𝗧𝗶𝘁𝗿𝗲\n━━━\nTexte\n━━━\n[Bouton]',
    layout: [{ cells: [{ type: 'img', w: 100, src: pick(IMG.business, 0) }] }, { cells: [{ type: 'title', w: 100 }] }, { cells: [{ type: 'text', w: 100 }] }, { cells: [{ type: 'btn', w: 100 }] }],
    rows: () => [
      row('100', [{ width: '100%', blocks: [b('image', { src: pick(IMG.business, 0), alt: 'Image' })] }]),
      row('100', [{ width: '100%', blocks: [b('heading', { text: 'Votre titre ici' })] }]),
      row('100', [{ width: '100%', blocks: [b('text', { text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.' })] }]),
      row('100', [{ width: '100%', blocks: [b('button', { text: 'En savoir plus', href: '#' })] }]),
    ],
  },
  {
    id: 'ti-2',
    name: 'Image | Titre + Texte + Bouton',
    category: 'text-image',
    preview: '🖼️ | 𝗧𝗶𝘁𝗿𝗲\n    | Texte\n    | [Bouton]',
    layout: [{ cells: [{ type: 'img', w: 50, src: pick(IMG.people, 0) }, { type: 'title', w: 50 }] }, { cells: [{ type: 'empty', w: 50 }, { type: 'text', w: 50 }] }, { cells: [{ type: 'empty', w: 50 }, { type: 'btn', w: 50 }] }],
    rows: () => [
      row('50-50', [
        { width: '50%', blocks: [b('image', { src: pick(IMG.people, 0), alt: 'Image' }, { width: '100%' })] },
        { width: '50%', blocks: [
          b('heading', { text: 'Titre' }),
          b('text', { text: 'Description du contenu ici.' }),
          b('button', { text: 'Découvrir', href: '#' }),
        ]},
      ]),
    ],
  },
  {
    id: 'ti-3',
    name: 'Titre + Texte + Bouton | Image',
    category: 'text-image',
    preview: '𝗧𝗶𝘁𝗿𝗲  | 🖼️\nTexte  |\n[Bouton]|',
    layout: [{ cells: [{ type: 'title', w: 50 }, { type: 'img', w: 50, src: pick(IMG.business, 1) }] }, { cells: [{ type: 'text', w: 50 }, { type: 'empty', w: 50 }] }, { cells: [{ type: 'btn', w: 50 }, { type: 'empty', w: 50 }] }],
    rows: () => [
      row('50-50', [
        { width: '50%', blocks: [
          b('heading', { text: 'Titre' }),
          b('text', { text: 'Description du contenu ici.' }),
          b('button', { text: 'Découvrir', href: '#' }),
        ]},
        { width: '50%', blocks: [b('image', { src: pick(IMG.business, 1), alt: 'Image' }, { width: '100%' })] },
      ]),
    ],
  },
  {
    id: 'ti-4',
    name: '3 colonnes: Image + Titre + Texte + CTA',
    category: 'text-image',
    preview: '🖼️|🖼️|🖼️\n𝗧 | 𝗧 | 𝗧\ntxt|txt|txt\n[•]|[•]|[•]',
    layout: [{ cells: [{ type: 'img', w: 33, src: pick(IMG.team, 0) }, { type: 'img', w: 33, src: pick(IMG.tech, 0) }, { type: 'img', w: 33, src: pick(IMG.shopping, 0) }] }, { cells: [{ type: 'title', w: 33 }, { type: 'title', w: 33 }, { type: 'title', w: 33 }] }, { cells: [{ type: 'text', w: 33 }, { type: 'text', w: 33 }, { type: 'text', w: 33 }] }, { cells: [{ type: 'btn', w: 33 }, { type: 'btn', w: 33 }, { type: 'btn', w: 33 }] }],
    rows: () => [
      row('33-33-33', [
        { width: '33.33%', blocks: [
          b('image', { src: pick(IMG.team, 0), alt: '' }, { width: '100%' }),
          b('heading', { text: 'Titre 1' }, { fontSize: '18px' }),
          b('text', { text: 'Description courte.' }, { fontSize: '14px' }),
          b('button', { text: 'Action', href: '#' }),
        ]},
        { width: '33.33%', blocks: [
          b('image', { src: pick(IMG.tech, 0), alt: '' }, { width: '100%' }),
          b('heading', { text: 'Titre 2' }, { fontSize: '18px' }),
          b('text', { text: 'Description courte.' }, { fontSize: '14px' }),
          b('button', { text: 'Action', href: '#' }),
        ]},
        { width: '33.33%', blocks: [
          b('image', { src: pick(IMG.shopping, 0), alt: '' }, { width: '100%' }),
          b('heading', { text: 'Titre 3' }, { fontSize: '18px' }),
          b('text', { text: 'Description courte.' }, { fontSize: '14px' }),
          b('button', { text: 'Action', href: '#' }),
        ]},
      ]),
    ],
  },
  {
    id: 'ti-5',
    name: 'Image | Titre + Sous-titre + Texte',
    category: 'text-image',
    preview: '🖼️ | 𝗧𝗶𝘁𝗿𝗲\n    | sous-titre\n    | texte',
    layout: [{ cells: [{ type: 'img', w: 50, src: pick(IMG.people, 1) }, { type: 'title', w: 50 }] }, { cells: [{ type: 'empty', w: 50 }, { type: 'title', w: 50 }] }, { cells: [{ type: 'empty', w: 50 }, { type: 'text', w: 50 }] }],
    rows: () => [
      row('50-50', [
        { width: '50%', blocks: [b('image', { src: pick(IMG.people, 1), alt: 'Image' }, { width: '100%' })] },
        { width: '50%', blocks: [
          b('heading', { text: 'Titre principal' }),
          b('heading', { text: 'Sous-titre' }, { fontSize: '16px', fontWeight: 'normal', color: '#666666' }),
          b('text', { text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor.' }),
        ]},
      ]),
    ],
  },

  // ═══════════════════════════════
  // TEXTES
  // ═══════════════════════════════
  {
    id: 't-1',
    name: 'Titre + Sous-titre + Texte',
    category: 'text',
    preview: '𝗧𝗶𝘁𝗿𝗲\n━━━\nSous-titre\n━━━\nTexte',
    layout: [{ cells: [{ type: 'title', w: 100 }] }, { cells: [{ type: 'title', w: 100 }] }, { cells: [{ type: 'text', w: 100 }] }],
    rows: () => [
      row('100', [{ width: '100%', blocks: [
        b('heading', { text: 'Titre' }),
        b('heading', { text: 'Sous-titre' }, { fontSize: '16px', fontWeight: 'normal', color: '#666' }),
        b('text', { text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.' }),
      ]}]),
    ],
  },
  {
    id: 't-2',
    name: '2 colonnes: Titre + Texte',
    category: 'text',
    preview: '𝗧𝗶𝘁𝗿𝗲 | 𝗧𝗶𝘁𝗿𝗲\ntexte | texte',
    layout: [{ cells: [{ type: 'title', w: 50 }, { type: 'title', w: 50 }] }, { cells: [{ type: 'text', w: 50 }, { type: 'text', w: 50 }] }],
    rows: () => [
      row('50-50', [
        { width: '50%', blocks: [
          b('heading', { text: 'Titre gauche' }),
          b('text', { text: 'Description du contenu à gauche.' }),
        ]},
        { width: '50%', blocks: [
          b('heading', { text: 'Titre droite' }),
          b('text', { text: 'Description du contenu à droite.' }),
        ]},
      ]),
    ],
  },
  {
    id: 't-3',
    name: 'Texte + Titre',
    category: 'text',
    preview: 'Texte\n━━━\n𝗧𝗶𝘁𝗿𝗲',
    layout: [{ cells: [{ type: 'text', w: 100 }] }, { cells: [{ type: 'title', w: 100 }] }],
    rows: () => [
      row('100', [{ width: '100%', blocks: [
        b('text', { text: 'Lorem ipsum dolor sit amet.' }),
        b('heading', { text: 'Titre en dessous' }),
      ]}]),
    ],
  },
  {
    id: 't-4',
    name: '3 colonnes: Titre + Texte',
    category: 'text',
    preview: '𝗧 | 𝗧 | 𝗧\ntxt|txt|txt',
    layout: [{ cells: [{ type: 'title', w: 33 }, { type: 'title', w: 33 }, { type: 'title', w: 33 }] }, { cells: [{ type: 'text', w: 33 }, { type: 'text', w: 33 }, { type: 'text', w: 33 }] }],
    rows: () => [
      row('33-33-33', [
        { width: '33.33%', blocks: [b('heading', { text: 'Titre 1' }, { fontSize: '18px' }), b('text', { text: 'Description courte.' }, { fontSize: '14px' })] },
        { width: '33.33%', blocks: [b('heading', { text: 'Titre 2' }, { fontSize: '18px' }), b('text', { text: 'Description courte.' }, { fontSize: '14px' })] },
        { width: '33.33%', blocks: [b('heading', { text: 'Titre 3' }, { fontSize: '18px' }), b('text', { text: 'Description courte.' }, { fontSize: '14px' })] },
      ]),
    ],
  },
  {
    id: 't-5',
    name: '4 colonnes avec séparateurs',
    category: 'text',
    preview: '𝗧|𝗧|𝗧|𝗧\ntxt|txt|txt|txt\n---|---|---|---\n𝗧|𝗧|𝗧|𝗧\ntxt|txt|txt|txt',
    layout: [{ cells: [{ type: 'title', w: 25 }, { type: 'title', w: 25 }, { type: 'title', w: 25 }, { type: 'title', w: 25 }] }, { cells: [{ type: 'text', w: 25 }, { type: 'text', w: 25 }, { type: 'text', w: 25 }, { type: 'text', w: 25 }] }, { cells: [{ type: 'divider', w: 100 }] }, { cells: [{ type: 'title', w: 25 }, { type: 'title', w: 25 }, { type: 'title', w: 25 }, { type: 'title', w: 25 }] }, { cells: [{ type: 'text', w: 25 }, { type: 'text', w: 25 }, { type: 'text', w: 25 }, { type: 'text', w: 25 }] }],
    rows: () => [
      row('25-25-25-25', [
        { width: '25%', blocks: [b('heading', { text: 'Titre' }, { fontSize: '16px' }), b('text', { text: 'Texte' }, { fontSize: '13px' })] },
        { width: '25%', blocks: [b('heading', { text: 'Titre' }, { fontSize: '16px' }), b('text', { text: 'Texte' }, { fontSize: '13px' })] },
        { width: '25%', blocks: [b('heading', { text: 'Titre' }, { fontSize: '16px' }), b('text', { text: 'Texte' }, { fontSize: '13px' })] },
        { width: '25%', blocks: [b('heading', { text: 'Titre' }, { fontSize: '16px' }), b('text', { text: 'Texte' }, { fontSize: '13px' })] },
      ]),
      row('100', [{ width: '100%', blocks: [b('divider')] }]),
      row('25-25-25-25', [
        { width: '25%', blocks: [b('heading', { text: 'Titre' }, { fontSize: '16px' }), b('text', { text: 'Texte' }, { fontSize: '13px' })] },
        { width: '25%', blocks: [b('heading', { text: 'Titre' }, { fontSize: '16px' }), b('text', { text: 'Texte' }, { fontSize: '13px' })] },
        { width: '25%', blocks: [b('heading', { text: 'Titre' }, { fontSize: '16px' }), b('text', { text: 'Texte' }, { fontSize: '13px' })] },
        { width: '25%', blocks: [b('heading', { text: 'Titre' }, { fontSize: '16px' }), b('text', { text: 'Texte' }, { fontSize: '13px' })] },
      ]),
    ],
  },

  // ═══════════════════════════════
  // IMAGES
  // ═══════════════════════════════
  {
    id: 'i-1',
    name: '2 images côte à côte',
    category: 'images',
    preview: '🖼️ | 🖼️',
    layout: [{ cells: [{ type: 'img', w: 50, src: pick(IMG.nature, 0) }, { type: 'img', w: 50, src: pick(IMG.nature, 1) }] }],
    rows: () => [
      row('50-50', [
        { width: '50%', blocks: [b('image', { src: pick(IMG.nature, 0), alt: '' }, { width: '100%' })] },
        { width: '50%', blocks: [b('image', { src: pick(IMG.nature, 1), alt: '' }, { width: '100%' })] },
      ]),
    ],
  },
  {
    id: 'i-2',
    name: '2x2 grille d\'images',
    category: 'images',
    preview: '🖼️|🖼️\n🖼️|🖼️',
    layout: [{ cells: [{ type: 'img', w: 50, src: pick(IMG.travel, 0) }, { type: 'img', w: 50, src: pick(IMG.travel, 1) }] }, { cells: [{ type: 'img', w: 50, src: pick(IMG.travel, 2) }, { type: 'img', w: 50, src: pick(IMG.travel, 3) }] }],
    rows: () => [
      row('50-50', [
        { width: '50%', blocks: [b('image', { src: pick(IMG.travel, 0), alt: '' }, { width: '100%' })] },
        { width: '50%', blocks: [b('image', { src: pick(IMG.travel, 1), alt: '' }, { width: '100%' })] },
      ]),
      row('50-50', [
        { width: '50%', blocks: [b('image', { src: pick(IMG.travel, 2), alt: '' }, { width: '100%' })] },
        { width: '50%', blocks: [b('image', { src: pick(IMG.travel, 3), alt: '' }, { width: '100%' })] },
      ]),
    ],
  },
  {
    id: 'i-3',
    name: '4 images en ligne',
    category: 'images',
    preview: '🖼️|🖼️|🖼️|🖼️',
    layout: [{ cells: [{ type: 'img', w: 25, src: pick(IMG.abstract, 0) }, { type: 'img', w: 25, src: pick(IMG.abstract, 1) }, { type: 'img', w: 25, src: pick(IMG.abstract, 2) }, { type: 'img', w: 25, src: pick(IMG.abstract, 3) }] }],
    rows: () => [
      row('25-25-25-25', [
        { width: '25%', blocks: [b('image', { src: pick(IMG.abstract, 0), alt: '' }, { width: '100%' })] },
        { width: '25%', blocks: [b('image', { src: pick(IMG.abstract, 1), alt: '' }, { width: '100%' })] },
        { width: '25%', blocks: [b('image', { src: pick(IMG.abstract, 2), alt: '' }, { width: '100%' })] },
        { width: '25%', blocks: [b('image', { src: pick(IMG.abstract, 3), alt: '' }, { width: '100%' })] },
      ]),
    ],
  },
  {
    id: 'i-4',
    name: '3 images en ligne',
    category: 'images',
    preview: '🖼️ | 🖼️ | 🖼️',
    layout: [{ cells: [{ type: 'img', w: 33, src: pick(IMG.food, 0) }, { type: 'img', w: 33, src: pick(IMG.food, 1) }, { type: 'img', w: 33, src: pick(IMG.food, 2) }] }],
    rows: () => [
      row('33-33-33', [
        { width: '33.33%', blocks: [b('image', { src: pick(IMG.food, 0), alt: '' }, { width: '100%' })] },
        { width: '33.33%', blocks: [b('image', { src: pick(IMG.food, 1), alt: '' }, { width: '100%' })] },
        { width: '33.33%', blocks: [b('image', { src: pick(IMG.food, 2), alt: '' }, { width: '100%' })] },
      ]),
    ],
  },
  {
    id: 'i-5',
    name: 'Grande image + 2 petites',
    category: 'images',
    preview: '🖼️  |🖼️\n     |🖼️',
    layout: [{ cells: [{ type: 'img', w: 50, src: pick(IMG.health, 0) }, { type: 'img', w: 50, src: pick(IMG.health, 1) }] }, { cells: [{ type: 'empty', w: 50 }, { type: 'img', w: 50, src: pick(IMG.health, 2) }] }],
    rows: () => [
      row('50-50', [
        { width: '50%', blocks: [b('image', { src: pick(IMG.health, 0), alt: '' }, { width: '100%' })] },
        { width: '50%', blocks: [
          b('image', { src: pick(IMG.health, 1), alt: '' }, { width: '100%' }),
          b('image', { src: pick(IMG.health, 2), alt: '' }, { width: '100%' }),
        ]},
      ]),
    ],
  },
  {
    id: 'i-6',
    name: '4x2 grille d\'images',
    category: 'images',
    preview: '🖼️|🖼️|🖼️|🖼️\n🖼️|🖼️|🖼️|🖼️',
    layout: [{ cells: [{ type: 'img', w: 25, src: pick(IMG.business, 2) }, { type: 'img', w: 25, src: pick(IMG.people, 2) }, { type: 'img', w: 25, src: pick(IMG.tech, 1) }, { type: 'img', w: 25, src: pick(IMG.shopping, 1) }] }, { cells: [{ type: 'img', w: 25, src: pick(IMG.team, 1) }, { type: 'img', w: 25, src: pick(IMG.nature, 2) }, { type: 'img', w: 25, src: pick(IMG.business, 3) }, { type: 'img', w: 25, src: pick(IMG.people, 3) }] }],
    rows: () => [
      row('25-25-25-25', [
        { width: '25%', blocks: [b('image', { src: pick(IMG.business, 2), alt: '' }, { width: '100%' })] },
        { width: '25%', blocks: [b('image', { src: pick(IMG.people, 2), alt: '' }, { width: '100%' })] },
        { width: '25%', blocks: [b('image', { src: pick(IMG.tech, 1), alt: '' }, { width: '100%' })] },
        { width: '25%', blocks: [b('image', { src: pick(IMG.shopping, 1), alt: '' }, { width: '100%' })] },
      ]),
      row('25-25-25-25', [
        { width: '25%', blocks: [b('image', { src: pick(IMG.team, 1), alt: '' }, { width: '100%' })] },
        { width: '25%', blocks: [b('image', { src: pick(IMG.nature, 2), alt: '' }, { width: '100%' })] },
        { width: '25%', blocks: [b('image', { src: pick(IMG.business, 3), alt: '' }, { width: '100%' })] },
        { width: '25%', blocks: [b('image', { src: pick(IMG.people, 3), alt: '' }, { width: '100%' })] },
      ]),
    ],
  },
];
