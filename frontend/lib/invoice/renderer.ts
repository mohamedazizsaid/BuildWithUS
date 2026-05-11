import type {
  Invoice, InvoiceData, InvoiceTheme, InvoiceLayout,
  BlockId, ColumnKey, Party,
} from './types';
import { computeTotals, formatMoney, isVatExempt, lineSubtotalHT, lineDiscountAmount } from './compute';

// ─── Public API ────────────────────────────────────────────────────────────

/** Render an invoice to a single HTML string suitable for the PDF service. */
export function renderInvoiceHtml(invoice: Invoice): string {
  const { data, layout, theme } = invoice;
  const totals = computeTotals(data);

  const fontFamily = fontStack(theme.font);
  const sizes = scaleSizes(theme.fontScale);

  const visibleBlocks = layout.blockOrder.filter((b) => layout.blockVisibility[b]);
  const body = visibleBlocks.map((b) => renderBlock(b, data, theme, layout, totals, sizes)).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    @page { size: A4; margin: 0; }
    body { margin: 0; padding: 0; font-family: ${fontFamily}; color: ${theme.colors.text}; font-size: ${sizes.body}; line-height: 1.5; }
    .invoice-root { box-sizing: border-box; width: 210mm; min-height: 297mm; padding: 18mm 20mm; background: #ffffff; ${backgroundCss(theme)} }
    .invoice-section { margin-bottom: 18px; }
    table.lines { width: 100%; border-collapse: collapse; font-size: ${sizes.small}; }
    table.lines th { background: ${theme.colors.primary}; color: #ffffff; padding: 8px 10px; text-align: left; font-weight: 600; font-size: ${sizes.small}; }
    table.lines td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
    table.lines td.num, table.lines th.num { text-align: right; }
    .totals-box { width: 280px; margin-left: auto; }
    .totals-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: ${sizes.small}; color: ${theme.colors.muted}; }
    .totals-row.grand { background: ${theme.colors.primary}; color: #ffffff; padding: 8px 12px; border-radius: 6px; margin-top: 6px; font-weight: 700; font-size: ${sizes.body}; }
    .label { font-size: ${sizes.xs}; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: ${theme.colors.muted}; margin-bottom: 4px; }
    .accent-bar { height: 2px; background: ${theme.colors.primary}; margin: 14px 0; }
    .party-name { font-weight: 700; font-size: ${sizes.lg}; color: ${theme.colors.primary}; }
    .muted { color: ${theme.colors.muted}; font-size: ${sizes.small}; }
  </style></head><body><div class="invoice-root">${body}</div></body></html>`;
}

// ─── Blocks ────────────────────────────────────────────────────────────────

function renderBlock(
  id: BlockId,
  data: InvoiceData,
  theme: InvoiceTheme,
  layout: InvoiceLayout,
  totals: ReturnType<typeof computeTotals>,
  sizes: ReturnType<typeof scaleSizes>,
): string {
  switch (id) {
    case 'header':  return renderHeader(data, theme, sizes);
    case 'parties': return renderParties(data, theme);
    case 'meta':    return renderMeta(data, theme);
    case 'lines':   return renderLines(data, theme, layout, sizes);
    case 'totals':  return renderTotals(data, totals, sizes);
    case 'payment': return renderPayment(data, theme);
    case 'footer':  return renderFooter(data, theme, sizes);
  }
}

function renderHeader(data: InvoiceData, theme: InvoiceTheme, sizes: ReturnType<typeof scaleSizes>): string {
  const logo = theme.logo.url
    ? `<img src="${escapeAttr(theme.logo.url)}" style="max-width:${theme.logo.width}px;height:auto;display:block;margin:${alignMargin(theme.logo.align)};" />`
    : '';
  const typeLabel = invoiceTypeLabel(data.type);
  return `<div class="invoice-section" style="display:flex;justify-content:space-between;align-items:flex-start;">
    <div style="text-align:${theme.logo.align};">${logo}</div>
    <div style="text-align:right;">
      <div style="font-size:${sizes.xxl};font-weight:800;color:${theme.colors.primary};letter-spacing:-0.5px;">${typeLabel}</div>
      <div class="muted" style="margin-top:4px;">${escapeHtml(data.number)}</div>
    </div>
  </div>`;
}

function renderParties(data: InvoiceData, theme: InvoiceTheme): string {
  return `<div class="invoice-section" style="display:flex;gap:24px;">
    <div style="flex:1;">
      <div class="label">Émetteur</div>
      ${partyHtml(data.seller)}
    </div>
    <div style="flex:1;">
      <div class="label">Facturé à</div>
      ${partyHtml(data.client)}
    </div>
  </div>
  <div class="accent-bar"></div>`;
}

function partyHtml(p: Party): string {
  const lines: string[] = [];
  if (p.name)              lines.push(`<div class="party-name">${escapeHtml(p.name)}</div>`);
  if (p.address)           lines.push(`<div class="muted">${escapeHtml(p.address)}</div>`);
  if (p.zipCode || p.city) lines.push(`<div class="muted">${escapeHtml([p.zipCode, p.city].filter(Boolean).join(' '))}</div>`);
  if (p.country)           lines.push(`<div class="muted">${escapeHtml(p.country)}</div>`);
  if (p.email)             lines.push(`<div class="muted">${escapeHtml(p.email)}</div>`);
  if (p.phone)             lines.push(`<div class="muted">${escapeHtml(p.phone)}</div>`);
  if (p.siret)             lines.push(`<div class="muted">SIRET : ${escapeHtml(p.siret)}</div>`);
  if (p.vatNumber)         lines.push(`<div class="muted">N° TVA : ${escapeHtml(p.vatNumber)}</div>`);
  return lines.join('');
}

function renderMeta(data: InvoiceData, _theme: InvoiceTheme): string {
  return `<div class="invoice-section" style="display:flex;gap:24px;font-size:11pt;">
    <div><span class="label" style="display:inline-block;margin-right:6px;">Date</span> ${escapeHtml(formatDateFr(data.issueDate))}</div>
    <div><span class="label" style="display:inline-block;margin-right:6px;">Échéance</span> ${escapeHtml(formatDateFr(data.dueDate))}</div>
    <div><span class="label" style="display:inline-block;margin-right:6px;">Devise</span> ${escapeHtml(data.currency)}</div>
  </div>`;
}

const COLUMN_LABELS: Record<ColumnKey, string> = {
  description: 'Description',
  qty:         'Qté',
  unitPrice:   'Prix unitaire HT',
  vat:         'TVA',
  discount:    'Remise',
  total:       'Total HT',
};

function renderLines(data: InvoiceData, theme: InvoiceTheme, layout: InvoiceLayout, sizes: ReturnType<typeof scaleSizes>): string {
  const cols = layout.columns.filter((c) => c.visible);
  const header = cols.map((c) => {
    const numeric = c.key !== 'description';
    return `<th class="${numeric ? 'num' : ''}">${COLUMN_LABELS[c.key]}</th>`;
  }).join('');

  const rows = data.lines.map((line) => {
    const cells = cols.map((c) => {
      switch (c.key) {
        case 'description': return `<td>${escapeHtml(line.description)}</td>`;
        case 'qty':         return `<td class="num">${line.quantity}</td>`;
        case 'unitPrice':   return `<td class="num">${formatMoney(line.unitPrice, data.currency)}</td>`;
        case 'vat':         return `<td class="num">${line.vatRate}%</td>`;
        case 'discount':    return `<td class="num">${line.discount ? (line.discount.type === 'percent' ? `${line.discount.value}%` : formatMoney(line.discount.value, data.currency)) : '—'}</td>`;
        case 'total':       return `<td class="num">${formatMoney(lineSubtotalHT(line), data.currency)}</td>`;
      }
    }).join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  return `<div class="invoice-section">
    <table class="lines" style="font-size:${sizes.small};">
      <thead><tr>${header}</tr></thead>
      <tbody>${rows || `<tr><td colspan="${cols.length}" style="padding:24px;text-align:center;color:${theme.colors.muted};">Aucune ligne</td></tr>`}</tbody>
    </table>
  </div>`;
}

function renderTotals(data: InvoiceData, totals: ReturnType<typeof computeTotals>, _sizes: ReturnType<typeof scaleSizes>): string {
  const discountRow = totals.totalDiscount > 0
    ? `<div class="totals-row"><span>Remises</span><span>-${formatMoney(totals.totalDiscount, data.currency)}</span></div>`
    : '';
  const vatRows = totals.vatBreakdown.map((v) =>
    `<div class="totals-row"><span>TVA ${v.rate}%</span><span>${formatMoney(v.amount, data.currency)}</span></div>`,
  ).join('');
  return `<div class="invoice-section">
    <div class="totals-box">
      <div class="totals-row"><span>Sous-total HT</span><span>${formatMoney(totals.subtotalHT, data.currency)}</span></div>
      ${discountRow}
      ${vatRows}
      <div class="totals-row grand"><span>Total TTC</span><span>${formatMoney(totals.totalTTC, data.currency)}</span></div>
    </div>
  </div>`;
}

function renderPayment(data: InvoiceData, _theme: InvoiceTheme): string {
  const rows: string[] = [];
  if (data.payment.paymentTerms) rows.push(`<div><span class="label" style="display:inline-block;margin-right:6px;">Conditions</span>${escapeHtml(data.payment.paymentTerms)}</div>`);
  if (data.payment.iban)         rows.push(`<div><span class="label" style="display:inline-block;margin-right:6px;">IBAN</span>${escapeHtml(data.payment.iban)}</div>`);
  if (data.payment.bic)          rows.push(`<div><span class="label" style="display:inline-block;margin-right:6px;">BIC</span>${escapeHtml(data.payment.bic)}</div>`);
  if (data.payment.bankName)     rows.push(`<div><span class="label" style="display:inline-block;margin-right:6px;">Banque</span>${escapeHtml(data.payment.bankName)}</div>`);
  if (rows.length === 0) return '';
  return `<div class="invoice-section" style="background:#f8fafc;border-radius:8px;padding:12px 14px;font-size:10pt;">
    <div class="label" style="margin-bottom:8px;">Informations de paiement</div>
    ${rows.join('')}
  </div>`;
}

function renderFooter(data: InvoiceData, theme: InvoiceTheme, sizes: ReturnType<typeof scaleSizes>): string {
  const mentions: string[] = [];
  if (isVatExempt(data))                    mentions.push('TVA non applicable, art. 293 B du CGI.');
  if (data.legal.showNoDiscount)            mentions.push('Pas d\'escompte pour règlement anticipé.');
  if (data.legal.showLatePenalty)           mentions.push(`En cas de retard de paiement, pénalités au taux de ${data.payment.latePenaltyRate}% l'an.`);
  if (data.legal.showRecoveryFee)           mentions.push(`Indemnité forfaitaire pour frais de recouvrement : ${formatMoney(data.payment.recoveryFee, data.currency)}.`);
  if (data.legal.customText.trim())         mentions.push(data.legal.customText.trim());
  if (data.notes.trim())                    mentions.unshift(data.notes.trim());

  if (mentions.length === 0) return '';
  return `<div class="invoice-section" style="border-top:1px solid #e2e8f0;padding-top:12px;font-size:${sizes.xs};color:${theme.colors.muted};line-height:1.5;">
    ${mentions.map((m) => `<div>${escapeHtml(m)}</div>`).join('')}
  </div>`;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function invoiceTypeLabel(t: InvoiceData['type']): string {
  switch (t) {
    case 'standard':   return 'FACTURE';
    case 'pro-forma':  return 'FACTURE PRO-FORMA';
    case 'acompte':    return 'FACTURE D\'ACOMPTE';
    case 'solde':      return 'FACTURE DE SOLDE';
    case 'avoir':      return 'FACTURE D\'AVOIR';
    case 'recurrente': return 'FACTURE RÉCURRENTE';
  }
}

function fontStack(font: InvoiceTheme['font']): string {
  switch (font) {
    case 'inter':    return '"Inter", "Helvetica Neue", Arial, sans-serif';
    case 'roboto':   return '"Roboto", Arial, sans-serif';
    case 'opensans': return '"Open Sans", Arial, sans-serif';
  }
}

function scaleSizes(scale: InvoiceTheme['fontScale']) {
  const base = scale === 'sm' ? 9 : scale === 'lg' ? 11 : 10;
  return {
    xs:   `${base - 2}pt`,
    small:`${base - 1}pt`,
    body: `${base}pt`,
    lg:   `${base + 1}pt`,
    xl:   `${base + 4}pt`,
    xxl:  `${base + 10}pt`,
  };
}

function backgroundCss(theme: InvoiceTheme): string {
  if (theme.background === 'header_band') {
    return `background: linear-gradient(${theme.colors.primary} 0, ${theme.colors.primary} 6mm, #ffffff 6mm);`;
  }
  if (theme.background === 'watermark') {
    return ''; // watermark rendered separately if needed
  }
  return '';
}

function alignMargin(align: 'left' | 'center' | 'right'): string {
  if (align === 'center') return '0 auto';
  if (align === 'right')  return '0 0 0 auto';
  return '0 auto 0 0';
}

function formatDateFr(iso: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return iso;
  }
}

function escapeHtml(s: string): string {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}
