import type { CSSProperties } from 'react';

// Single source of truth for the email-table look, shared across:
//   • the canvas preview (BlockRenderer)        — React style objects
//   • inline editing (EditableTable)            — React style objects
//   • MJML export + HTML export (mjml-builder)  — inline-CSS strings
//   • the MJML→HTML preview (preview-helpers)   — inherits the cell strings
// Keeping one resolver guarantees WYSIWYG: what you edit is what gets sent.

export interface TableTheme {
  borderColor: string; // row separators + header underline
  borderWidth: string; // thickness of those separators
  headerBg: string;
  headerColor: string;
  color: string;
  fontSize: string;
  fontFamily: string;
  striped: boolean;
  stripeColor: string;
  thPad: string; // header cell padding
  tdPad: string; // body cell padding
}

// Cell-padding density presets — kept as named keys (not raw CSS) so the value
// stays space-free when round-tripped through the css-class marker.
export type CellPadding = 'compact' | 'normal' | 'large';
const CELL_PAD: Record<CellPadding, { th: string; td: string }> = {
  compact: { th: '8px 10px', td: '7px 10px' },
  normal: { th: '12px 16px', td: '11px 16px' },
  large: { th: '16px 20px', td: '15px 20px' },
};
export const CELL_PAD_KEYS: CellPadding[] = ['compact', 'normal', 'large'];

export function resolveTableTheme(styles: Record<string, string>): TableTheme {
  const padKey = (CELL_PAD_KEYS.includes(styles.cellPadding as CellPadding)
    ? styles.cellPadding
    : 'normal') as CellPadding;
  return {
    borderColor: styles.tableBorderColor || '#e5e7eb',
    borderWidth: styles.tableBorderWidth || '1px',
    headerBg: styles.headerBg || '#f1f5f9',
    headerColor: styles.headerColor || '#0f172a',
    color: styles.color || '#334155',
    fontSize: styles.fontSize || '14px',
    fontFamily: styles.fontFamily || 'inherit',
    striped: styles.striped !== 'off',
    stripeColor: styles.stripeColor || '#f9fafb',
    thPad: CELL_PAD[padKey].th,
    tdPad: CELL_PAD[padKey].td,
  };
}

// Legacy exports kept for any external importers (now derived from the theme).
export const TH_PADDING = CELL_PAD.normal.th;
export const TD_PADDING = CELL_PAD.normal.td;

// Per-column text alignment. `left` is the default and needs no explicit CSS.
const alignCss = (align?: string) => (align && align !== 'left' ? `text-align:${align};` : 'text-align:left;');

// ── Inline-CSS strings (export / preview) ──
export const tableCss = () => 'width:100%;border-collapse:collapse';

export const thCss = (t: TableTheme, align?: string) =>
  `padding:${t.thPad};${alignCss(align)}background-color:${t.headerBg};color:${t.headerColor};` +
  `font-weight:600;font-size:${t.fontSize};font-family:${t.fontFamily};border-bottom:${t.borderWidth} solid ${t.borderColor}`;

export const tdCss = (t: TableTheme, rowIndex: number, align?: string) =>
  (t.striped && rowIndex % 2 === 1 ? `background-color:${t.stripeColor};` : '') +
  `padding:${t.tdPad};${alignCss(align)}color:${t.color};font-size:${t.fontSize};font-family:${t.fontFamily};` +
  `border-bottom:${t.borderWidth} solid ${t.borderColor}`;

// ── React style objects (canvas / edit) ──
export const thStyle = (t: TableTheme, align?: string): CSSProperties => ({
  padding: t.thPad,
  textAlign: (align || 'left') as CSSProperties['textAlign'],
  backgroundColor: t.headerBg,
  color: t.headerColor,
  fontWeight: 600,
  fontSize: t.fontSize,
  fontFamily: t.fontFamily,
  borderBottom: `${t.borderWidth} solid ${t.borderColor}`,
});

export const tdStyle = (t: TableTheme, rowIndex: number, align?: string): CSSProperties => ({
  ...(t.striped && rowIndex % 2 === 1 ? { backgroundColor: t.stripeColor } : {}),
  padding: t.tdPad,
  textAlign: (align || 'left') as CSSProperties['textAlign'],
  color: t.color,
  fontSize: t.fontSize,
  fontFamily: t.fontFamily,
  borderBottom: `${t.borderWidth} solid ${t.borderColor}`,
});

// Cell-padding density → key, and back. Used by the css-class round-trip marker.
export const paddingKey = (styles: Record<string, string>): CellPadding =>
  (CELL_PAD_KEYS.includes(styles.cellPadding as CellPadding) ? styles.cellPadding : 'normal') as CellPadding;

// Round-trip marker stored on the MJML element's css-class.
// Format: tb:border:headerBg:headerColor:striped(0|1):stripeColor:borderWidth:padKey
// Older 2-field and 5-field markers are still parsed for backward compatibility.
export const encodeTableClass = (t: TableTheme) =>
  `tb:${t.borderColor}:${t.headerBg}:${t.headerColor}:${t.striped ? 1 : 0}:${t.stripeColor}:${t.borderWidth}:${padKeyFromPads(t)}`;

// Recover the density key from the resolved paddings (theme has no key itself).
function padKeyFromPads(t: TableTheme): CellPadding {
  if (t.thPad === CELL_PAD.compact.th) return 'compact';
  if (t.thPad === CELL_PAD.large.th) return 'large';
  return 'normal';
}
