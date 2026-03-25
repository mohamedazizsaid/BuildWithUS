export type BlockType = 'heading' | 'text' | 'image' | 'button' | 'divider' | 'table' | 'signature';

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
  width: string; // e.g. "50%", "33.33%", "100%"
  blocks: BlockData[];
}

export interface Row {
  id: string;
  layout: RowLayout;
  columns: Column[];
  styles: Record<string, string>;
}

export interface TemplateData {
  rows: Row[];
  globalStyles: {
    backgroundColor: string;
    textColor: string;
    fontFamily: string;
    fontWeight: string;
    textAlign: string;
    width: string;
  };
}

export const LAYOUT_OPTIONS: { label: string; value: RowLayout; widths: string[] }[] = [
  { label: '100%', value: '100', widths: ['100%'] },
  { label: '50 / 50', value: '50-50', widths: ['50%', '50%'] },
  { label: '33 / 33 / 33', value: '33-33-33', widths: ['33.33%', '33.33%', '33.33%'] },
  { label: '25 / 25 / 25 / 25', value: '25-25-25-25', widths: ['25%', '25%', '25%', '25%'] },
  { label: '33 / 67', value: '33-67', widths: ['33.33%', '66.67%'] },
  { label: '67 / 33', value: '67-33', widths: ['66.67%', '33.33%'] },
  { label: '17 / 33 / 17 / 33', value: '17-33-17-33', widths: ['17%', '33%', '17%', '33%'] },
  { label: '33 / 17 / 33 / 17', value: '33-17-33-17', widths: ['33%', '17%', '33%', '17%'] },
];

export const DEFAULT_BLOCK_CONTENT: Record<BlockType, { content: Record<string, string | string[] | string[][]>; styles: Record<string, string> }> = {
  heading: {
    content: { text: 'Heading' },
    styles: { fontSize: '24px', color: '#000000', fontWeight: 'bold', textAlign: 'left', padding: '10px' },
  },
  text: {
    content: { text: 'Enter your text here...' },
    styles: { fontSize: '16px', color: '#333333', fontWeight: 'normal', textAlign: 'left', padding: '10px' },
  },
  image: {
    content: { src: '', alt: 'Image' },
    styles: { width: '100%', padding: '10px', textAlign: 'center' },
  },
  button: {
    content: { text: 'Click here', href: '#' },
    styles: { backgroundColor: '#0f172a', color: '#ffffff', fontSize: '16px', padding: '12px 24px', borderRadius: '6px', textAlign: 'center' },
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
    styles: { fontSize: '14px', color: '#333333', padding: '10px' },
  },
  signature: {
    content: { name: '', title: '' },
    styles: { fontSize: '14px', color: '#333333', padding: '20px 10px' },
  },
};

export const DEFAULT_GLOBAL_STYLES: TemplateData['globalStyles'] = {
  backgroundColor: '#f8fafc',
  textColor: '#000000',
  fontFamily: 'Inter, sans-serif',
  fontWeight: 'normal',
  textAlign: 'left',
  width: '600px',
};
