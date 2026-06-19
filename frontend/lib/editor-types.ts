export type BlockType = 'heading' | 'text' | 'image' | 'video' | 'button' | 'divider' | 'table' | 'signature' | 'social' | 'menu' | 'icon-list';

export type RowLayout =
  | '100'
  | '50-50'
  | '33-33-33'
  | '25-25-25-25'
  | '33-67'
  | '67-33'
  | '17-33-17-33'
  | '33-17-33-17';

export interface BlockData {
  id: string;
  type: BlockType;
  content: Record<string, string | string[] | string[][]>;
  styles: Record<string, string>;
}

export interface Column {
  id: string;
  width: string;
  // Optional column-level styling carried over from mj-column attributes
  // (background-color, border, border-radius, padding, vertical-align). Lets
  // imported "card" layouts keep their box around the blocks.
  styles?: Record<string, string>;
  blocks: BlockData[];
}

export interface Row {
  id: string;
  layout: RowLayout;
  columns: Column[];
  styles: Record<string, string>;
}

export interface GlobalStyles {
  // Layout
  width: string;
  bodyColor: string;
  backgroundColor: string;
  paddingGroup: boolean;
  paddingTop: string;
  paddingRight: string;
  paddingBottom: string;
  paddingLeft: string;
  // Background
  backgroundImage: string;
  backgroundSize: string; // cover | contain | repeat
  // Header
  showBrowserLink: boolean;
  // Raw <mj-head> content (mj-title / mj-preview / mj-style) carried verbatim
  // from imported MJML so custom CSS, @media rules and preview text survive a
  // round-trip through the canvas. Empty when there's nothing to preserve.
  customHead: string;
  // Text styles
  fontFamily: string;
  fontSize: string;
  textColor: string;
  lineHeight: string;
  textDirection: string; // ltr | rtl
  textAlign: string;
  fontWeight: string;
  // Link styles
  linkColor: string;
  linkDecoration: string; // underline | none
  // Button defaults
  btnFontFamily: string;
  btnFontSize: string;
  btnFontColor: string;
  btnFontWeight: string;
  btnWidth: string; // auto | full | custom
  btnBorderRadius: string;
  btnBackgroundColor: string;
  btnBorderSize: string;
  btnBorderColor: string;
}

export interface TemplateData {
  rows: Row[];
  globalStyles: GlobalStyles;
}

export const LAYOUT_OPTIONS: { label: string; value: RowLayout; widths: string[] }[] = [
  { label: '100%', value: '100', widths: ['100%'] },
  { label: '50 / 50', value: '50-50', widths: ['50%', '50%'] },
  { label: '33 / 33 / 33', value: '33-33-33', widths: ['33.33%', '33.33%', '33.33%'] },
  { label: '25 x 4', value: '25-25-25-25', widths: ['25%', '25%', '25%', '25%'] },
  { label: '33 / 67', value: '33-67', widths: ['33.33%', '66.67%'] },
  { label: '67 / 33', value: '67-33', widths: ['66.67%', '33.33%'] },
  { label: '17 / 33 / 17 / 33', value: '17-33-17-33', widths: ['17%', '33%', '17%', '33%'] },
  { label: '33 / 17 / 33 / 17', value: '33-17-33-17', widths: ['33%', '17%', '33%', '17%'] },
];

export const DEFAULT_BLOCK_CONTENT: Record<BlockType, { content: Record<string, string | string[] | string[][]>; styles: Record<string, string> }> = {
  heading: {
    content: { text: '' },
    styles: { fontSize: '', color: '', fontWeight: 'bold', textAlign: 'left', padding: '10px' },
  },
  text: {
    content: { text: '' },
    styles: { fontSize: '', color: '', fontWeight: '', textAlign: 'left', padding: '10px' },
  },
  image: {
    content: { src: '', alt: 'Image' },
    styles: { width: '100%', padding: '10px', textAlign: 'center' },
  },
  video: {
    content: { src: '', cover: '', type: 'upload' },
    styles: { width: '100%', padding: '10px', textAlign: 'center', borderRadius: '0px' },
  },
  button: {
    content: { text: 'Click here', href: '#' },
    styles: { backgroundColor: '', color: '', fontSize: '', padding: '12px 24px', borderRadius: '', textAlign: 'center', fontFamily: '', fontWeight: '', borderSize: '', borderColor: '' },
  },
  divider: {
    content: {},
    styles: { borderColor: '#e2e8f0', borderWidth: '1px', padding: '10px 0' },
  },
  table: {
    content: {
      headers: ['Item', 'Quantity', 'Price'],
      rows: [['Item 1', '1', '100 TND']],
    },
    styles: { fontSize: '', color: '', padding: '10px' },
  },
  signature: {
    content: { name: '', title: '' },
    styles: { fontSize: '', color: '', padding: '20px 10px' },
  },
  social: {
    content: {
      links: [['facebook', ''], ['twitter', ''], ['linkedin', '']] as string[][],
      align: 'center',
    },
    styles: { padding: '10px', iconSize: '32px', iconPadding: '4px' },
  },
  menu: {
    content: {
      items: [['Option 1', '#'], ['Option 2', '#'], ['Option 3', '#']] as string[][],
      layout: 'horizontal',
      align: 'center',
    },
    styles: {
      padding: '10px',
      spacing: '20px',
      color: '',
      fontSize: '',
      fontFamily: '',
      fontWeight: '',
      textDecoration: 'none',
    },
  },
  'icon-list': {
    content: {
      // Each item is [glyph, text] — the glyph is an email-safe Unicode symbol.
      // Text starts empty so the canvas shows an editable placeholder.
      items: [
        ['✓', ''],
        ['✓', ''],
        ['✓', ''],
      ] as string[][],
      align: 'left',
    },
    styles: {
      padding: '10px',
      spacing: '12px',
      iconColor: '#16a34a',
      iconSize: '20px',
      color: '',
      fontSize: '',
      fontWeight: '',
      fontFamily: '',
    },
  },
};

export const DEFAULT_GLOBAL_STYLES: GlobalStyles = {
  // Layout
  width: '600px',
  bodyColor: '#ffffff',
  backgroundColor: '#f8fafc',
  paddingGroup: true,
  paddingTop: '20px',
  paddingRight: '0px',
  paddingBottom: '20px',
  paddingLeft: '0px',
  // Background
  backgroundImage: '',
  backgroundSize: 'cover',
  // Header
  showBrowserLink: false,
  customHead: '',
  // Text
  fontFamily: 'Verdana, sans-serif',
  fontSize: '16px',
  textColor: '#000000',
  lineHeight: '1.5',
  textDirection: 'ltr',
  textAlign: 'left',
  fontWeight: 'normal',
  // Links
  linkColor: '#2563eb',
  linkDecoration: 'underline',
  // Buttons
  btnFontFamily: 'Arial, sans-serif',
  btnFontSize: '16px',
  btnFontColor: '#ffffff',
  btnFontWeight: 'bold',
  btnWidth: 'auto',
  btnBorderRadius: '6px',
  btnBackgroundColor: '#0f172a',
  btnBorderSize: '0px',
  btnBorderColor: '#0f172a',
};
