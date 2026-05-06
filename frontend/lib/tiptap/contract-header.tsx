'use client'

import { useRef, useState } from 'react'
import { Node, mergeAttributes } from '@tiptap/core'
import { NodeViewWrapper, NodeViewContent, ReactNodeViewRenderer } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'
import { useVarLabels } from './var-labels-context'

// ─── Inline variable chip used inside the header ─────────────────────────────

function VarChip({
  name,
  attrKey,
  onClear,
  small,
}: {
  name: string
  attrKey?: string
  onClear?: () => void
  small?: boolean
}) {
  const varLabels = useVarLabels()

  if (!name) {
    return (
      <span
        data-empty-slot={attrKey}
        contentEditable={false}
        title="Glissez une variable ici depuis le panneau"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          background: '#f8fafc',
          color: '#94a3b8',
          border: '1.5px dashed #cbd5e1',
          borderRadius: '4px',
          padding: small ? '0 6px' : '1px 8px',
          fontSize: small ? '0.76em' : '0.80em',
          fontStyle: 'italic',
          userSelect: 'none',
          whiteSpace: 'nowrap',
          minWidth: '52px',
          cursor: 'copy',
        }}
      >
        + var.
      </span>
    )
  }

  const label =
    varLabels[name] ?? name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

  return (
    <span
      data-variable={name}
      contentEditable={false}
      title={`{{${name}}} — déposez pour remplacer`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '2px',
        background: '#dbeafe',
        color: '#1d4ed8',
        border: '1px solid #bfdbfe',
        borderRadius: '4px',
        padding: small ? '0 3px 0 5px' : '1px 3px 1px 6px',
        fontSize: small ? '0.78em' : '0.80em',
        fontWeight: 600,
        userSelect: 'none',
        whiteSpace: 'nowrap',
        cursor: 'copy',
        lineHeight: '1.6',
      }}
    >
      {label}
      {onClear && (
        <button
          contentEditable={false}
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onClear() }}
          title="Retirer cette variable"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: 'rgba(29, 78, 216, 0.18)',
            color: '#1d4ed8',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            fontSize: '9px',
            fontWeight: 800,
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          ×
        </button>
      )}
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
      {/* ── Outer card ── */}
      <div
        contentEditable={false}
        style={{
          borderRadius: '6px',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
          marginBottom: '22px',
          boxShadow: '0 1px 4px rgba(15,23,42,0.08)',
        }}
      >
        {/* Top accent stripe */}
        <div style={{ height: '5px', background: 'linear-gradient(90deg, #0f172a 0%, #1e40af 60%, #3b82f6 100%)' }} />

        {/* Main info row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '72px 1fr auto',
            gap: '16px',
            alignItems: 'center',
            padding: '14px 16px',
            background: '#f8fafc',
          }}
        >
          {/* Logo */}
          <div
            onClick={openPicker}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            title={a.logoUrl ? 'Cliquez pour changer le logo' : 'Cliquez pour importer un logo'}
            style={{
              position: 'relative',
              border: a.logoUrl ? '1px solid #e2e8f0' : '2px dashed #cbd5e1',
              borderRadius: '6px',
              height: '64px',
              width: '72px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: hover && !a.logoUrl ? '#eff6ff' : 'white',
              cursor: 'pointer',
              overflow: 'hidden',
              transition: 'background 120ms, border-color 120ms',
              flexShrink: 0,
            }}
          >
            {a.logoUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.logoUrl} alt="Logo" style={{ maxWidth: '68px', maxHeight: '60px', objectFit: 'contain' }} />
                {hover && (
                  <button
                    onClick={removeLogo}
                    title="Retirer le logo"
                    style={{
                      position: 'absolute', top: '2px', right: '2px',
                      width: '16px', height: '16px', borderRadius: '50%',
                      border: '1px solid #cbd5e1', background: 'white',
                      color: '#475569', fontSize: '10px', fontWeight: 700,
                      cursor: 'pointer', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.1)', padding: 0,
                    }}
                  >×</button>
                )}
              </>
            ) : (
              <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', lineHeight: 1 }}>
                <span style={{ fontSize: '16px', color: hover ? '#3b82f6' : '#cbd5e1', fontWeight: 700 }}>+</span>
                <span style={{ fontSize: '7pt', color: hover ? '#3b82f6' : '#94a3b8', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Logo</span>
              </span>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
          </div>

          {/* Company block */}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '12.5pt', fontWeight: 800, color: '#0f172a', lineHeight: 1.25, marginBottom: '3px' }}>
              <VarChip name={a.companyVar} attrKey="companyVar" onClear={() => updateAttributes({ companyVar: '' })} />
            </div>
            <div style={{ fontSize: '9pt', color: '#475569', marginBottom: '4px' }}>
              <VarChip name={a.addressVar} attrKey="addressVar" onClear={() => updateAttributes({ addressVar: '' })} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                background: '#f1f5f9', border: '1px solid #e2e8f0',
                borderRadius: '4px', padding: '1px 7px', fontSize: '7.5pt', color: '#64748b',
              }}>
                <span style={{ fontWeight: 700, color: '#94a3b8', letterSpacing: '0.3px' }}>SIRET</span>
                <VarChip name={a.siretVar} attrKey="siretVar" small onClear={() => updateAttributes({ siretVar: '' })} />
              </span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                background: '#f1f5f9', border: '1px solid #e2e8f0',
                borderRadius: '4px', padding: '1px 7px', fontSize: '7.5pt', color: '#64748b',
              }}>
                <span style={{ fontWeight: 700, color: '#94a3b8', letterSpacing: '0.3px' }}>TVA</span>
                <VarChip name={a.tvaVar} attrKey="tvaVar" small onClear={() => updateAttributes({ tvaVar: '' })} />
              </span>
            </div>
          </div>

          {/* Contract reference badge — dark */}
          <div
            style={{
              background: '#0f172a',
              borderRadius: '6px',
              padding: '10px 14px',
              textAlign: 'right',
              minWidth: '172px',
              flexShrink: 0,
            }}
          >
            <div style={{ fontSize: '7pt', fontWeight: 700, color: '#64748b', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '5px' }}>
              Référence contrat
            </div>
            <div style={{ fontSize: '9.5pt', fontWeight: 800, color: '#f8fafc', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
              <span style={{ color: '#64748b', fontWeight: 500 }}>N°</span>
              <VarChip name={a.numberVar} attrKey="numberVar" small onClear={() => updateAttributes({ numberVar: '' })} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '5px', fontSize: '8pt', color: '#94a3b8' }}>
              <VarChip name={a.versionVar} attrKey="versionVar" small onClear={() => updateAttributes({ versionVar: '' })} />
              <span style={{ color: '#334155' }}>·</span>
              <VarChip name={a.dateVar} attrKey="dateVar" small onClear={() => updateAttributes({ dateVar: '' })} />
            </div>
          </div>
        </div>

        {/* Title band */}
        <div style={{ background: 'white', borderTop: '1px solid #e2e8f0', padding: '10px 16px' }}>
          <NodeViewContent
            style={{
              display: 'block',
              textAlign: 'center',
              fontSize: '12.5pt',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '1.5px',
              color: '#0f172a',
              outline: 'none',
            }}
          />
        </div>
      </div>
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
