import { Row, RowLayout, DEFAULT_BLOCK_CONTENT } from './editor-types';
import { v4 as uuid } from 'uuid';

// Helper to create a block with defaults
function b(type: string, content?: Record<string, string>, styles?: Record<string, string>) {
  const defaults = DEFAULT_BLOCK_CONTENT[type as keyof typeof DEFAULT_BLOCK_CONTENT];
  return {
    id: uuid(),
    type: type as Row['layout'],
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

export interface SectionDef {
  id: string;
  name: string;
  category: 'text-image' | 'text' | 'images';
  preview: string; // ASCII art for the mini preview
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
    rows: () => [
      row('100', [{ width: '100%', blocks: [b('image', { src: '', alt: 'Image' })] }]),
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
    rows: () => [
      row('50-50', [
        { width: '50%', blocks: [b('image', { src: '', alt: 'Image' }, { width: '100%' })] },
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
    rows: () => [
      row('50-50', [
        { width: '50%', blocks: [
          b('heading', { text: 'Titre' }),
          b('text', { text: 'Description du contenu ici.' }),
          b('button', { text: 'Découvrir', href: '#' }),
        ]},
        { width: '50%', blocks: [b('image', { src: '', alt: 'Image' }, { width: '100%' })] },
      ]),
    ],
  },
  {
    id: 'ti-4',
    name: '3 colonnes: Image + Titre + Texte + CTA',
    category: 'text-image',
    preview: '🖼️|🖼️|🖼️\n𝗧 | 𝗧 | 𝗧\ntxt|txt|txt\n[•]|[•]|[•]',
    rows: () => [
      row('33-33-33', [
        { width: '33.33%', blocks: [
          b('image', { src: '', alt: '' }, { width: '100%' }),
          b('heading', { text: 'Titre 1' }, { fontSize: '18px' }),
          b('text', { text: 'Description courte.' }, { fontSize: '14px' }),
          b('button', { text: 'Action', href: '#' }),
        ]},
        { width: '33.33%', blocks: [
          b('image', { src: '', alt: '' }, { width: '100%' }),
          b('heading', { text: 'Titre 2' }, { fontSize: '18px' }),
          b('text', { text: 'Description courte.' }, { fontSize: '14px' }),
          b('button', { text: 'Action', href: '#' }),
        ]},
        { width: '33.33%', blocks: [
          b('image', { src: '', alt: '' }, { width: '100%' }),
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
    rows: () => [
      row('50-50', [
        { width: '50%', blocks: [b('image', { src: '', alt: 'Image' }, { width: '100%' })] },
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
    rows: () => [
      row('50-50', [
        { width: '50%', blocks: [b('image', { src: '', alt: '' }, { width: '100%' })] },
        { width: '50%', blocks: [b('image', { src: '', alt: '' }, { width: '100%' })] },
      ]),
    ],
  },
  {
    id: 'i-2',
    name: '2x2 grille d\'images',
    category: 'images',
    preview: '🖼️|🖼️\n🖼️|🖼️',
    rows: () => [
      row('50-50', [
        { width: '50%', blocks: [b('image', { src: '', alt: '' }, { width: '100%' })] },
        { width: '50%', blocks: [b('image', { src: '', alt: '' }, { width: '100%' })] },
      ]),
      row('50-50', [
        { width: '50%', blocks: [b('image', { src: '', alt: '' }, { width: '100%' })] },
        { width: '50%', blocks: [b('image', { src: '', alt: '' }, { width: '100%' })] },
      ]),
    ],
  },
  {
    id: 'i-3',
    name: '4 images en ligne',
    category: 'images',
    preview: '🖼️|🖼️|🖼️|🖼️',
    rows: () => [
      row('25-25-25-25', [
        { width: '25%', blocks: [b('image', { src: '', alt: '' }, { width: '100%' })] },
        { width: '25%', blocks: [b('image', { src: '', alt: '' }, { width: '100%' })] },
        { width: '25%', blocks: [b('image', { src: '', alt: '' }, { width: '100%' })] },
        { width: '25%', blocks: [b('image', { src: '', alt: '' }, { width: '100%' })] },
      ]),
    ],
  },
  {
    id: 'i-4',
    name: '3 images en ligne',
    category: 'images',
    preview: '🖼️ | 🖼️ | 🖼️',
    rows: () => [
      row('33-33-33', [
        { width: '33.33%', blocks: [b('image', { src: '', alt: '' }, { width: '100%' })] },
        { width: '33.33%', blocks: [b('image', { src: '', alt: '' }, { width: '100%' })] },
        { width: '33.33%', blocks: [b('image', { src: '', alt: '' }, { width: '100%' })] },
      ]),
    ],
  },
  {
    id: 'i-5',
    name: 'Grande image + 2 petites',
    category: 'images',
    preview: '🖼️  |🖼️\n     |🖼️',
    rows: () => [
      row('50-50', [
        { width: '50%', blocks: [b('image', { src: '', alt: '' }, { width: '100%' })] },
        { width: '50%', blocks: [
          b('image', { src: '', alt: '' }, { width: '100%' }),
          b('image', { src: '', alt: '' }, { width: '100%' }),
        ]},
      ]),
    ],
  },
  {
    id: 'i-6',
    name: '4x2 grille d\'images',
    category: 'images',
    preview: '🖼️|🖼️|🖼️|🖼️\n🖼️|🖼️|🖼️|🖼️',
    rows: () => [
      row('25-25-25-25', [
        { width: '25%', blocks: [b('image', { src: '', alt: '' }, { width: '100%' })] },
        { width: '25%', blocks: [b('image', { src: '', alt: '' }, { width: '100%' })] },
        { width: '25%', blocks: [b('image', { src: '', alt: '' }, { width: '100%' })] },
        { width: '25%', blocks: [b('image', { src: '', alt: '' }, { width: '100%' })] },
      ]),
      row('25-25-25-25', [
        { width: '25%', blocks: [b('image', { src: '', alt: '' }, { width: '100%' })] },
        { width: '25%', blocks: [b('image', { src: '', alt: '' }, { width: '100%' })] },
        { width: '25%', blocks: [b('image', { src: '', alt: '' }, { width: '100%' })] },
        { width: '25%', blocks: [b('image', { src: '', alt: '' }, { width: '100%' })] },
      ]),
    ],
  },
];
