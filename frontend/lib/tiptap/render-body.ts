// Pure string-rendering of a Tiptap doc JSON. No React / no DOM — safe to
// import from Next.js Route Handlers, NestJS services, anywhere on the server.
//
// Keep block coverage in sync with the editor extensions in contract-blocks.tsx
// and contract-header.tsx.

export function renderTiptapDocToBodyHtml(
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
      case 'contractHeader': {
        const a = attrs
        const titleHtml = children.map(renderInline).join('')
        const logoCell = a.logoUrl
          ? `<img src="${escape(a.logoUrl)}" alt="Logo" style="max-width:60px;max-height:60px;object-fit:contain;"/>`
          : `<div style="border:1px dashed #cbd5e1;border-radius:4px;height:60px;width:60px;background:#fafafa;"></div>`
        return `<div style="margin:0 0 22px;">
          <table style="width:100%;border-collapse:collapse;margin-bottom:12px;padding-bottom:14px;border-bottom:3px solid #0f172a;">
            <tr>
              <td style="width:64px;padding-right:14px;vertical-align:top;">${logoCell}</td>
              <td style="vertical-align:top;">
                <div style="font-size:13pt;font-weight:800;color:#0f172a;line-height:1.2;">${val(a.companyVar ?? '')}</div>
                <div style="font-size:10pt;color:#334155;margin-top:4px;">${val(a.addressVar ?? '')}</div>
                <div style="font-size:8.5pt;color:#94a3b8;margin-top:4px;">SIRET ${val(a.siretVar ?? '')}<span style="margin:0 6px;color:#cbd5e1;">|</span>TVA ${val(a.tvaVar ?? '')}</div>
              </td>
              <td style="vertical-align:top;text-align:right;width:30%;padding-left:14px;">
                <div style="background:#f1f5f9;padding:8px 12px;border-radius:4px;display:inline-block;text-align:right;min-width:140px;">
                  <div style="font-size:9pt;font-weight:700;color:#0f172a;">N° ${val(a.numberVar ?? '')}</div>
                  <div style="font-size:8.5pt;color:#475569;margin-top:4px;">v${val(a.versionVar ?? '')} – ${val(a.dateVar ?? '')}</div>
                </div>
              </td>
            </tr>
          </table>
          <div style="text-align:center;font-size:14pt;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;color:#0f172a;margin:0;">${titleHtml}</div>
        </div>`
      }
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

      case 'financialBlock': {
        const a = attrs
        const desc = a.descriptionVar
          ? `<div style="font-size:9.5pt;color:#065f46;margin-bottom:10px;font-weight:500;">Prestation : ${val(a.descriptionVar)}</div>`
          : ''
        return `<div style="margin:14px 0;border:1px solid #d1fae5;border-radius:6px;overflow:hidden;page-break-inside:avoid;">
          <div style="background:#059669;color:white;padding:7px 14px;font-size:9pt;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">${escape(a.title || 'RÉCAPITULATIF FINANCIER')}</div>
          <div style="padding:12px 14px;background:#f0fdf4;">${desc}
            <table style="width:100%;border-collapse:collapse;font-size:10pt;">
              <tr style="border-bottom:1px solid #d1fae5;"><td style="padding:5px 0;color:#475569;">Montant HT</td><td style="text-align:right;font-weight:500;">${val(a.htVar ?? '')} €</td></tr>
              <tr style="border-bottom:1px solid #d1fae5;"><td style="padding:5px 0;color:#475569;">TVA (${val(a.rateVar ?? '')}%)</td><td style="text-align:right;font-weight:500;">${val(a.tvaVar ?? '')} €</td></tr>
              <tr><td style="padding:8px 0;font-size:11pt;font-weight:800;">Total TTC</td><td style="text-align:right;font-size:11pt;font-weight:800;color:#059669;">${val(a.ttcVar ?? '')} €</td></tr>
            </table>
            <div style="font-size:8pt;color:#6b7280;margin-top:8px;font-style:italic;">Prix TTC — TVA incluse — Conformément à l'article 289 du CGI</div>
          </div>
        </div>`
      }

      case 'definitionsBlock': {
        const a = attrs
        const inner = children.map(renderBlock).join('')
        return `<div style="margin:14px 0;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;page-break-inside:avoid;">
          <div style="background:#0f172a;color:white;padding:8px 14px;font-size:9pt;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">${escape(a.title || 'DÉFINITIONS')}</div>
          <div style="padding:10px 14px;background:#f8fafc;font-size:9.5pt;color:#334155;">${inner}</div>
        </div>`
      }

      case 'infoBox': {
        const a = attrs
        const variants: Record<string, { bg: string; border: string; titleColor: string; textColor: string }> = {
          info:    { bg: '#eff6ff', border: '#93c5fd', titleColor: '#1e40af', textColor: '#1e3a8a' },
          warning: { bg: '#fffbeb', border: '#fcd34d', titleColor: '#92400e', textColor: '#78350f' },
          success: { bg: '#f0fdf4', border: '#86efac', titleColor: '#166534', textColor: '#14532d' },
          note:    { bg: '#f8fafc', border: '#cbd5e1', titleColor: '#475569', textColor: '#1e293b' },
        }
        const v = variants[a.variant ?? 'info'] ?? variants.info
        const inner = children.map(renderBlock).join('')
        const titleHtml = a.title
          ? `<div style="font-size:9pt;font-weight:700;color:${v.titleColor};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">${escape(a.title)}</div>`
          : ''
        return `<div style="margin:12px 0;padding:12px 16px;background:${v.bg};border:1px solid ${v.border};border-radius:4px;font-size:9.5pt;line-height:1.65;color:${v.textColor};page-break-inside:avoid;">${titleHtml}${inner}</div>`
      }

      case 'partiesBlock': {
        const inner = children.map(renderBlock).join('')
        return `<div style="margin:14px 0;padding:12px 18px;background:#f8fafc;border-left:4px solid #0f172a;border-radius:0 4px 4px 0;font-size:10pt;line-height:1.75;color:#1e293b;page-break-inside:avoid;">${inner}</div>`
      }

      case 'formFieldsBlock': {
        const a = attrs
        const inner = children.map(renderBlock).join('')
          .replaceAll('___', '<span style="display:inline-block;min-width:120px;border-bottom:1px solid #94a3b8;">&nbsp;</span>')
        return `<div style="margin:12px 0;padding:14px;border:1px solid #cbd5e1;border-radius:6px;page-break-inside:avoid;">
          <div style="font-size:9pt;font-weight:700;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px;color:#0f172a;">${escape(a.title || 'COORDONNÉES DU CLIENT')}</div>
          <div style="font-size:10pt;line-height:2;">${inner}</div>
        </div>`
      }

      case 'checkboxBlock': {
        const a = attrs
        const inner = children.map(renderBlock).join('')
          .replaceAll('☐', '<span style="display:inline-block;width:11px;height:11px;border:1px solid #475569;vertical-align:middle;margin-right:5px;"></span>')
        return `<div style="margin:12px 0;padding:14px;border:1px solid #e2e8f0;border-radius:6px;page-break-inside:avoid;">
          <div style="font-size:9pt;font-weight:700;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;color:#0f172a;">${escape(a.title || 'OPTIONS')}</div>
          <div style="font-size:10pt;line-height:1.9;">${inner}</div>
        </div>`
      }

      case 'signatureBlock': {
        const a = attrs
        const labels = (a.columns || 'Prestataire,Client').split(',').map((s) => s.trim()).filter(Boolean)
        const cols = labels.map((label, i) => {
          const nameVal = val((a as Record<string, string>)[`nameVar${i}`] ?? '')
          return `<td style="text-align:center;padding:0 8px;vertical-align:top;">
            <div style="height:50px;border-bottom:1px solid #1e293b;margin-bottom:6px;"></div>
            <div style="font-size:8.5pt;color:#475569;font-weight:600;">Signature du ${escape(label)}</div>
            <div style="font-size:8pt;color:#94a3b8;margin-top:4px;">Nom : ${nameVal}</div>
          </td>`
        }).join('')
        return `<div style="margin:24px 0 16px;page-break-inside:avoid;">
          <div style="font-size:10pt;color:#475569;margin-bottom:18px;">Fait à ${val(a.cityVar ?? '')}, le ${val(a.dateVar ?? '')}.</div>
          <table style="width:100%;border-collapse:separate;border-spacing:0;"><tr>${cols}</tr></table>
        </div>`
      }

      case 'sepaBlock': {
        const a = attrs
        return `<div style="margin:14px 0;border:2px solid #0f172a;border-radius:4px;overflow:hidden;font-size:9.5pt;color:#1e293b;page-break-inside:avoid;">
          <div style="background:#0f172a;color:white;text-align:center;padding:8px;font-size:11pt;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Mandat de prélèvement SEPA</div>
          <div style="padding:12px;">
            <p style="margin:0 0 10px;">En signant ce formulaire, vous autorisez ${val(a.creditorVar ?? '')} à envoyer des instructions à votre banque pour débiter votre compte.</p>
            <div style="margin-bottom:6px;"><strong>Créancier :</strong> ${val(a.creditorVar ?? '')} &nbsp; <strong>ICS :</strong> ${val(a.icsVar ?? '')}</div>
            <div style="margin-bottom:10px;"><strong>Adresse :</strong> ${val(a.addressVar ?? '')}</div>
            <table style="width:100%;border-collapse:separate;border-spacing:8px 0;"><tr>
              <td style="border:1px solid #cbd5e1;padding:6px 8px;border-radius:4px;width:65%;">
                <div style="font-weight:700;font-size:8pt;margin-bottom:4px;">IBAN</div>
                <div style="font-size:9pt;">${val(a.ibanVar ?? '')}</div>
              </td>
              <td style="border:1px solid #cbd5e1;padding:6px 8px;border-radius:4px;">
                <div style="font-weight:700;font-size:8pt;margin-bottom:4px;">BIC</div>
                <div style="font-size:9pt;">${val(a.bicVar ?? '')}</div>
              </td>
            </tr></table>
            <div style="margin-top:10px;display:flex;justify-content:space-between;font-size:8.5pt;"><span><strong>Type :</strong> Récurrent / répétitif</span><span style="border-bottom:1px solid #1e293b;min-width:120px;text-align:right;">Signature</span></div>
          </div>
        </div>`
      }

      case 'retractBlock': {
        const a = attrs
        return `<div style="margin:14px 0;padding:14px;border:1px solid #e2e8f0;border-radius:4px;background:#fafafa;font-size:9pt;line-height:1.7;color:#475569;page-break-inside:avoid;">
          <div style="text-align:center;font-size:9pt;font-weight:700;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;color:#0f172a;">Formulaire de rétractation</div>
          <p style="margin:0 0 8px;">Je soussigné(e) ${val(a.firstNameVar ?? '')} ${val(a.lastNameVar ?? '')}, déclare renoncer au contrat conclu auprès de ${val(a.creditorVar ?? '')} le ${val(a.dateVar ?? '')} (N° contrat : ${val(a.numberVar ?? '')}).</p>
          <p style="font-size:8.5pt;color:#94a3b8;margin:0 0 8px;">À renvoyer dans un délai de 14 jours par lettre recommandée avec AR à : ${val(a.creditorVar ?? '')} — Service Rétractation — ${val(a.addressVar ?? '')}.</p>
          <div style="margin-top:10px;font-size:9pt;">Adresse : ${val(a.signAddressVar ?? '')} &nbsp; Ville : ${val(a.signCityVar ?? '')} &nbsp; <span style="float:right;border-bottom:1px solid #1e293b;min-width:120px;text-align:right;">Signature</span></div>
        </div>`
      }

      case 'doc': {
        return children.map(renderBlock).join('')
      }
      default:
        return children.map(renderBlock).join('')
    }
  }

  return renderBlock(doc)
}
