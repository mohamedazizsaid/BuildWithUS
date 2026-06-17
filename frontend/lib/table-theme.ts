import type { CSSProperties } from 'react';

// Single source of truth for the email-table look, shared across:
//   • the canvas preview (BlockRenderer)        — React style objects
//   • inline editing (EditableTable)            — React style objects
//   • MJML export + HTML export (mjml-builder)  — inline-CSS strings
//   • the MJML→HTML preview (preview-helpers)   — inherits the cell strings
// Keeping one resolver guarantees WYSIWYG: what you edit is what gets sent.

export interface TableTheme {
  borderColor: string; // row separators + header underline
  headerBg: string;
  headerColor: string;
  color: string;
  fontSize: string;
  fontFamily: string;
  striped: boolean;
  stripeColor: string;
}

export function resolveTableTheme(styles: Record<string, string>): TableTheme {
  return {
    borderColor: styles.tableBorderColor || '#e5e7eb',
    headerBg: styles.headerBg || '#f1f5f9',
    headerColor: styles.headerColor || '#0f172a',
    color: styles.color || '#334155',
    fontSize: styles.fontSize || '14px',
    fontFamily: styles.fontFamily || 'inherit',
    striped: styles.striped !== 'off',
    stripeColor: styles.stripeColor || '#f9fafb',
  };
}

export const TH_PADDING = '12px 16px';
export const TD_PADDING = '11px 16px';

// ── Inline-CSS strings (export / preview) ──
export const tableCss = () => 'width:100%;border-collapse:collapse';

export const thCss = (t: TableTheme) =>
  `padding:${TH_PADDING};text-align:left;background-color:${t.headerBg};color:${t.headerColor};` +
  `font-weight:600;font-size:${t.fontSize};font-family:${t.fontFamily};border-bottom:2px solid ${t.borderColor}`;

export const tdCss = (t: TableTheme, rowIndex: number) =>
  (t.striped && rowIndex % 2 === 1 ? `background-color:${t.stripeColor};` : '') +
  `padding:${TD_PADDING};color:${t.color};font-size:${t.fontSize};font-family:${t.fontFamily};` +
  `border-bottom:1px solid ${t.borderColor}`;

// ── React style objects (canvas / edit) ──
export const thStyle = (t: TableTheme): CSSProperties => ({
  padding: TH_PADDING,
  textAlign: 'left',
  backgroundColor: t.headerBg,
  color: t.headerColor,
  fontWeight: 600,
  fontSize: t.fontSize,
  fontFamily: t.fontFamily,
  borderBottom: `2px solid ${t.borderColor}`,
});

export const tdStyle = (t: TableTheme, rowIndex: number): CSSProperties => ({
  ...(t.striped && rowIndex % 2 === 1 ? { backgroundColor: t.stripeColor } : {}),
  padding: TD_PADDING,
  color: t.color,
  fontSize: t.fontSize,
  fontFamily: t.fontFamily,
  borderBottom: `1px solid ${t.borderColor}`,
});

// Round-trip marker stored on the MJML element's css-class.
// Old format (2 colors) is still parsed for backward compatibility.
export const encodeTableClass = (t: TableTheme) =>
  `tb:${t.borderColor}:${t.headerBg}:${t.headerColor}:${t.striped ? 1 : 0}:${t.stripeColor}`;
