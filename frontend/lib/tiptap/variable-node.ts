import { Node, mergeAttributes } from '@tiptap/core'

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
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-variable]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        style: [
          'display:inline-block',
          'background:#dbeafe',
          'color:#1d4ed8',
          'border:1px solid #bfdbfe',
          'border-radius:4px',
          'padding:0 5px',
          'font-size:0.82em',
          'font-weight:600',
          'font-family:monospace',
          'cursor:default',
          'user-select:none',
          'white-space:nowrap',
          'line-height:1.6',
          '-webkit-user-select:none',
        ].join(';'),
        contenteditable: 'false',
      }),
      `{{${node.attrs.name}}}`,
    ]
  },
})

export function extractVariablesFromTiptap(doc: Record<string, unknown>): string[] {
  const vars = new Set<string>()
  function walk(node: Record<string, unknown>) {
    if (node.type === 'variable' && typeof node.attrs === 'object' && node.attrs !== null) {
      const name = (node.attrs as Record<string, unknown>).name
      if (typeof name === 'string') vars.add(name)
    }
    const content = node.content
    if (Array.isArray(content)) content.forEach(walk)
  }
  walk(doc)
  return [...vars].sort()
}

export function renderTiptapToHtml(
  doc: Record<string, unknown>,
  variables: Record<string, string>,
): string {
  function escape(s: string) {
    return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  }
  function val(name: string) {
    return escape(variables[name] ?? `{{${name}}}`)
  }

  function renderMarks(text: string, marks: { type: string }[] = []): string {
    let out = escape(text)
    for (const m of marks) {
      if (m.type === 'bold') out = `<strong>${out}</strong>`
      else if (m.type === 'italic') out = `<em>${out}</em>`
      else if (m.type === 'underline') out = `<u>${out}</u>`
      else if (m.type === 'strike') out = `<s>${out}</s>`
    }
    return out
  }

  function renderInline(node: Record<string, unknown>): string {
    if (node.type === 'text') {
      return renderMarks(
        String(node.text ?? ''),
        (node.marks as { type: string }[]) ?? [],
      )
    }
    if (node.type === 'variable') {
      const name = (node.attrs as Record<string, string>)?.name ?? ''
      return val(name)
    }
    if (node.type === 'hardBreak') return '<br/>'
    return ''
  }

  function renderBlock(node: Record<string, unknown>): string {
    const children = (node.content as Record<string, unknown>[] | undefined) ?? []
    const attrs = (node.attrs as Record<string, string> | undefined) ?? {}
    const align = attrs.textAlign ? `text-align:${attrs.textAlign};` : ''

    switch (node.type) {
      case 'paragraph': {
        const inner = children.map(renderInline).join('')
        return inner
          ? `<p style="${align}font-size:10pt;line-height:1.75;margin:0 0 8px;">${inner}</p>`
          : '<p style="margin:0 0 8px;">&nbsp;</p>'
      }
      case 'heading': {
        const level = Number(attrs.level ?? 2)
        const sizes: Record<number, string> = { 1: '14pt', 2: '12pt', 3: '11pt' }
        const weights: Record<number, string> = { 1: '800', 2: '700', 3: '600' }
        const size = sizes[level] ?? '11pt'
        const weight = weights[level] ?? '700'
        const uppercase = level === 1 ? 'text-transform:uppercase;letter-spacing:0.5px;' : ''
        const inner = children.map(renderInline).join('')
        return `<h${level} style="${align}font-size:${size};font-weight:${weight};${uppercase}color:#0f172a;margin:16px 0 8px;">${inner}</h${level}>`
      }
      case 'bulletList': {
        const items = children.map(renderBlock).join('')
        return `<ul style="margin:0 0 8px;padding-left:20px;font-size:10pt;line-height:1.75;">${items}</ul>`
      }
      case 'orderedList': {
        const items = children.map(renderBlock).join('')
        return `<ol style="margin:0 0 8px;padding-left:20px;font-size:10pt;line-height:1.75;">${items}</ol>`
      }
      case 'listItem': {
        const inner = children.map(renderBlock).join('')
        return `<li style="margin-bottom:2px;">${inner}</li>`
      }
      case 'blockquote': {
        const inner = children.map(renderBlock).join('')
        return `<blockquote style="border-left:3px solid #0f172a;padding:6px 14px;margin:10px 0;background:#f8fafc;font-size:10pt;">${inner}</blockquote>`
      }
      case 'horizontalRule':
        return `<hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0;"/>`
      case 'doc': {
        return children.map(renderBlock).join('')
      }
      default:
        return children.map(renderBlock).join('')
    }
  }

  const body = renderBlock(doc)
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/><style>
    @page{size:A4;margin:18mm 22mm;}*{box-sizing:border-box;}
    body{font-family:Arial,sans-serif;font-size:10pt;color:#1a1a1a;margin:0;padding:0;line-height:1.6;}
    h1,h2,h3{color:#0f172a;}
    ul,ol{padding-left:20px;}
    table{border-collapse:collapse;}
    hr{border:none;border-top:1px solid #e2e8f0;margin:16px 0;}
    p{margin:0 0 8px;}
  </style></head><body>${body}</body></html>`
}
