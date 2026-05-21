import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { VariableNodeView } from './variable-node-view'

export const VariableNode = Node.create({
  name: 'variable',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      name: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-variable'),
        renderHTML: (attrs) => ({ 'data-variable': attrs.name }),
      },
      label: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-label') || null,
        renderHTML: (attrs) => (attrs.label ? { 'data-label': attrs.label } : {}),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-variable]' }]
  },

  addNodeView() {
    return ReactNodeViewRenderer(VariableNodeView, { as: 'span' })
  },

  renderHTML({ node, HTMLAttributes }) {
    const raw: string = node.attrs.name ?? ''
    const display: string =
      node.attrs.label ??
      raw.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        style: [
          'display:inline-flex',
          'align-items:center',
          'gap:3px',
          'background:#dbeafe',
          'color:#1d4ed8',
          'border:1px solid #bfdbfe',
          'border-radius:4px',
          'padding:1px 6px',
          'font-size:0.80em',
          'font-weight:600',
          'cursor:default',
          'user-select:none',
          'white-space:nowrap',
          'line-height:1.6',
          '-webkit-user-select:none',
        ].join(';'),
        contenteditable: 'false',
        title: `{{${raw}}}`,
      }),
      display,
    ]
  },
})

// Variable-name attribute keys per block type. Kept in sync with contract-blocks.tsx.
const BLOCK_VAR_KEYS: Record<string, string[]> = {
  contractHeader:  ['companyVar', 'addressVar', 'siretVar', 'tvaVar', 'numberVar', 'versionVar', 'dateVar'],
  financialBlock:  ['descriptionVar', 'htVar', 'rateVar', 'tvaVar', 'ttcVar'],
  signatureBlock:  ['cityVar', 'dateVar'],
  sepaBlock:       ['creditorVar', 'addressVar'],
  retractBlock:    ['firstNameVar', 'lastNameVar', 'creditorVar', 'addressVar', 'dateVar', 'numberVar'],
}

export function extractVariablesFromTiptap(doc: Record<string, unknown>): string[] {
  const vars = new Set<string>()
  function walk(node: Record<string, unknown>) {
    const attrs = (node.attrs as Record<string, unknown> | undefined) ?? {}
    if (node.type === 'variable') {
      const name = attrs.name
      if (typeof name === 'string') vars.add(name)
    } else if (typeof node.type === 'string' && BLOCK_VAR_KEYS[node.type]) {
      for (const key of BLOCK_VAR_KEYS[node.type]) {
        const v = attrs[key]
        if (typeof v === 'string' && v) vars.add(v)
      }
    }
    const content = node.content
    if (Array.isArray(content)) content.forEach(walk)
  }
  walk(doc)
  return [...vars].sort()
}

import { renderTiptapDocToBodyHtml } from './render-body';
export { renderTiptapDocToBodyHtml };

export interface RenderFloatingImage {
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** @deprecated Use renderTiptapJsonToPrintHtml from lib/tiptap/render-print-html.ts (Two-View architecture). */
export function renderTiptapToHtml(
  doc: Record<string, unknown>,
  variables: Record<string, string>,
  options: { docName?: string; bgColor?: string; floatingImages?: RenderFloatingImage[] } = {},
): string {
  const bgColor = options.bgColor ?? '#ffffff';
  const body = renderTiptapDocToBodyHtml(doc, variables);
  const images = options.floatingImages ?? [];

  const escapeAttr = (s: string) =>
    s.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

  const imagesHtml = images.map((img) => `
    <img src="${escapeAttr(img.src)}" alt="" style="position:absolute;left:${img.x}mm;top:${img.y}mm;width:${img.width}mm;height:${img.height}mm;object-fit:fill;pointer-events:none;"/>
  `).join('');

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/><style>
    @page{size:A4;margin:0;background:${bgColor};}
    *{box-sizing:border-box;}
    html,body{background:${bgColor};-webkit-print-color-adjust:exact;print-color-adjust:exact;}
    body{font-family:Arial,sans-serif;font-size:10pt;color:#1a1a1a;margin:0;padding:0;line-height:1.6;position:relative;}
    .page-wrap{position:relative;padding:18mm 22mm;min-height:297mm;}
    h1,h2,h3{color:#0f172a;}
    ul,ol{padding-left:20px;}
    table{border-collapse:collapse;}
    hr{border:none;border-top:1px solid #e2e8f0;margin:16px 0;}
    p{margin:0 0 8px;}
  </style></head><body><div class="page-wrap">${body}${imagesHtml}</div></body></html>`
}
