import type {
  Invoice, InvoiceData, InvoiceTheme, InvoiceLayout,
  BlockId, ColumnKey, Party,
} from './types';
import { computeTotals, formatMoney, isVatExempt, lineSubtotalHT, toNumber } from './compute';

// ─── Public API ────────────────────────────────────────────────────────────

/** Render an invoice to a single HTML string suitable for the PDF service. */
export function renderInvoiceHtml(invoice: Invoice): string {
  const { data, layout, theme } = invoice;
  const totals = computeTotals(data);

  const fontFamily = fontStack(theme.font);
  const sizes = scaleSizes(theme.fontScale);
  const d = designCss(theme);

  const visibleBlocks = layout.blockOrder.filter((b) => layout.blockVisibility[b]);
  const body = visibleBlocks.map((b) => renderBlock(b, data, theme, layout, totals, sizes)).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    @page { size: A4; margin: 0; }
    body { margin: 0; padding: 0; font-family: ${fontFamily}; color: ${theme.colors.text}; font-size: ${sizes.body}; line-height: 1.5; }
    .invoice-root { box-sizing: border-box; width: 210mm; min-height: 297mm; padding: 18mm 20mm; background: #ffffff; ${backgroundCss(theme)} }
    .invoice-section { margin-bottom: 18px; }
    table.lines { width: 100%; border-collapse: collapse; font-size: ${sizes.small}; }
    table.lines th { ${d.tableHeader} padding: 8px 10px; text-align: left; font-weight: 600; font-size: ${sizes.small}; }
    table.lines td { padding: 8px 10px; ${d.tableCell} vertical-align: top; }
    table.lines tbody tr:nth-child(even) td { ${d.tableStripe} }
    table.lines td.num, table.lines th.num { text-align: right; }
    .totals-box { width: 280px; margin-left: auto; }
    .totals-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: ${sizes.small}; color: ${theme.colors.muted}; }
    .totals-row.grand { background: ${theme.colors.primary}; color: #ffffff; padding: 8px 12px; border-radius: ${d.radiusPx}px; margin-top: 6px; font-weight: 700; font-size: ${sizes.body}; }
    .label { font-size: ${sizes.xs}; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: ${theme.colors.muted}; margin-bottom: 4px; }
    .accent-bar { height: 2px; background: ${theme.colors.primary}; margin: 14px 0; }
    .party-name { font-weight: 700; font-size: ${sizes.lg}; color: ${theme.colors.primary}; }
    .muted { color: ${theme.colors.muted}; font-size: ${sizes.small}; }
    .box { ${d.blockBox} border-radius: ${d.radiusPx}px; padding: 12px 14px; }
    .box-accent { ${d.blockAccent} border-radius: 0 ${d.radiusPx}px ${d.radiusPx}px 0; padding: 10px 14px; }
  </style></head><body><div class="invoice-root">${body}</div></body></html>`;
}

// ─── Design knobs → CSS ────────────────────────────────────────────────────

export function designCss(theme: InvoiceTheme): {
  tableHeader: string; tableCell: string; tableStripe: string;
  blockBox: string; blockAccent: string; radiusPx: number;
} {
  const d = theme.design;
  const primary = theme.colors.primary;
  const accent = theme.colors.accent;
  const radiusPx = ({ square: 0, soft: 4, rounded: 8, pill: 12 } as const)[d.cornerRadius];

  // Header — filled (default), outline (border + transparent), minimal (underline only)
  const tableHeader = ({
    filled:  `background: ${primary}; color: #ffffff;`,
    outline: `background: transparent; color: ${primary}; border: 1px solid ${primary};`,
    minimal: `background: transparent; color: ${primary}; border-bottom: 2px solid ${primary};`,
  } as const)[d.tableHeaderStyle];

  // Cell borders — controls the body grid
  const tableCell = ({
    all:  `border: 1px solid #e2e8f0;`,
    rows: `border-bottom: 1px solid #e2e8f0;`,
    none: ``,
  } as const)[d.tableCellBorders];

  // Row striping — applies to even rows
  const tableStripe = ({
    none:         ``,
    zebra_light:  `background: #f8fafc;`,
    zebra_accent: `background: ${hexWithAlpha(accent, 0.08)};`,
  } as const)[d.tableRowStriping];

  // Block boxes (payment, totals area, type-specific)
  const blockBox = ({
    flat:     `background: #f8fafc;`,
    bordered: `background: #ffffff; border: 1px solid #e2e8f0;`,
    shadowed: `background: #ffffff; box-shadow: 0 2px 8px rgba(15,23,42,0.06);`,
  } as const)[d.blockStyle];

  // Accent block (typeSpecific) — keeps its left bar regardless of blockStyle
  const blockAccent = ({
    flat:     `background: #f8fafc; border-left: 3px solid ${primary};`,
    bordered: `background: #ffffff; border: 1px solid #e2e8f0; border-left: 3px solid ${primary};`,
    shadowed: `background: #ffffff; border-left: 3px solid ${primary}; box-shadow: 0 2px 8px rgba(15,23,42,0.06);`,
  } as const)[d.blockStyle];

  return { tableHeader, tableCell, tableStripe, blockBox, blockAccent, radiusPx };
}

/** "#6366f1" + 0.08 → "rgba(99,102,241,0.08)" — for translucent stripes. */
function hexWithAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) return hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
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
    case 'header':       return renderHeader(data, theme, sizes);
    case 'parties':      return renderParties(data, theme);
    case 'meta':         return renderMeta(data, theme);
    case 'typeSpecific': return renderTypeSpecific(data, theme, sizes);
    case 'lines':        return renderLines(data, theme, layout, sizes);
    case 'totals':       return renderTotals(data, totals, sizes);
    case 'payment':      return renderPayment(data, theme);
    case 'footer':       return renderFooter(data, theme, sizes);
  }
}

function renderHeader(data: InvoiceData, theme: InvoiceTheme, sizes: ReturnType<typeof scaleSizes>): string {
  const logo = theme.logo.url
    ? `<img src="${escapeAttr(theme.logo.url)}" style="max-width:${theme.logo.width}px;height:auto;display:block;margin:${alignMargin(theme.logo.align)};" />`
    : '';
  const typeLabel = invoiceTypeLabel(data.type);
  const banner = typeBannerHtml(data, sizes);
  return `<div class="invoice-section" style="display:flex;justify-content:space-between;align-items:flex-start;">
    <div style="text-align:${theme.logo.align};">${logo}</div>
    <div style="text-align:right;">
      <div style="font-size:${sizes.xxl};font-weight:800;color:${theme.colors.primary};letter-spacing:-0.5px;">${typeLabel}</div>
      <div class="muted" style="margin-top:4px;">${escapeHtml(data.number)}</div>
      ${banner}
    </div>
  </div>`;
}

/** Banner shown just under the type label — calls out the regulatory nature
 *  of the document (e.g. pro-forma is NOT a tax invoice). */
function typeBannerHtml(data: InvoiceData, sizes: ReturnType<typeof scaleSizes>): string {
  const badge = (bg: string, fg: string, text: string) =>
    `<div style="display:inline-block;margin-top:6px;padding:3px 8px;border-radius:4px;background:${bg};color:${fg};font-size:${sizes.xs};font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">${escapeHtml(text)}</div>`;
  switch (data.type) {
    case 'pro-forma':  return badge('#f1f5f9', '#475569', 'Sans valeur fiscale');
    case 'acompte':    return badge('#fef3c7', '#92400e', `Acompte ${data.typeSpecific.acompte?.depositPercent ?? 0}%`);
    case 'solde':      return badge('#d1fae5', '#065f46', 'Facture de solde');
    case 'avoir':      return badge('#fee2e2', '#991b1b', 'Facture rectificative');
    case 'recurrente': return badge('#ede9fe', '#5b21b6', 'Échéance récurrente');
    default:           return '';
  }
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
  // Mention obligatoire pour les sociétés (C. com. R. 123-237) — forme juridique + capital social
  const formCapital = partyFormCapitalLine(p);
  if (formCapital)         lines.push(`<div class="muted">${escapeHtml(formCapital)}</div>`);
  if (p.address)           lines.push(`<div class="muted">${escapeHtml(p.address)}</div>`);
  if (p.zipCode || p.city) lines.push(`<div class="muted">${escapeHtml([p.zipCode, p.city].filter(Boolean).join(' '))}</div>`);
  if (p.country)           lines.push(`<div class="muted">${escapeHtml(p.country)}</div>`);
  if (p.email)             lines.push(`<div class="muted">${escapeHtml(p.email)}</div>`);
  if (p.phone)             lines.push(`<div class="muted">${escapeHtml(p.phone)}</div>`);
  // SIRET + ville d'immatriculation RCS (C. com. R. 123-237)
  const idLine = partyRegistrationLine(p);
  if (idLine)              lines.push(`<div class="muted">${escapeHtml(idLine)}</div>`);
  if (p.vatNumber)         lines.push(`<div class="muted">N° TVA : ${escapeHtml(p.vatNumber)}</div>`);
  return lines.join('');
}

/** "SARL au capital de 10 000 €" — obligatoire pour les sociétés. */
export function partyFormCapitalLine(p: Party): string {
  if (!p.legalForm) return '';
  if (p.shareCapital) return `${p.legalForm} au capital de ${p.shareCapital}`;
  return p.legalForm;
}

/** "SIRET 123 456 789 00010 — RCS Paris" — la ville d'immatriculation est obligatoire. */
export function partyRegistrationLine(p: Party): string {
  const parts: string[] = [];
  if (p.siret)   parts.push(`SIRET : ${p.siret}`);
  if (p.rcsCity) parts.push(`RCS ${p.rcsCity}`);
  return parts.join(' — ');
}

function renderMeta(data: InvoiceData, _theme: InvoiceTheme): string {
  const dueLabel = dueDateLabelFor(data);
  const dueValue = dueDateValueFor(data);
  const cell = (label: string, value: string) =>
    `<div><span class="label" style="display:inline-block;margin-right:6px;">${escapeHtml(label)}</span> ${escapeHtml(value)}</div>`;
  const cells: string[] = [
    cell('Date', formatDateFr(data.issueDate)),
    // Date de livraison / exécution — Art. 242 nonies A, Ann. II CGI
    ...(data.deliveryDate ? [cell('Livraison', formatDateFr(data.deliveryDate))] : []),
    cell(dueLabel, dueValue),
    cell('Devise', data.currency),
    ...(data.purchaseOrderRef ? [cell('Bon de cmd', data.purchaseOrderRef)] : []),
  ];
  return `<div class="invoice-section" style="display:flex;gap:24px;flex-wrap:wrap;font-size:11pt;">${cells.join('')}</div>`;
}

function dueDateLabelFor(data: InvoiceData): string {
  switch (data.type) {
    case 'pro-forma':  return 'Valable jusqu\'au';
    case 'avoir':      return 'Date d\'émission';
    case 'recurrente': return 'Prochaine échéance';
    default:           return 'Échéance';
  }
}

function dueDateValueFor(data: InvoiceData): string {
  if (data.type === 'pro-forma' && data.typeSpecific.proForma?.validUntil) {
    return formatDateFr(data.typeSpecific.proForma.validUntil);
  }
  if (data.type === 'recurrente' && data.typeSpecific.recurrente?.nextBillingDate) {
    return formatDateFr(data.typeSpecific.recurrente.nextBillingDate);
  }
  if (data.type === 'avoir') return formatDateFr(data.issueDate);
  return formatDateFr(data.dueDate);
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
    // Tokens stay as-is in qty / unit price / vat so the template's pills
    // survive into the rendered HTML; concrete numbers go through formatters.
    const cells = cols.map((c) => {
      switch (c.key) {
        case 'description': return `<td>${escapeHtml(line.description)}</td>`;
        case 'qty':         return `<td class="num">${escapeHtml(String(line.quantity))}</td>`;
        case 'unitPrice':   return `<td class="num">${typeof line.unitPrice === 'string' ? escapeHtml(line.unitPrice) : formatMoney(line.unitPrice, data.currency)}</td>`;
        case 'vat':         return `<td class="num">${typeof line.vatRate === 'string' ? escapeHtml(line.vatRate) : `${line.vatRate}%`}</td>`;
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
  const isAvoir = data.type === 'avoir';
  const sign = isAvoir ? -1 : 1;
  const fmt = (n: number) => formatMoney(sign * n, data.currency);

  const discountRow = totals.totalDiscount > 0
    ? `<div class="totals-row"><span>Remises</span><span>-${formatMoney(totals.totalDiscount, data.currency)}</span></div>`
    : '';
  const vatRows = totals.vatBreakdown.map((v) =>
    `<div class="totals-row"><span>TVA ${v.rate}%</span><span>${fmt(v.amount)}</span></div>`,
  ).join('');

  // Solde — soustraction des acomptes déjà facturés.
  let acompteRows = '';
  let netDue = totals.totalTTC * sign;
  if (data.type === 'solde' && data.typeSpecific.solde) {
    const acomptes = data.typeSpecific.solde.acomptes;
    if (acomptes.length > 0) {
      acompteRows = acomptes.map((a) =>
        `<div class="totals-row"><span>Acompte ${escapeHtml(a.ref || '—')}</span><span>-${formatMoney(a.amountTTC, data.currency)}</span></div>`,
      ).join('');
      const paid = acomptes.reduce((s, a) => s + a.amountTTC, 0);
      netDue = totals.totalTTC - paid;
    }
  }

  const grandLabel = grandTotalLabelFor(data);

  return `<div class="invoice-section">
    <div class="totals-box">
      <div class="totals-row"><span>Sous-total HT</span><span>${fmt(totals.subtotalHT)}</span></div>
      ${discountRow}
      ${vatRows}
      <div class="totals-row"><span>Total TTC</span><span>${fmt(totals.totalTTC)}</span></div>
      ${acompteRows}
      <div class="totals-row grand"><span>${escapeHtml(grandLabel)}</span><span>${formatMoney(netDue, data.currency)}</span></div>
    </div>
  </div>`;
}

function grandTotalLabelFor(data: InvoiceData): string {
  switch (data.type) {
    case 'pro-forma': return 'Estimation TTC';
    case 'acompte':   return 'Acompte à régler TTC';
    case 'solde':     return 'Solde à régler TTC';
    case 'avoir':     return 'Total à déduire TTC';
    default:          return 'Total à régler TTC';
  }
}

function renderPayment(data: InvoiceData, _theme: InvoiceTheme): string {
  // Pro-forma & Avoir n'engendrent pas de règlement direct ; on masque le bloc.
  if (data.type === 'pro-forma') return '';
  if (data.type === 'avoir' && data.typeSpecific.avoir?.refundMethod === 'credit_note') return '';

  const rows: string[] = [];
  if (data.payment.paymentTerms) rows.push(`<div><span class="label" style="display:inline-block;margin-right:6px;">Conditions</span>${escapeHtml(data.payment.paymentTerms)}</div>`);
  if (data.payment.iban)         rows.push(`<div><span class="label" style="display:inline-block;margin-right:6px;">IBAN</span>${escapeHtml(data.payment.iban)}</div>`);
  if (data.payment.bic)          rows.push(`<div><span class="label" style="display:inline-block;margin-right:6px;">BIC</span>${escapeHtml(data.payment.bic)}</div>`);
  if (data.payment.bankName)     rows.push(`<div><span class="label" style="display:inline-block;margin-right:6px;">Banque</span>${escapeHtml(data.payment.bankName)}</div>`);

  // SEPA mention pour les factures récurrentes (règlement EU 260/2012 — RUM obligatoire).
  if (data.type === 'recurrente' && data.typeSpecific.recurrente?.sepaMandateRum) {
    rows.push(`<div><span class="label" style="display:inline-block;margin-right:6px;">Prélèvement</span>SEPA — Mandat RUM : ${escapeHtml(data.typeSpecific.recurrente.sepaMandateRum)}</div>`);
  }

  if (rows.length === 0) return '';
  return `<div class="invoice-section box" style="font-size:10pt;">
    <div class="label" style="margin-bottom:8px;">Informations de paiement</div>
    ${rows.join('')}
  </div>`;
}

function renderFooter(data: InvoiceData, theme: InvoiceTheme, sizes: ReturnType<typeof scaleSizes>): string {
  const mentions = buildFooterMentions(data);

  if (mentions.length === 0) return '';
  return `<div class="invoice-section" style="border-top:1px solid #e2e8f0;padding-top:12px;font-size:${sizes.xs};color:${theme.colors.muted};line-height:1.5;">
    ${mentions.map((m) => `<div>${escapeHtml(m)}</div>`).join('')}
  </div>`;
}

/** Mentions légales — communes + type-spécifiques (FR/EU). */
export function buildFooterMentions(data: InvoiceData): string[] {
  const mentions: string[] = [];

  if (data.notes.trim()) mentions.push(data.notes.trim());

  // Mentions communes (CGI / Code de commerce).
  if (isVatExempt(data))           mentions.push('TVA non applicable, art. 293 B du CGI.');
  if (data.legal.showNoDiscount)   mentions.push('Escompte pour règlement anticipé : néant.');
  if (data.legal.showLatePenalty)  mentions.push(`En cas de retard de paiement, pénalités exigibles au taux de ${data.payment.latePenaltyRate}% l'an, dues le jour suivant la date d'échéance sans qu'un rappel soit nécessaire (art. L. 441-10 C. com.).`);
  if (data.legal.showRecoveryFee)  mentions.push(`Tout professionnel en situation de retard de paiement est de plein droit débiteur d'une indemnité forfaitaire pour frais de recouvrement de ${formatMoney(data.payment.recoveryFee, data.currency)} (art. D. 441-5 C. com.).`);
  if (data.legal.showAutoLiquidation)   mentions.push('Auto-liquidation — TVA due par le preneur (art. 283-2 du CGI).');
  if (data.legal.showIntraCommunityVat) mentions.push('Exonération de TVA — Livraison intracommunautaire, art. 262 ter I du CGI.');
  if (data.legal.showOptionDebits)      mentions.push('TVA acquittée d\'après les débits — option exercée par le prestataire (art. 269-2-c CGI).');

  // Nature de l'opération — facturation électronique (sept. 2026).
  if (data.operationNature) {
    const natLabel: Record<NonNullable<InvoiceData['operationNature']>, string> = {
      goods:    'Livraison de biens',
      services: 'Prestation de services',
      mixed:    'Opération mixte (biens et services)',
    };
    mentions.push(`Nature de l'opération : ${natLabel[data.operationNature]}.`);
  }

  // Mentions type-spécifiques (CGI, jurisprudence et pratiques FR).
  switch (data.type) {
    case 'pro-forma':
      mentions.push('Document à valeur informative — sans valeur fiscale ni comptable. Ne constitue pas une facture au sens des articles 289 et suivants du CGI.');
      if (data.typeSpecific.proForma?.acceptanceClause) {
        mentions.push(data.typeSpecific.proForma.acceptanceClause);
      }
      break;
    case 'acompte':
      mentions.push('TVA exigible sur les acomptes encaissés conformément à l\'article 269-2-a bis du CGI.');
      mentions.push('Une facture de solde viendra clôturer la commande.');
      break;
    case 'solde':
      if (data.typeSpecific.solde?.commandeRef) {
        mentions.push(`Facture de solde — clôture de la commande N° ${data.typeSpecific.solde.commandeRef}.`);
      }
      break;
    case 'avoir':
      mentions.push('Facture rectificative établie conformément aux articles 289 et 272 du CGI.');
      if (data.typeSpecific.avoir?.originalInvoiceRef) {
        const d = data.typeSpecific.avoir.originalInvoiceDate;
        mentions.push(`Annule et remplace partiellement la facture N° ${data.typeSpecific.avoir.originalInvoiceRef}${d ? ` du ${formatDateFr(d)}` : ''}.`);
      }
      mentions.push(
        data.typeSpecific.avoir?.refundMethod === 'refund'
          ? 'Cet avoir donnera lieu à un remboursement par virement.'
          : 'Cet avoir vient en déduction de la prochaine facture.',
      );
      break;
    case 'recurrente':
      mentions.push('Facture émise en exécution du contrat d\'abonnement en cours.');
      if (data.typeSpecific.recurrente?.sepaMandateRum) {
        mentions.push('Prélèvement SEPA automatique — Règlement (UE) n° 260/2012.');
      }
      break;
    default: break;
  }

  if (data.legal.customText.trim()) mentions.push(data.legal.customText.trim());
  return mentions;
}

// ─── Type-specific block (between meta and lines) ──────────────────────────

function renderTypeSpecific(data: InvoiceData, theme: InvoiceTheme, sizes: ReturnType<typeof scaleSizes>): string {
  const body = typeSpecificBodyHtml(data, theme, sizes);
  if (!body) return '';
  const title = typeSpecificTitleFor(data.type);
  return `<div class="invoice-section box-accent" style="font-size:${sizes.small};">
    <div class="label" style="margin-bottom:6px;">${escapeHtml(title)}</div>
    ${body}
  </div>`;
}

function typeSpecificTitleFor(t: InvoiceData['type']): string {
  switch (t) {
    case 'pro-forma':  return 'Conditions du devis';
    case 'acompte':    return 'Référence de la commande';
    case 'solde':      return 'Acomptes déjà facturés';
    case 'avoir':      return 'Facture rectifiée';
    case 'recurrente': return 'Période et récurrence';
    default:           return '';
  }
}

function typeSpecificBodyHtml(data: InvoiceData, _theme: InvoiceTheme, _sizes: ReturnType<typeof scaleSizes>): string {
  const kv = (k: string, v: string) =>
    `<div><span class="label" style="display:inline-block;margin-right:6px;min-width:130px;">${escapeHtml(k)}</span>${escapeHtml(v)}</div>`;

  switch (data.type) {
    case 'pro-forma': {
      const pf = data.typeSpecific.proForma;
      if (!pf) return '';
      const rows: string[] = [];
      if (pf.validUntil) rows.push(kv('Valable jusqu\'au', formatDateFr(pf.validUntil)));
      return rows.join('');
    }
    case 'acompte': {
      const a = data.typeSpecific.acompte;
      if (!a) return '';
      const rows: string[] = [];
      if (a.commandeRef)         rows.push(kv('N° commande / devis', a.commandeRef));
      if (a.commandeDate)        rows.push(kv('Date commande', formatDateFr(a.commandeDate)));
      if (a.totalContractHT > 0) rows.push(kv('Montant total HT', formatMoney(a.totalContractHT, data.currency)));
      if (a.depositPercent > 0)  rows.push(kv('Pourcentage acompte', `${a.depositPercent} %`));
      return rows.join('');
    }
    case 'solde': {
      const s = data.typeSpecific.solde;
      if (!s) return '';
      const rows: string[] = [];
      if (s.commandeRef)         rows.push(kv('N° commande', s.commandeRef));
      if (s.commandeDate)        rows.push(kv('Date commande', formatDateFr(s.commandeDate)));
      if (s.totalContractHT > 0) rows.push(kv('Montant total HT', formatMoney(s.totalContractHT, data.currency)));
      if (s.acomptes.length > 0) {
        const tbl = `<table style="width:100%;margin-top:8px;border-collapse:collapse;">
          <thead><tr>
            <th style="text-align:left;padding:4px 6px;border-bottom:1px solid #e2e8f0;">N° acompte</th>
            <th style="text-align:left;padding:4px 6px;border-bottom:1px solid #e2e8f0;">Date</th>
            <th style="text-align:right;padding:4px 6px;border-bottom:1px solid #e2e8f0;">Montant TTC</th>
          </tr></thead>
          <tbody>
            ${s.acomptes.map((a) => `<tr>
              <td style="padding:4px 6px;border-bottom:1px solid #f1f5f9;">${escapeHtml(a.ref || '—')}</td>
              <td style="padding:4px 6px;border-bottom:1px solid #f1f5f9;">${escapeHtml(a.date ? formatDateFr(a.date) : '—')}</td>
              <td style="padding:4px 6px;border-bottom:1px solid #f1f5f9;text-align:right;">${formatMoney(a.amountTTC, data.currency)}</td>
            </tr>`).join('')}
          </tbody>
        </table>`;
        rows.push(tbl);
      }
      return rows.join('');
    }
    case 'avoir': {
      const a = data.typeSpecific.avoir;
      if (!a) return '';
      const rows: string[] = [];
      if (a.originalInvoiceRef)  rows.push(kv('Facture rectifiée', a.originalInvoiceRef));
      if (a.originalInvoiceDate) rows.push(kv('Date facture', formatDateFr(a.originalInvoiceDate)));
      if (a.reason)              rows.push(kv('Motif', a.reason));
      rows.push(kv('Modalité', a.refundMethod === 'refund' ? 'Remboursement par virement' : 'Avoir à valoir'));
      return rows.join('');
    }
    case 'recurrente': {
      const r = data.typeSpecific.recurrente;
      if (!r) return '';
      const intervalLabel: Record<typeof r.interval, string> = {
        weekly: 'Hebdomadaire', monthly: 'Mensuelle', quarterly: 'Trimestrielle', yearly: 'Annuelle',
      };
      const rows: string[] = [];
      if (r.periodFrom && r.periodTo) rows.push(kv('Période facturée', `du ${formatDateFr(r.periodFrom)} au ${formatDateFr(r.periodTo)}`));
      rows.push(kv('Récurrence', intervalLabel[r.interval]));
      if (r.nextBillingDate) rows.push(kv('Prochaine échéance', formatDateFr(r.nextBillingDate)));
      if (r.contractRef)     rows.push(kv('N° contrat', r.contractRef));
      if (r.sepaMandateRum)  rows.push(kv('Mandat SEPA (RUM)', r.sepaMandateRum));
      return rows.join('');
    }
    default: return '';
  }
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
