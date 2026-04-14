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

// Pool of real stock images from MinIO (picsum collection)
const MINIO = 'http://localhost:9000/stock-images';
const S = (id: number) => `${MINIO}/picsum_${String(id).padStart(4, '0')}.jpg`;

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
    layout: [{ cells: [{ type: 'img', w: 100, src: S(152) }] }, { cells: [{ type: 'title', w: 100 }] }, { cells: [{ type: 'text', w: 100 }] }, { cells: [{ type: 'btn', w: 100 }] }],
    rows: () => [
      row('100', [{ width: '100%', blocks: [b('image', { src: S(152), alt: 'Image' })] }]),
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
    layout: [{ cells: [{ type: 'img', w: 50, src: S(193) }, { type: 'title', w: 50 }] }, { cells: [{ type: 'empty', w: 50 }, { type: 'text', w: 50 }] }, { cells: [{ type: 'empty', w: 50 }, { type: 'btn', w: 50 }] }],
    rows: () => [
      row('50-50', [
        { width: '50%', blocks: [b('image', { src: S(193), alt: 'Image' }, { width: '100%' })] },
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
    layout: [{ cells: [{ type: 'title', w: 50 }, { type: 'img', w: 50, src: S(247) }] }, { cells: [{ type: 'text', w: 50 }, { type: 'empty', w: 50 }] }, { cells: [{ type: 'btn', w: 50 }, { type: 'empty', w: 50 }] }],
    rows: () => [
      row('50-50', [
        { width: '50%', blocks: [
          b('heading', { text: 'Titre' }),
          b('text', { text: 'Description du contenu ici.' }),
          b('button', { text: 'Découvrir', href: '#' }),
        ]},
        { width: '50%', blocks: [b('image', { src: S(247), alt: 'Image' }, { width: '100%' })] },
      ]),
    ],
  },
  {
    id: 'ti-4',
    name: '3 colonnes: Image + Titre + Texte + CTA',
    category: 'text-image',
    preview: '🖼️|🖼️|🖼️\n𝗧 | 𝗧 | 𝗧\ntxt|txt|txt\n[•]|[•]|[•]',
    layout: [{ cells: [{ type: 'img', w: 33, src: S(84) }, { type: 'img', w: 33, src: S(176) }, { type: 'img', w: 33, src: S(257) }] }, { cells: [{ type: 'title', w: 33 }, { type: 'title', w: 33 }, { type: 'title', w: 33 }] }, { cells: [{ type: 'text', w: 33 }, { type: 'text', w: 33 }, { type: 'text', w: 33 }] }, { cells: [{ type: 'btn', w: 33 }, { type: 'btn', w: 33 }, { type: 'btn', w: 33 }] }],
    rows: () => [
      row('33-33-33', [
        { width: '33.33%', blocks: [
          b('image', { src: S(84), alt: '' }, { width: '100%' }),
          b('heading', { text: 'Titre 1' }, { fontSize: '18px' }),
          b('text', { text: 'Description courte.' }, { fontSize: '14px' }),
          b('button', { text: 'Action', href: '#' }),
        ]},
        { width: '33.33%', blocks: [
          b('image', { src: S(176), alt: '' }, { width: '100%' }),
          b('heading', { text: 'Titre 2' }, { fontSize: '18px' }),
          b('text', { text: 'Description courte.' }, { fontSize: '14px' }),
          b('button', { text: 'Action', href: '#' }),
        ]},
        { width: '33.33%', blocks: [
          b('image', { src: S(257), alt: '' }, { width: '100%' }),
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
    layout: [{ cells: [{ type: 'img', w: 50, src: S(338) }, { type: 'title', w: 50 }] }, { cells: [{ type: 'empty', w: 50 }, { type: 'title', w: 50 }] }, { cells: [{ type: 'empty', w: 50 }, { type: 'text', w: 50 }] }],
    rows: () => [
      row('50-50', [
        { width: '50%', blocks: [b('image', { src: S(338), alt: 'Image' }, { width: '100%' })] },
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
    layout: [{ cells: [{ type: 'img', w: 50, src: S(400) }, { type: 'img', w: 50, src: S(450) }] }],
    rows: () => [
      row('50-50', [
        { width: '50%', blocks: [b('image', { src: S(400), alt: '' }, { width: '100%' })] },
        { width: '50%', blocks: [b('image', { src: S(450), alt: '' }, { width: '100%' })] },
      ]),
    ],
  },
  {
    id: 'i-2',
    name: '2x2 grille d\'images',
    category: 'images',
    preview: '🖼️|🖼️\n🖼️|🖼️',
    layout: [{ cells: [{ type: 'img', w: 50, src: S(500) }, { type: 'img', w: 50, src: S(550) }] }, { cells: [{ type: 'img', w: 50, src: S(600) }, { type: 'img', w: 50, src: S(650) }] }],
    rows: () => [
      row('50-50', [
        { width: '50%', blocks: [b('image', { src: S(500), alt: '' }, { width: '100%' })] },
        { width: '50%', blocks: [b('image', { src: S(550), alt: '' }, { width: '100%' })] },
      ]),
      row('50-50', [
        { width: '50%', blocks: [b('image', { src: S(600), alt: '' }, { width: '100%' })] },
        { width: '50%', blocks: [b('image', { src: S(650), alt: '' }, { width: '100%' })] },
      ]),
    ],
  },
  {
    id: 'i-3',
    name: '4 images en ligne',
    category: 'images',
    preview: '🖼️|🖼️|🖼️|🖼️',
    layout: [{ cells: [{ type: 'img', w: 25, src: S(11) }, { type: 'img', w: 25, src: S(54) }, { type: 'img', w: 25, src: S(110) }, { type: 'img', w: 25, src: S(162) }] }],
    rows: () => [
      row('25-25-25-25', [
        { width: '25%', blocks: [b('image', { src: S(11), alt: '' }, { width: '100%' })] },
        { width: '25%', blocks: [b('image', { src: S(54), alt: '' }, { width: '100%' })] },
        { width: '25%', blocks: [b('image', { src: S(110), alt: '' }, { width: '100%' })] },
        { width: '25%', blocks: [b('image', { src: S(162), alt: '' }, { width: '100%' })] },
      ]),
    ],
  },
  {
    id: 'i-4',
    name: '3 images en ligne',
    category: 'images',
    preview: '🖼️ | 🖼️ | 🖼️',
    layout: [{ cells: [{ type: 'img', w: 33, src: S(200) }, { type: 'img', w: 33, src: S(300) }, { type: 'img', w: 33, src: S(350) }] }],
    rows: () => [
      row('33-33-33', [
        { width: '33.33%', blocks: [b('image', { src: S(200), alt: '' }, { width: '100%' })] },
        { width: '33.33%', blocks: [b('image', { src: S(300), alt: '' }, { width: '100%' })] },
        { width: '33.33%', blocks: [b('image', { src: S(350), alt: '' }, { width: '100%' })] },
      ]),
    ],
  },
  {
    id: 'i-5',
    name: 'Grande image + 2 petites',
    category: 'images',
    preview: '🖼️  |🖼️\n     |🖼️',
    layout: [{ cells: [{ type: 'img', w: 50, src: S(700) }, { type: 'img', w: 50, src: S(755) }] }, { cells: [{ type: 'empty', w: 50 }, { type: 'img', w: 50, src: S(800) }] }],
    rows: () => [
      row('50-50', [
        { width: '50%', blocks: [b('image', { src: S(700), alt: '' }, { width: '100%' })] },
        { width: '50%', blocks: [
          b('image', { src: S(755), alt: '' }, { width: '100%' }),
          b('image', { src: S(800), alt: '' }, { width: '100%' }),
        ]},
      ]),
    ],
  },
  {
    id: 'i-6',
    name: '4x2 grille d\'images',
    category: 'images',
    preview: '🖼️|🖼️|🖼️|🖼️\n🖼️|🖼️|🖼️|🖼️',
    layout: [{ cells: [{ type: 'img', w: 25, src: S(50) }, { type: 'img', w: 25, src: S(100) }, { type: 'img', w: 25, src: S(150) }, { type: 'img', w: 25, src: S(220) }] }, { cells: [{ type: 'img', w: 25, src: S(270) }, { type: 'img', w: 25, src: S(320) }, { type: 'img', w: 25, src: S(370) }, { type: 'img', w: 25, src: S(420) }] }],
    rows: () => [
      row('25-25-25-25', [
        { width: '25%', blocks: [b('image', { src: S(50), alt: '' }, { width: '100%' })] },
        { width: '25%', blocks: [b('image', { src: S(100), alt: '' }, { width: '100%' })] },
        { width: '25%', blocks: [b('image', { src: S(150), alt: '' }, { width: '100%' })] },
        { width: '25%', blocks: [b('image', { src: S(220), alt: '' }, { width: '100%' })] },
      ]),
      row('25-25-25-25', [
        { width: '25%', blocks: [b('image', { src: S(270), alt: '' }, { width: '100%' })] },
        { width: '25%', blocks: [b('image', { src: S(320), alt: '' }, { width: '100%' })] },
        { width: '25%', blocks: [b('image', { src: S(370), alt: '' }, { width: '100%' })] },
        { width: '25%', blocks: [b('image', { src: S(420), alt: '' }, { width: '100%' })] },
      ]),
    ],
  },
];
