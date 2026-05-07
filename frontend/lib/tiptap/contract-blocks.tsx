'use client'

import { Node, mergeAttributes } from '@tiptap/core'
import { NodeViewWrapper, NodeViewContent, ReactNodeViewRenderer } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'
import { useVarLabels } from './var-labels-context'

// ─── Inline variable chip (used by atom NodeViews) ───────────────────────────

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

// ═════════════════════════════════════════════════════════════════════════════
// 1. FINANCIAL BLOCK
// ═════════════════════════════════════════════════════════════════════════════

function FinancialView({ node, updateAttributes }: NodeViewProps) {
  const a = node.attrs as Record<string, string>
  const headerBg   = a.blockAccent || '#059669'
  const bodyBg     = a.blockBg    || '#f0fdf4'
  const accentColor = a.blockAccent || '#059669'
  return (
    <NodeViewWrapper>
      <div style={{ margin: '14px 0', border: `1px solid ${accentColor}33`, borderRadius: '6px', overflow: 'hidden' }}>
        <div style={{ background: headerBg, color: 'white', padding: '7px 14px', fontSize: '9pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {a.title || 'RÉCAPITULATIF FINANCIER'}
        </div>
        <div style={{ padding: '12px 14px', background: bodyBg }} contentEditable={false}>
          <div style={{ fontSize: '9.5pt', color: accentColor, marginBottom: '10px', fontWeight: 500 }}>
            Prestation : <VarChip name={a.descriptionVar} attrKey="descriptionVar" small onClear={() => updateAttributes({ descriptionVar: '' })} />
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt' }}>
            <tbody>
              <tr style={{ borderBottom: `1px solid ${accentColor}33` }}>
                <td style={{ padding: '5px 0', color: '#475569' }}>Montant HT</td>
                <td style={{ textAlign: 'right', fontWeight: 500 }}><VarChip name={a.htVar} attrKey="htVar" small onClear={() => updateAttributes({ htVar: '' })} /> €</td>
              </tr>
              <tr style={{ borderBottom: `1px solid ${accentColor}33` }}>
                <td style={{ padding: '5px 0', color: '#475569' }}>TVA (<VarChip name={a.rateVar} attrKey="rateVar" small onClear={() => updateAttributes({ rateVar: '' })} />%)</td>
                <td style={{ textAlign: 'right', fontWeight: 500 }}><VarChip name={a.tvaVar} attrKey="tvaVar" small onClear={() => updateAttributes({ tvaVar: '' })} /> €</td>
              </tr>
              <tr>
                <td style={{ padding: '8px 0', fontSize: '11pt', fontWeight: 800 }}>Total TTC</td>
                <td style={{ textAlign: 'right', fontSize: '11pt', fontWeight: 800, color: accentColor }}>
                  <VarChip name={a.ttcVar} attrKey="ttcVar" onClear={() => updateAttributes({ ttcVar: '' })} /> €
                </td>
              </tr>
            </tbody>
          </table>
          <div style={{ fontSize: '8pt', color: '#6b7280', marginTop: '8px', fontStyle: 'italic' }}>
            Prix TTC — TVA incluse — Conformément à l&apos;article 289 du CGI
          </div>
        </div>
      </div>
    </NodeViewWrapper>
  )
}

export const FinancialBlock = Node.create({
  name: 'financialBlock',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes() {
    return {
      title:          { default: 'RÉCAPITULATIF FINANCIER' },
      descriptionVar: { default: 'description_prestation' },
      htVar:          { default: 'montant_ht' },
      rateVar:        { default: 'taux_tva' },
      tvaVar:         { default: 'montant_tva' },
      ttcVar:         { default: 'montant_ttc' },
      blockBg:        { default: '' },
      blockAccent:    { default: '' },
    }
  },
  parseHTML() { return [{ tag: 'div[data-financial-block]' }] },
  renderHTML({ node, HTMLAttributes }) {
    const a = node.attrs
    return ['div', mergeAttributes(HTMLAttributes, {
      'data-financial-block': '',
      'data-title':           a.title,
      'data-description-var': a.descriptionVar,
      'data-ht-var':          a.htVar,
      'data-rate-var':        a.rateVar,
      'data-tva-var':         a.tvaVar,
      'data-ttc-var':         a.ttcVar,
      'data-block-bg':        a.blockBg,
      'data-block-accent':    a.blockAccent,
    })]
  },
  addNodeView() { return ReactNodeViewRenderer(FinancialView) },
})

// ═════════════════════════════════════════════════════════════════════════════
// 2. DEFINITIONS BLOCK
// ═════════════════════════════════════════════════════════════════════════════

function DefinitionsView({ node }: NodeViewProps) {
  const a = node.attrs as Record<string, string>
  const headerBg = a.blockAccent || '#0f172a'
  const bodyBg   = a.blockBg    || '#f8fafc'
  return (
    <NodeViewWrapper>
      <div style={{ margin: '14px 0', border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
        <div contentEditable={false} style={{ background: headerBg, color: 'white', padding: '8px 14px', fontSize: '9pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {a.title || 'DÉFINITIONS'}
        </div>
        <NodeViewContent style={{ padding: '10px 14px', background: bodyBg, fontSize: '9.5pt', color: '#334155', minHeight: '50px' }} />
      </div>
    </NodeViewWrapper>
  )
}

export const DefinitionsBlock = Node.create({
  name: 'definitionsBlock',
  group: 'block',
  content: 'paragraph+',
  defining: true,
  addAttributes() {
    return {
      title:       { default: 'DÉFINITIONS' },
      blockBg:     { default: '' },
      blockAccent: { default: '' },
    }
  },
  parseHTML() { return [{ tag: 'div[data-definitions-block]' }] },
  renderHTML({ node, HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, {
      'data-definitions-block': '',
      'data-title':          node.attrs.title,
      'data-block-bg':       node.attrs.blockBg,
      'data-block-accent':   node.attrs.blockAccent,
    }), 0]
  },
  addNodeView() { return ReactNodeViewRenderer(DefinitionsView) },
})

// ═════════════════════════════════════════════════════════════════════════════
// 3. INFO BOX
// ═════════════════════════════════════════════════════════════════════════════

const INFO_VARIANTS: Record<string, { bg: string; border: string; titleColor: string; textColor: string }> = {
  info:    { bg: '#eff6ff', border: '#93c5fd', titleColor: '#1e40af', textColor: '#1e3a8a' },
  warning: { bg: '#fffbeb', border: '#fcd34d', titleColor: '#92400e', textColor: '#78350f' },
  success: { bg: '#f0fdf4', border: '#86efac', titleColor: '#166534', textColor: '#14532d' },
  note:    { bg: '#f8fafc', border: '#cbd5e1', titleColor: '#475569', textColor: '#1e293b' },
}

function InfoBoxView({ node }: NodeViewProps) {
  const a = node.attrs as Record<string, string>
  const variant = INFO_VARIANTS[a.variant] ?? INFO_VARIANTS.info
  const bg          = a.blockBg     || variant.bg
  const borderColor = a.blockAccent || variant.border
  const titleColor  = a.blockAccent || variant.titleColor
  const textColor   = variant.textColor
  return (
    <NodeViewWrapper>
      <div style={{ margin: '12px 0', padding: '12px 16px', background: bg, border: `1px solid ${borderColor}`, borderRadius: '4px' }}>
        {a.title && (
          <div contentEditable={false} style={{ fontSize: '9pt', fontWeight: 700, color: titleColor, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
            {a.title}
          </div>
        )}
        <NodeViewContent style={{ fontSize: '9.5pt', lineHeight: 1.65, color: textColor }} />
      </div>
    </NodeViewWrapper>
  )
}

export const InfoBox = Node.create({
  name: 'infoBox',
  group: 'block',
  content: 'paragraph+',
  defining: true,
  addAttributes() {
    return {
      title:       { default: '' },
      variant:     { default: 'info' },
      blockBg:     { default: '' },
      blockAccent: { default: '' },
    }
  },
  parseHTML() { return [{ tag: 'div[data-info-box]' }] },
  renderHTML({ node, HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, {
      'data-info-box':      '',
      'data-variant':       node.attrs.variant,
      'data-title':         node.attrs.title,
      'data-block-bg':      node.attrs.blockBg,
      'data-block-accent':  node.attrs.blockAccent,
    }), 0]
  },
  addNodeView() { return ReactNodeViewRenderer(InfoBoxView) },
})

// ═════════════════════════════════════════════════════════════════════════════
// 4. PARTIES BLOCK
// ═════════════════════════════════════════════════════════════════════════════

function PartiesView({ node }: NodeViewProps) {
  const a = node.attrs as Record<string, string>
  const borderColor = a.blockAccent || '#0f172a'
  const bodyBg      = a.blockBg    || '#f8fafc'
  return (
    <NodeViewWrapper>
      <div style={{ margin: '14px 0', padding: '12px 18px', background: bodyBg, borderLeft: `4px solid ${borderColor}`, borderRadius: '0 4px 4px 0' }}>
        <NodeViewContent style={{ fontSize: '10pt', lineHeight: 1.75, color: '#1e293b' }} />
      </div>
    </NodeViewWrapper>
  )
}

export const PartiesBlock = Node.create({
  name: 'partiesBlock',
  group: 'block',
  content: 'paragraph+',
  defining: true,
  addAttributes() {
    return {
      blockBg:     { default: '' },
      blockAccent: { default: '' },
    }
  },
  parseHTML() { return [{ tag: 'div[data-parties-block]' }] },
  renderHTML({ node, HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, {
      'data-parties-block': '',
      'data-block-bg':      node.attrs.blockBg,
      'data-block-accent':  node.attrs.blockAccent,
    }), 0]
  },
  addNodeView() { return ReactNodeViewRenderer(PartiesView) },
})

// ═════════════════════════════════════════════════════════════════════════════
// 5. FORM FIELDS BLOCK
// ═════════════════════════════════════════════════════════════════════════════

function FormFieldsView({ node }: NodeViewProps) {
  const a = node.attrs as Record<string, string>
  const bodyBg      = a.blockBg    || 'transparent'
  const accentColor = a.blockAccent || '#0f172a'
  const borderColor = a.blockAccent || '#cbd5e1'
  return (
    <NodeViewWrapper>
      <div style={{ margin: '12px 0', padding: '14px', border: `1px solid ${borderColor}`, borderRadius: '6px', background: bodyBg }}>
        <div contentEditable={false} style={{ fontSize: '9pt', fontWeight: 700, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', color: accentColor }}>
          {a.title || 'COORDONNÉES DU CLIENT'}
        </div>
        <NodeViewContent className="form-fields-body" style={{ fontSize: '10pt', lineHeight: 2 }} />
      </div>
    </NodeViewWrapper>
  )
}

export const FormFieldsBlock = Node.create({
  name: 'formFieldsBlock',
  group: 'block',
  content: 'paragraph+',
  defining: true,
  addAttributes() {
    return {
      title:       { default: 'COORDONNÉES DU CLIENT' },
      blockBg:     { default: '' },
      blockAccent: { default: '' },
    }
  },
  parseHTML() { return [{ tag: 'div[data-form-fields-block]' }] },
  renderHTML({ node, HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, {
      'data-form-fields-block': '',
      'data-title':          node.attrs.title,
      'data-block-bg':       node.attrs.blockBg,
      'data-block-accent':   node.attrs.blockAccent,
    }), 0]
  },
  addNodeView() { return ReactNodeViewRenderer(FormFieldsView) },
})

// ═════════════════════════════════════════════════════════════════════════════
// 6. CHECKBOX BLOCK
// ═════════════════════════════════════════════════════════════════════════════

function CheckboxView({ node }: NodeViewProps) {
  const a = node.attrs as Record<string, string>
  const bodyBg      = a.blockBg    || 'transparent'
  const accentColor = a.blockAccent || '#0f172a'
  const borderColor = a.blockAccent || '#e2e8f0'
  return (
    <NodeViewWrapper>
      <div style={{ margin: '12px 0', padding: '14px', border: `1px solid ${borderColor}`, borderRadius: '6px', background: bodyBg }}>
        <div contentEditable={false} style={{ fontSize: '9pt', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', color: accentColor }}>
          {a.title || 'OPTIONS'}
        </div>
        <NodeViewContent className="checkbox-body" style={{ fontSize: '10pt', lineHeight: 1.9 }} />
      </div>
    </NodeViewWrapper>
  )
}

export const CheckboxBlock = Node.create({
  name: 'checkboxBlock',
  group: 'block',
  content: 'paragraph+',
  defining: true,
  addAttributes() {
    return {
      title:       { default: 'OPTIONS' },
      blockBg:     { default: '' },
      blockAccent: { default: '' },
    }
  },
  parseHTML() { return [{ tag: 'div[data-checkbox-block]' }] },
  renderHTML({ node, HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, {
      'data-checkbox-block': '',
      'data-title':          node.attrs.title,
      'data-block-bg':       node.attrs.blockBg,
      'data-block-accent':   node.attrs.blockAccent,
    }), 0]
  },
  addNodeView() { return ReactNodeViewRenderer(CheckboxView) },
})

// ═════════════════════════════════════════════════════════════════════════════
// 7. SIGNATURE BLOCK
// ═════════════════════════════════════════════════════════════════════════════

function SignatureView({ node, updateAttributes }: NodeViewProps) {
  const a = node.attrs as Record<string, string>
  const lineColor = a.blockAccent || '#1e293b'
  const labels = (a.columns || 'Prestataire,Client').split(',').map((s) => s.trim()).filter(Boolean)
  return (
    <NodeViewWrapper>
      <div contentEditable={false} style={{ margin: '20px 0', background: a.blockBg || 'transparent' }}>
        <div style={{ fontSize: '10pt', color: '#475569', marginBottom: '20px' }}>
          Fait à <VarChip name={a.cityVar} attrKey="cityVar" small onClear={() => updateAttributes({ cityVar: '' })} />, le <VarChip name={a.dateVar} attrKey="dateVar" small onClear={() => updateAttributes({ dateVar: '' })} />.
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          {labels.map((label, i) => {
            const nameKey = `nameVar${i}` as 'nameVar0' | 'nameVar1' | 'nameVar2'
            return (
              <div key={label} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ height: '50px', borderBottom: `1px solid ${lineColor}`, marginBottom: '6px' }} />
                <div style={{ fontSize: '8.5pt', color: '#475569', fontWeight: 600 }}>Signature du {label}</div>
                <div style={{ fontSize: '8pt', color: '#94a3b8', marginTop: '4px' }}>
                  Nom : <VarChip name={a[nameKey] ?? ''} attrKey={nameKey} small onClear={() => updateAttributes({ [nameKey]: '' })} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </NodeViewWrapper>
  )
}

export const SignatureBlock = Node.create({
  name: 'signatureBlock',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      cityVar:     { default: 'ville_signature' },
      dateVar:     { default: 'date_signature' },
      columns:     { default: 'Prestataire,Client' },
      nameVar0:    { default: 'prestataire_nom' },
      nameVar1:    { default: 'client_nom' },
      nameVar2:    { default: '' },
      blockBg:     { default: '' },
      blockAccent: { default: '' },
    }
  },
  parseHTML() { return [{ tag: 'div[data-signature-block]' }] },
  renderHTML({ node, HTMLAttributes }) {
    const a = node.attrs
    return ['div', mergeAttributes(HTMLAttributes, {
      'data-signature-block': '',
      'data-city-var':     a.cityVar,
      'data-date-var':     a.dateVar,
      'data-columns':      a.columns,
      'data-name-var-0':   a.nameVar0,
      'data-name-var-1':   a.nameVar1,
      'data-name-var-2':   a.nameVar2,
      'data-block-bg':     a.blockBg,
      'data-block-accent': a.blockAccent,
    })]
  },
  addNodeView() { return ReactNodeViewRenderer(SignatureView) },
})

// ═════════════════════════════════════════════════════════════════════════════
// 8. SEPA MANDATE BLOCK
// ═════════════════════════════════════════════════════════════════════════════

function SepaView({ node, updateAttributes }: NodeViewProps) {
  const a = node.attrs as Record<string, string>
  const headerBg   = a.blockAccent || '#0f172a'
  const bodyBg     = a.blockBg    || 'white'
  const borderColor = a.blockAccent || '#0f172a'
  return (
    <NodeViewWrapper>
      <div contentEditable={false} style={{ margin: '14px 0', border: `2px solid ${borderColor}`, borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ background: headerBg, color: 'white', textAlign: 'center', padding: '8px', fontSize: '11pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Mandat de prélèvement SEPA
        </div>
        <div style={{ padding: '12px', fontSize: '9.5pt', color: '#1e293b', background: bodyBg }}>
          <p style={{ margin: '0 0 10px' }}>
            En signant ce formulaire, vous autorisez <VarChip name={a.creditorVar} attrKey="creditorVar" small onClear={() => updateAttributes({ creditorVar: '' })} /> à envoyer des instructions à votre banque pour débiter votre compte.
          </p>
          <div style={{ marginBottom: '6px' }}>
            <strong>Créancier :</strong> <VarChip name={a.creditorVar} attrKey="creditorVar" small onClear={() => updateAttributes({ creditorVar: '' })} />
            <span style={{ marginLeft: '20px' }}><strong>ICS :</strong> <VarChip name={a.icsVar} attrKey="icsVar" small onClear={() => updateAttributes({ icsVar: '' })} /></span>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <strong>Adresse :</strong> <VarChip name={a.addressVar} attrKey="addressVar" small onClear={() => updateAttributes({ addressVar: '' })} />
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1, border: '1px solid #cbd5e1', padding: '6px 8px', borderRadius: '4px' }}>
              <div style={{ fontWeight: 700, fontSize: '8pt', color: '#0f172a', marginBottom: '4px' }}>IBAN</div>
              <VarChip name={a.ibanVar} attrKey="ibanVar" small onClear={() => updateAttributes({ ibanVar: '' })} />
            </div>
            <div style={{ flex: 0.6, border: '1px solid #cbd5e1', padding: '6px 8px', borderRadius: '4px' }}>
              <div style={{ fontWeight: 700, fontSize: '8pt', color: '#0f172a', marginBottom: '4px' }}>BIC</div>
              <VarChip name={a.bicVar} attrKey="bicVar" small onClear={() => updateAttributes({ bicVar: '' })} />
            </div>
          </div>
          <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '8.5pt' }}>
            <span><strong>Type :</strong> Récurrent / répétitif</span>
            <span style={{ borderBottom: `1px solid ${borderColor}`, minWidth: '120px', textAlign: 'right' }}>Signature</span>
          </div>
        </div>
      </div>
    </NodeViewWrapper>
  )
}

export const SepaBlock = Node.create({
  name: 'sepaBlock',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      creditorVar: { default: 'prestataire_nom' },
      addressVar:  { default: 'prestataire_adresse' },
      icsVar:      { default: 'ics_creancier' },
      ibanVar:     { default: 'iban_client' },
      bicVar:      { default: 'bic_client' },
      blockBg:     { default: '' },
      blockAccent: { default: '' },
    }
  },
  parseHTML() { return [{ tag: 'div[data-sepa-block]' }] },
  renderHTML({ node, HTMLAttributes }) {
    const a = node.attrs
    return ['div', mergeAttributes(HTMLAttributes, {
      'data-sepa-block':    '',
      'data-creditor-var':  a.creditorVar,
      'data-address-var':   a.addressVar,
      'data-ics-var':       a.icsVar,
      'data-iban-var':      a.ibanVar,
      'data-bic-var':       a.bicVar,
      'data-block-bg':      a.blockBg,
      'data-block-accent':  a.blockAccent,
    })]
  },
  addNodeView() { return ReactNodeViewRenderer(SepaView) },
})

// ═════════════════════════════════════════════════════════════════════════════
// 9. RETRACTATION FORM BLOCK
// ═════════════════════════════════════════════════════════════════════════════

function RetractView({ node, updateAttributes }: NodeViewProps) {
  const a = node.attrs as Record<string, string>
  const bodyBg      = a.blockBg    || '#fafafa'
  const accentColor = a.blockAccent || '#0f172a'
  const borderColor = a.blockAccent || '#e2e8f0'
  return (
    <NodeViewWrapper>
      <div contentEditable={false} style={{ margin: '14px 0', padding: '14px', border: `1px solid ${borderColor}`, borderRadius: '4px', background: bodyBg }}>
        <div style={{ textAlign: 'center', fontSize: '9pt', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', color: accentColor }}>
          Formulaire de rétractation
        </div>
        <p style={{ fontSize: '9pt', lineHeight: 1.7, color: '#475569', margin: '0 0 8px' }}>
          Je soussigné(e) <VarChip name={a.firstNameVar} attrKey="firstNameVar" small onClear={() => updateAttributes({ firstNameVar: '' })} /> <VarChip name={a.lastNameVar} attrKey="lastNameVar" small onClear={() => updateAttributes({ lastNameVar: '' })} />, déclare renoncer au contrat conclu auprès de <VarChip name={a.creditorVar} attrKey="creditorVar" small onClear={() => updateAttributes({ creditorVar: '' })} /> le <VarChip name={a.dateVar} attrKey="dateVar" small onClear={() => updateAttributes({ dateVar: '' })} /> (N° contrat : <VarChip name={a.numberVar} attrKey="numberVar" small onClear={() => updateAttributes({ numberVar: '' })} />).
        </p>
        <p style={{ fontSize: '8.5pt', color: '#94a3b8', margin: '0 0 8px' }}>
          À renvoyer dans un délai de 14 jours par lettre recommandée avec AR à : <VarChip name={a.creditorVar} attrKey="creditorVar" small onClear={() => updateAttributes({ creditorVar: '' })} /> — Service Rétractation — <VarChip name={a.addressVar} attrKey="addressVar" small onClear={() => updateAttributes({ addressVar: '' })} />.
        </p>
        <div style={{ display: 'flex', gap: '12px', marginTop: '10px', fontSize: '9pt', alignItems: 'center' }}>
          <span>Adresse : <VarChip name={a.signAddressVar} attrKey="signAddressVar" small onClear={() => updateAttributes({ signAddressVar: '' })} /></span>
          <span>Ville : <VarChip name={a.signCityVar} attrKey="signCityVar" small onClear={() => updateAttributes({ signCityVar: '' })} /></span>
          <span style={{ marginLeft: 'auto', borderBottom: `1px solid ${accentColor}`, minWidth: '120px', textAlign: 'right' }}>Signature</span>
        </div>
      </div>
    </NodeViewWrapper>
  )
}

export const RetractBlock = Node.create({
  name: 'retractBlock',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      firstNameVar:    { default: 'client_prenom' },
      lastNameVar:     { default: 'client_nom' },
      creditorVar:     { default: 'prestataire_nom' },
      addressVar:      { default: 'prestataire_adresse' },
      dateVar:         { default: 'date_contrat' },
      numberVar:       { default: 'numero_contrat' },
      signAddressVar:  { default: 'client_adresse' },
      signCityVar:     { default: 'client_ville' },
      blockBg:         { default: '' },
      blockAccent:     { default: '' },
    }
  },
  parseHTML() { return [{ tag: 'div[data-retract-block]' }] },
  renderHTML({ node, HTMLAttributes }) {
    const a = node.attrs
    return ['div', mergeAttributes(HTMLAttributes, {
      'data-retract-block':    '',
      'data-first-name-var':   a.firstNameVar,
      'data-last-name-var':    a.lastNameVar,
      'data-creditor-var':     a.creditorVar,
      'data-address-var':      a.addressVar,
      'data-date-var':         a.dateVar,
      'data-number-var':       a.numberVar,
      'data-sign-address-var': a.signAddressVar,
      'data-sign-city-var':    a.signCityVar,
      'data-block-bg':         a.blockBg,
      'data-block-accent':     a.blockAccent,
    })]
  },
  addNodeView() { return ReactNodeViewRenderer(RetractView) },
})

// ═════════════════════════════════════════════════════════════════════════════
// Exports
// ═════════════════════════════════════════════════════════════════════════════

export const ALL_CONTRACT_BLOCKS = [
  FinancialBlock,
  DefinitionsBlock,
  InfoBox,
  PartiesBlock,
  FormFieldsBlock,
  CheckboxBlock,
  SignatureBlock,
  SepaBlock,
  RetractBlock,
]

export const BLOCK_VAR_KEYS: Record<string, string[]> = {
  contractHeader:  ['companyVar', 'addressVar', 'siretVar', 'tvaVar', 'numberVar', 'versionVar', 'dateVar'],
  financialBlock:  ['descriptionVar', 'htVar', 'rateVar', 'tvaVar', 'ttcVar'],
  signatureBlock:  ['cityVar', 'dateVar', 'nameVar0', 'nameVar1', 'nameVar2'],
  sepaBlock:       ['creditorVar', 'addressVar', 'icsVar', 'ibanVar', 'bicVar'],
  retractBlock:    ['firstNameVar', 'lastNameVar', 'creditorVar', 'addressVar', 'dateVar', 'numberVar', 'signAddressVar', 'signCityVar'],
}
