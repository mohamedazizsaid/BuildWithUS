// Variable tokens (`{{name}}`) embedded inside invoice string fields.
// Mirrors the contract editor's variable system so a tenant's custom variables
// (managed via /lib/api -> contractVariables) work in both templates.

import type { Invoice, InvoiceData, Party } from './types';

// Allowed inside `{{ ... }}`: letters, digits, underscore, dot. Whitespace
// inside the braces is tolerated but trimmed by `extractVariables`.
export const VARIABLE_TOKEN_RE = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;

// Invoice-block-specific variable categories shown in the editor's Variables
// panel, on top of the contract editor's `VARIABLE_PALETTE` (Prestataire,
// Client, etc.). Each token matches a default produced by
// `applyAutoTokensToInvoice` so a blank-save template's pills line up with
// the chips the user can drag from this list.
export const INVOICE_VARIABLE_CATEGORIES = [
  {
    label: 'Facture',
    bg: '#fef3c7', color: '#92400e', border: '#fde68a',
    vars: [
      { name: 'numero_facture',  label: 'N° de facture' },
      { name: 'bon_de_commande', label: 'Bon de commande' },
      { name: 'date_emission',   label: "Date d'émission" },
      { name: 'date_echeance',   label: "Date d'échéance" },
    ],
  },
  {
    label: 'Lignes',
    bg: '#dcfce7', color: '#166534', border: '#bbf7d0',
    vars: [
      { name: 'ligne_description_1', label: 'Description ligne 1' },
      { name: 'ligne_qte_1',         label: 'Qté ligne 1' },
      { name: 'ligne_prix_1',        label: 'PU HT ligne 1' },
      { name: 'ligne_tva_1',         label: 'TVA % ligne 1' },
      { name: 'ligne_description_2', label: 'Description ligne 2' },
      { name: 'ligne_qte_2',         label: 'Qté ligne 2' },
      { name: 'ligne_prix_2',        label: 'PU HT ligne 2' },
      { name: 'ligne_tva_2',         label: 'TVA % ligne 2' },
      { name: 'ligne_description_3', label: 'Description ligne 3' },
      { name: 'ligne_qte_3',         label: 'Qté ligne 3' },
      { name: 'ligne_prix_3',        label: 'PU HT ligne 3' },
      { name: 'ligne_tva_3',         label: 'TVA % ligne 3' },
    ],
  },
  {
    label: 'Paiement',
    bg: '#e0f2fe', color: '#0c4a6e', border: '#bae6fd',
    vars: [
      { name: 'iban',               label: 'IBAN' },
      { name: 'bic',                label: 'BIC' },
      { name: 'banque',             label: 'Banque' },
      { name: 'modalites_paiement', label: 'Modalités de paiement' },
    ],
  },
  {
    label: 'Marché public (B2G)',
    bg: '#fef9c3', color: '#713f12', border: '#fde68a',
    vars: [
      { name: 'pouvoir_adjudicateur', label: 'Pouvoir adjudicateur' },
      { name: 'reference_marche',     label: 'Référence marché' },
      { name: 'nom_marche',           label: 'Objet du marché' },
      { name: 'numero_engagement',    label: "N° engagement juridique" },
      { name: 'code_chorus',          label: 'Code service Chorus Pro' },
    ],
  },
  {
    label: 'Type spécifique',
    bg: '#ede9fe', color: '#5b21b6', border: '#ddd6fe',
    vars: [
      { name: 'numero_commande',      label: 'N° commande' },
      { name: 'date_commande',        label: 'Date commande' },
      { name: 'numero_contrat',       label: 'N° contrat' },
      { name: 'clause_acceptation',   label: "Clause d'acceptation" },
      { name: 'date_validite',        label: 'Date de validité (pro-forma)' },
      { name: 'facture_rectifiee',    label: 'Facture rectifiée' },
      { name: 'date_facture_origine', label: "Date facture d'origine" },
      { name: 'motif_avoir',          label: 'Motif avoir' },
      { name: 'mandat_sepa_rum',      label: 'Mandat SEPA (RUM)' },
      { name: 'periode_debut',        label: 'Période — début' },
      { name: 'periode_fin',          label: 'Période — fin' },
      { name: 'prochaine_echeance',   label: 'Prochaine échéance' },
    ],
  },
  {
    label: 'Notes & Mentions',
    bg: '#f1f5f9', color: '#475569', border: '#e2e8f0',
    vars: [
      { name: 'notes',                   label: 'Notes' },
      { name: 'mentions_personnalisees', label: 'Mentions personnalisées' },
    ],
  },
] as const;

/** Walk every user-editable string in the invoice and return the deduped
 *  list of variable names referenced (e.g. `client_name`). */
export function extractInvoiceVariables(invoice: Invoice): string[] {
  const found = new Set<string>();
  for (const s of walkStrings(invoice.data)) {
    for (const m of s.matchAll(VARIABLE_TOKEN_RE)) found.add(m[1]);
  }
  return Array.from(found);
}

/** Substitute `{{var}}` tokens in every invoice string with values from `vars`.
 *  Numeric line fields (qty / unit price / VAT rate) are resolved by parsing
 *  the substituted string into a number — unresolved tokens fall back to 0
 *  so totals compute. Unknown tokens in string fields are kept as-is. */
export function applyVariablesToInvoice(invoice: Invoice, vars: Record<string, string>): Invoice {
  const replace = (s: string) => s.replace(VARIABLE_TOKEN_RE, (whole, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? (vars[name] ?? '') : whole,
  );
  const resolveNumeric = (v: number | string): number | string => {
    if (typeof v === 'number') return v;
    const substituted = replace(v);
    // If a `{{token}}` survived (no matching column), keep the token visible
    // for the user to see what's missing. Otherwise parse to a number.
    if (VARIABLE_TOKEN_RE.test(substituted)) {
      VARIABLE_TOKEN_RE.lastIndex = 0;
      return substituted;
    }
    const n = Number.parseFloat(substituted.replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  };
  const data = invoice.data;
  return {
    ...invoice,
    data: {
      ...data,
      number: replace(data.number),
      notes: replace(data.notes),
      issueDate:    replace(data.issueDate),
      dueDate:      replace(data.dueDate),
      purchaseOrderRef: data.purchaseOrderRef ? replace(data.purchaseOrderRef) : data.purchaseOrderRef,
      seller: replaceParty(data.seller, replace),
      client: replaceParty(data.client, replace),
      lines: data.lines.map((l) => ({
        ...l,
        description: replace(l.description),
        quantity:    resolveNumeric(l.quantity),
        unitPrice:   resolveNumeric(l.unitPrice),
        vatRate:     resolveNumeric(l.vatRate),
      })),
      payment: {
        ...data.payment,
        paymentTerms: replace(data.payment.paymentTerms),
        iban: replace(data.payment.iban),
        bic: replace(data.payment.bic),
        bankName: replace(data.payment.bankName),
      },
      legal: { ...data.legal, customText: replace(data.legal.customText) },
      typeSpecific: replaceTypeSpecific(data.typeSpecific, replace),
    },
  };
}

function replaceTypeSpecific(
  ts: InvoiceData['typeSpecific'],
  replace: (s: string) => string,
): InvoiceData['typeSpecific'] {
  return {
    ...ts,
    proForma:   ts.proForma   ? { ...ts.proForma,   validUntil:          replace(ts.proForma.validUntil) }                 : ts.proForma,
    acompte:    ts.acompte    ? { ...ts.acompte,    commandeDate:        replace(ts.acompte.commandeDate) }                : ts.acompte,
    solde:      ts.solde      ? {
      ...ts.solde,
      commandeDate: replace(ts.solde.commandeDate),
      acomptes: ts.solde.acomptes.map((a) => ({ ...a, date: a.date ? replace(a.date) : a.date })),
    } : ts.solde,
    avoir:      ts.avoir      ? { ...ts.avoir,      originalInvoiceDate: replace(ts.avoir.originalInvoiceDate) }            : ts.avoir,
    recurrente: ts.recurrente ? {
      ...ts.recurrente,
      periodFrom:      replace(ts.recurrente.periodFrom),
      periodTo:        replace(ts.recurrente.periodTo),
      nextBillingDate: replace(ts.recurrente.nextBillingDate),
    } : ts.recurrente,
  };
}

function replaceParty(p: Party, replace: (s: string) => string): Party {
  return {
    ...p,
    name:         replace(p.name),
    address:      replace(p.address),
    city:         replace(p.city),
    zipCode:      replace(p.zipCode),
    country:      replace(p.country),
    email:        replace(p.email),
    phone:        replace(p.phone),
    siret:        replace(p.siret),
    vatNumber:    replace(p.vatNumber),
    legalForm:    p.legalForm    ? replace(p.legalForm)    : p.legalForm,
    shareCapital: p.shareCapital ? replace(p.shareCapital) : p.shareCapital,
    rcsCity:      p.rcsCity      ? replace(p.rcsCity)      : p.rcsCity,
    iban:         p.iban         ? replace(p.iban)         : p.iban,
    bic:          p.bic          ? replace(p.bic)          : p.bic,
    bankName:     p.bankName     ? replace(p.bankName)     : p.bankName,
  };
}

function* walkStrings(d: InvoiceData): Generator<string> {
  yield d.number; yield d.notes;
  yield d.issueDate; yield d.dueDate;
  if (d.purchaseOrderRef) yield d.purchaseOrderRef;
  yield* partyStrings(d.seller);
  yield* partyStrings(d.client);
  for (const l of d.lines) yield l.description;
  yield d.payment.paymentTerms; yield d.payment.iban; yield d.payment.bic; yield d.payment.bankName;
  yield d.legal.customText;
  // Type-specific date fields — kept walked so the Variables panel surfaces
  // tokens declared inside the active type block (acompte, pro-forma, etc.).
  const ts = d.typeSpecific;
  if (ts.proForma)   { yield ts.proForma.validUntil; }
  if (ts.acompte)    { yield ts.acompte.commandeDate; }
  if (ts.solde)      { yield ts.solde.commandeDate; for (const a of ts.solde.acomptes) if (a.date) yield a.date; }
  if (ts.avoir)      { yield ts.avoir.originalInvoiceDate; }
  if (ts.recurrente) { yield ts.recurrente.periodFrom; yield ts.recurrente.periodTo; yield ts.recurrente.nextBillingDate; }
}

function* partyStrings(p: Party): Generator<string> {
  yield p.name; yield p.address; yield p.city; yield p.zipCode; yield p.country;
  yield p.email; yield p.phone; yield p.siret; yield p.vatNumber;
  if (p.legalForm)    yield p.legalForm;
  if (p.shareCapital) yield p.shareCapital;
  if (p.rcsCity)      yield p.rcsCity;
  if (p.iban)         yield p.iban;
  if (p.bic)          yield p.bic;
  if (p.bankName)     yield p.bankName;
}

// Default `{{token}}` for every party + meta string field. When the user saves
// a template without typing anything (or dropping a variable) in a field, we
// fill it with the matching token here so the saved template is reusable.
//
// Names match the contract editor's `VARIABLE_PALETTE` where possible
// (`prestataire_*`, `client_*`) so a single CSV row can feed both contracts and
// invoices. Fields with no palette entry (seller email, city, etc.) get a
// reasonable new token and will surface in the editor's Variables panel after
// reload via `extractInvoiceVariables`.
const SELLER_TOKENS: Record<keyof Party, string> = {
  name:         'prestataire_nom',
  address:      'prestataire_adresse',
  city:         'prestataire_ville',
  zipCode:      'prestataire_code_postal',
  country:      'prestataire_pays',
  email:        'prestataire_email',
  phone:        'prestataire_telephone',
  siret:        'prestataire_siret',
  vatNumber:    'prestataire_tva',
  legalForm:    'prestataire_forme_juridique',
  shareCapital: 'prestataire_capital',
  rcsCity:      'prestataire_rcs',
  // Banking lives in `data.payment`, not on the party — these are kept here
  // for completeness but stay unmapped (we don't auto-token payment fields).
  logo:     '',
  iban:     '',
  bic:      '',
  bankName: '',
};

const CLIENT_TOKENS: Record<keyof Party, string> = {
  name:         'client_nom',
  address:      'client_adresse',
  city:         'client_ville',
  zipCode:      'client_code_postal',
  country:      'client_pays',
  email:        'client_email',
  phone:        'client_telephone',
  siret:        'client_siret',
  vatNumber:    'client_tva',
  legalForm:    'client_forme_juridique',
  shareCapital: 'client_capital',
  rcsCity:      'client_rcs',
  logo:     '',
  iban:     '',
  bic:      '',
  bankName: '',
};

/** Return a copy of the invoice with every empty string field across every
 *  block defaulted to a `{{token}}` placeholder. Non-empty fields, dates,
 *  numeric fields, selects, and computed totals are left untouched. */
export function applyAutoTokensToInvoice(invoice: Invoice): Invoice {
  const data = invoice.data;
  const ts = data.typeSpecific;
  return {
    ...invoice,
    data: {
      ...data,
      // Header + meta
      number:           tokenIfEmpty(data.number, 'numero_facture'),
      issueDate:        tokenIfDateLike(data.issueDate, 'date_emission'),
      dueDate:          tokenIfDateLike(data.dueDate,   'date_echeance'),
      purchaseOrderRef: data.purchaseOrderRef !== undefined
        ? tokenIfEmpty(data.purchaseOrderRef, 'bon_de_commande')
        : data.purchaseOrderRef,
      // Parties
      seller: autoTokenParty(data.seller, SELLER_TOKENS),
      client: autoTokenParty(data.client, CLIENT_TOKENS),
      // Lines — each row gets indexed tokens for every column so a multi-row
      // CSV can fill distinct description / qty / price / VAT per line.
      lines: data.lines.map((l, i) => ({
        ...l,
        description: tokenIfEmpty(l.description, `ligne_description_${i + 1}`),
        quantity:    autoNumericToken(l.quantity, `ligne_qte_${i + 1}`),
        unitPrice:   autoNumericToken(l.unitPrice, `ligne_prix_${i + 1}`),
        vatRate:     autoNumericToken(l.vatRate, `ligne_tva_${i + 1}`),
      })),
      // Payment block
      payment: {
        ...data.payment,
        paymentTerms: tokenIfEmpty(data.payment.paymentTerms, 'modalites_paiement'),
        iban:         tokenIfEmpty(data.payment.iban,         'iban'),
        bic:          tokenIfEmpty(data.payment.bic,          'bic'),
        bankName:     tokenIfEmpty(data.payment.bankName,     'banque'),
      },
      // Footer / legal mentions
      notes: tokenIfEmpty(data.notes, 'notes'),
      legal: {
        ...data.legal,
        customText: tokenIfEmpty(data.legal.customText, 'mentions_personnalisees'),
      },
      // Type-specific blocks — only fields the editor actually exposes per type.
      typeSpecific: {
        ...ts,
        proForma:   ts.proForma   ? autoTokenProForma(ts.proForma)     : ts.proForma,
        acompte:    ts.acompte    ? autoTokenAcompte(ts.acompte)       : ts.acompte,
        solde:      ts.solde      ? autoTokenSolde(ts.solde)           : ts.solde,
        avoir:      ts.avoir      ? autoTokenAvoir(ts.avoir)           : ts.avoir,
        recurrente: ts.recurrente ? autoTokenRecurrente(ts.recurrente) : ts.recurrente,
      },
    },
  };
}

function autoTokenProForma(p: InvoiceData['typeSpecific']['proForma']): InvoiceData['typeSpecific']['proForma'] {
  if (!p) return p;
  return {
    ...p,
    validUntil:       tokenIfDateLike(p.validUntil,       'date_validite'),
    acceptanceClause: tokenIfEmpty(p.acceptanceClause, 'clause_acceptation'),
  };
}

function autoTokenAcompte(a: InvoiceData['typeSpecific']['acompte']): InvoiceData['typeSpecific']['acompte'] {
  if (!a) return a;
  return {
    ...a,
    commandeRef:  tokenIfEmpty(a.commandeRef, 'numero_commande'),
    commandeDate: tokenIfDateLike(a.commandeDate, 'date_commande'),
  };
}

function autoTokenSolde(s: InvoiceData['typeSpecific']['solde']): InvoiceData['typeSpecific']['solde'] {
  if (!s) return s;
  return {
    ...s,
    commandeRef:  tokenIfEmpty(s.commandeRef, 'numero_commande'),
    commandeDate: tokenIfDateLike(s.commandeDate, 'date_commande'),
    acomptes: s.acomptes.map((a, i) => ({
      ...a,
      ref:  tokenIfEmpty(a.ref, `acompte_ref_${i + 1}`),
      date: a.date ? tokenIfDateLike(a.date, `acompte_date_${i + 1}`) : `{{acompte_date_${i + 1}}}`,
    })),
  };
}

function autoTokenAvoir(av: InvoiceData['typeSpecific']['avoir']): InvoiceData['typeSpecific']['avoir'] {
  if (!av) return av;
  return {
    ...av,
    originalInvoiceRef:  tokenIfEmpty(av.originalInvoiceRef, 'facture_rectifiee'),
    originalInvoiceDate: tokenIfDateLike(av.originalInvoiceDate, 'date_facture_origine'),
    reason:              tokenIfEmpty(av.reason, 'motif_avoir'),
  };
}

function autoTokenRecurrente(r: InvoiceData['typeSpecific']['recurrente']): InvoiceData['typeSpecific']['recurrente'] {
  if (!r) return r;
  return {
    ...r,
    contractRef:    tokenIfEmpty(r.contractRef,    'numero_contrat'),
    sepaMandateRum: tokenIfEmpty(r.sepaMandateRum, 'mandat_sepa_rum'),
    periodFrom:      tokenIfDateLike(r.periodFrom,      'periode_debut'),
    periodTo:        tokenIfDateLike(r.periodTo,        'periode_fin'),
    nextBillingDate: tokenIfDateLike(r.nextBillingDate, 'prochaine_echeance'),
  };
}

// Date fields previously held raw ISO strings (today's date, +30 days). When
// migrating to a token-everywhere model, replace those literals with the
// matching `{{token}}` so existing templates open as variables. Custom tokens
// or text the user typed are left untouched.
function tokenIfDateLike(value: string, token: string): string {
  if (!value) return `{{${token}}}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `{{${token}}}`;
  return value;
}

function autoTokenParty(p: Party, tokens: Record<keyof Party, string>): Party {
  const out: Party = { ...p };
  for (const key of Object.keys(tokens) as (keyof Party)[]) {
    const tok = tokens[key];
    if (!tok) continue; // skip unmapped (logo, iban, bic, bankName)
    const cur = out[key];
    if (typeof cur === 'string' && cur.trim() === '') {
      // Only assign string-typed party fields; logo is string|null and skipped above.
      (out as unknown as Record<string, string>)[key] = `{{${tok}}}`;
    }
  }
  return out;
}

function tokenIfEmpty(value: string, token: string): string {
  return value.trim() === '' ? `{{${token}}}` : value;
}

// Numeric line fields default to a token only when the field is "empty" —
// an empty string or NaN. `0` is preserved (valid for VAT-exempt invoices,
// "free item" lines, etc.). Concrete numbers and existing tokens are
// untouched.
function autoNumericToken(value: number | string, token: string): number | string {
  if (typeof value === 'string') {
    return value.trim() === '' ? `{{${token}}}` : value;
  }
  if (!Number.isFinite(value)) return `{{${token}}}`;
  return value;
}

/** Build the HTML used by `InlineText` to render `{{var}}` segments as
 *  styled pills. Plain text segments are escaped. */
export function renderTextWithPills(value: string): string {
  if (!value) return '';
  let out = '';
  let lastIdx = 0;
  for (const m of value.matchAll(VARIABLE_TOKEN_RE)) {
    const idx = m.index ?? 0;
    if (idx > lastIdx) out += escapeHtml(value.slice(lastIdx, idx));
    const compact = compactPillLabel(m[1]);
    out += `<span class="invoice-var" data-var="${escapeAttr(m[1])}" title="{{${escapeAttr(m[1])}}}" contenteditable="false">${escapeHtml(compact)}</span>`;
    lastIdx = idx + m[0].length;
  }
  if (lastIdx < value.length) out += escapeHtml(value.slice(lastIdx));
  return out;
}

// Shorten line-default tokens (`ligne_description_2` → `Desc 2`) so cells fit
// inside the table. Other tokens (`client_nom`, custom vars…) keep their full
// `{{name}}` look since they aren't bound by a narrow column.
function compactPillLabel(name: string): string {
  const m = /^ligne_(description|qte|prix|tva)_(\d+)$/.exec(name);
  if (!m) return `{{${name}}}`;
  const labels: Record<string, string> = { description: 'Desc', qte: 'Qté', prix: 'Prix', tva: 'TVA' };
  return `${labels[m[1]]} ${m[2]}`;
}

function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
function escapeAttr(s: string): string { return escapeHtml(s); }
