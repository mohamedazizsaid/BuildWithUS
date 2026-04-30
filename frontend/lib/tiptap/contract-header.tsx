'use client'

import { useRef, useState } from 'react'
import { Node, mergeAttributes } from '@tiptap/core'
import { NodeViewWrapper, NodeViewContent, ReactNodeViewRenderer } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'

// ─── Inline variable chip used inside the header ─────────────────────────────

function VarChip({ name, small }: { name: string; small?: boolean }) {
  if (!name) return null
  return (
    <span
      contentEditable={false}
      style={{
        display: 'inline-block',
        background: '#dbeafe',
        color: '#1d4ed8',
        border: '1px solid #bfdbfe',
        borderRadius: '4px',
        padding: small ? '0 4px' : '0 5px',
        fontSize: small ? '0.78em' : '0.82em',
        fontWeight: 600,
        fontFamily: 'monospace',
        userSelect: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      {'{{' + name + '}}'}
    </span>
  )
}

// ─── React NodeView (editor display) ──────────────────────────────────────────

function HeaderView({ node, updateAttributes }: Readonly<NodeViewProps>) {
  const a = node.attrs as Record<string, string>
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [hover, setHover] = useState(false)

  const openPicker = () => fileInputRef.current?.click()

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner une image (PNG, JPG, SVG…)')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('Image trop volumineuse (max 2 Mo). Compressez-la avant import.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updateAttributes({ logoUrl: reader.result })
      }
    }
    reader.readAsDataURL(file)
  }

  const removeLogo = (e: React.MouseEvent) => {
    e.stopPropagation()
    updateAttributes({ logoUrl: '' })
  }

  return (
    <NodeViewWrapper>
      <div
        contentEditable={false}
        style={{
          display: 'grid',
          gridTemplateColumns: '64px 1fr auto',
          gap: '14px',
          alignItems: 'flex-start',
          marginBottom: '14px',
          paddingBottom: '14px',
          borderBottom: '3px solid #0f172a',
        }}
      >
        {/* Logo — clickable upload zone */}
        <div
          onClick={openPicker}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          title={a.logoUrl ? 'Cliquez pour changer le logo' : 'Cliquez pour importer un logo'}
          style={{
            position: 'relative',
            border: a.logoUrl ? '1px solid #e2e8f0' : '1px dashed #cbd5e1',
            borderRadius: '4px',
            height: '60px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '8.5pt',
            color: '#94a3b8',
            background: hover && !a.logoUrl ? '#f1f5f9' : '#fafafa',
            cursor: 'pointer',
            overflow: 'hidden',
            transition: 'background 120ms, border-color 120ms',
          }}
        >
          {a.logoUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={a.logoUrl}
                alt="Logo"
                style={{ maxWidth: '60px', maxHeight: '60px', objectFit: 'contain' }}
              />
              {hover && (
                <button
                  onClick={removeLogo}
                  title="Retirer le logo"
                  style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-6px',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    border: '1px solid #cbd5e1',
                    background: 'white',
                    color: '#475569',
                    fontSize: '10px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                    padding: 0,
                  }}
                >
                  ×
                </button>
              )}
            </>
          ) : (
            <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', lineHeight: 1 }}>
              <span style={{ fontSize: '14px', color: hover ? '#6366f1' : '#cbd5e1', fontWeight: 600 }}>+</span>
              <span style={{ fontSize: '7.5pt', color: hover ? '#6366f1' : '#94a3b8' }}>Logo</span>
            </span>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFile}
            style={{ display: 'none' }}
          />
        </div>

        {/* Company info */}
        <div>
          <div style={{ fontSize: '13pt', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
            <VarChip name={a.companyVar} />
          </div>
          <div style={{ fontSize: '10pt', color: '#334155', marginTop: '4px' }}>
            <VarChip name={a.addressVar} />
          </div>
          <div style={{ fontSize: '8.5pt', color: '#94a3b8', marginTop: '4px' }}>
            SIRET <VarChip name={a.siretVar} small />
            <span style={{ margin: '0 6px', color: '#cbd5e1' }}>|</span>
            TVA <VarChip name={a.tvaVar} small />
          </div>
        </div>

        {/* Contract metadata box */}
        <div
          style={{
            background: '#f1f5f9',
            padding: '8px 12px',
            borderRadius: '4px',
            textAlign: 'right',
            minWidth: '160px',
          }}
        >
          <div style={{ fontSize: '9pt', fontWeight: 700, color: '#0f172a' }}>
            N° <VarChip name={a.numberVar} small />
          </div>
          <div style={{ fontSize: '8.5pt', color: '#475569', marginTop: '4px' }}>
            v<VarChip name={a.versionVar} small />
            <span style={{ margin: '0 4px' }}>–</span>
            <VarChip name={a.dateVar} small />
          </div>
        </div>
      </div>

      {/* Title — editable inline */}
      <NodeViewContent
        style={{
          display: 'block',
          textAlign: 'center',
          fontSize: '14pt',
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          color: '#0f172a',
          margin: '0 0 18px',
          outline: 'none',
        }}
      />
    </NodeViewWrapper>
  )
}

// ─── Node definition ──────────────────────────────────────────────────────────

export const ContractHeader = Node.create({
  name: 'contractHeader',
  group: 'block',
  content: 'text*',
  defining: true,
  draggable: false,
  selectable: false,

  addAttributes() {
    return {
      logoUrl:    { default: '' },
      companyVar: { default: 'prestataire_nom' },
      addressVar: { default: 'prestataire_adresse' },
      siretVar:   { default: 'prestataire_siret' },
      tvaVar:     { default: 'prestataire_tva' },
      numberVar:  { default: 'numero_contrat' },
      versionVar: { default: 'version_contrat' },
      dateVar:    { default: 'date_contrat' },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-contract-header]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    const a = node.attrs
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-contract-header': '',
        'data-logo-url':    a.logoUrl,
        'data-company-var': a.companyVar,
        'data-address-var': a.addressVar,
        'data-siret-var':   a.siretVar,
        'data-tva-var':     a.tvaVar,
        'data-number-var':  a.numberVar,
        'data-version-var': a.versionVar,
        'data-date-var':    a.dateVar,
      }),
      ['h1', {}, 0],
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(HeaderView)
  },
})

// Variable names referenced by a contract header node (used by extractor)
export function getHeaderVariables(attrs: Record<string, unknown>): string[] {
  const out: string[] = []
  const keys = ['companyVar', 'addressVar', 'siretVar', 'tvaVar', 'numberVar', 'versionVar', 'dateVar']
  for (const key of keys) {
    const val = attrs[key]
    if (typeof val === 'string' && val) out.push(val)
  }
  return out
}
