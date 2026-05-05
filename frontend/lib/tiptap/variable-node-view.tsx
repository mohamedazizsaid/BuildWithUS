'use client'

import { useCallback } from 'react'
import { NodeViewWrapper } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'
import { useVarLabels } from './var-labels-context'

export function VariableNodeView({ node, editor, getPos }: NodeViewProps) {
  const varLabels = useVarLabels()
  const name: string = node.attrs.name ?? ''
  const label: string =
    node.attrs.label ??
    varLabels[name] ??
    name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

  const handleDelete = useCallback(() => {
    if (!editor || typeof getPos !== 'function') return
    const pos = getPos()
    editor.chain().focus().deleteRange({ from: pos, to: pos + node.nodeSize }).run()
  }, [editor, getPos, node.nodeSize])

  return (
    <NodeViewWrapper as="span" style={{ display: 'inline' }}>
      <span
        data-variable={name}
        contentEditable={false}
        title={`{{${name}}}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '2px',
          background: '#dbeafe',
          color: '#1d4ed8',
          border: '1px solid #bfdbfe',
          borderRadius: '4px',
          padding: '1px 3px 1px 6px',
          fontSize: '0.80em',
          fontWeight: 600,
          userSelect: 'none',
          whiteSpace: 'nowrap',
          cursor: 'copy',
          lineHeight: '1.6',
          verticalAlign: 'middle',
        }}
      >
        {label}
        <button
          contentEditable={false}
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete() }}
          title="Supprimer cette variable"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '13px',
            height: '13px',
            borderRadius: '50%',
            background: 'rgba(29, 78, 216, 0.18)',
            color: '#1d4ed8',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            fontSize: '10px',
            fontWeight: 800,
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          ×
        </button>
      </span>
    </NodeViewWrapper>
  )
}
