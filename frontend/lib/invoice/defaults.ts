import { v4 as uuid } from 'uuid';
import type {
  Invoice, InvoiceData, InvoiceLayout, InvoiceTheme,
  Party, PaymentInfo, LegalMentions, BlockId, ColumnConfig,
  InvoiceType, TypeSpecific,
  ProFormaInfo, AcompteInfo, SoldeInfo, AvoirInfo, RecurrenteInfo,
} from './types';
import { INVOICE_SCHEMA_VERSION, ALL_BLOCKS } from './types';

export function emptyParty(): Party {
  return {
    name: '', address: '', city: '', zipCode: '', country: 'France',
    email: '', phone: '', siret: '', vatNumber: '',
  };
}

export function emptySeller(): Party {
  return {
    ...emptyParty(),
    logo: null,
    iban: '',
    bic: '',
    bankName: '',
  };
}

export function defaultPayment(): PaymentInfo {
  return {
    iban: '',
    bic: '',
    bankName: '',
    paymentTerms: '30 jours',
    latePenaltyRate: 10.15,        // French legal rate, indicative
    recoveryFee: 40,
  };
}

export function defaultLegal(): LegalMentions {
  return {
    showNoDiscount: true,
    showLatePenalty: true,
    showRecoveryFee: true,
    showAutoLiquidation: false,
    showIntraCommunityVat: false,
    showOptionDebits: false,
    customText: '',
  };
}

function todayIso(): string {
  return new Date().toISOString().split('T')[0];
}

function plusDaysIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

/** Prefix conventions used by French SMBs/ERPs to distinguish doc types at a glance. */
export const TYPE_NUMBER_PREFIX: Record<InvoiceType, string> = {
  standard:     'F',
  'pro-forma':  'PF',
  acompte:      'FA',
  solde:        'FS',
  avoir:        'AV',
  recurrente:   'FR',
};

export function nextInvoiceNumberFor(type: InvoiceType): string {
  const year = new Date().getFullYear();
  const seq = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
  return `${TYPE_NUMBER_PREFIX[type]}${year}-${seq}`;
}

function nextInvoiceNumber(): string {
  return nextInvoiceNumberFor('standard');
}

// ─── Type-specific defaults ────────────────────────────────────────────────

export function defaultProForma(): ProFormaInfo {
  return {
    validUntil: plusDaysIso(30),
    acceptanceClause: 'Pour acceptation, retourner ce document signé précédé de la mention « Bon pour accord ».',
  };
}

export function defaultAcompte(): AcompteInfo {
  return {
    commandeRef: '',
    commandeDate: todayIso(),
    totalContractHT: 0,
    depositPercent: 30,            // usage courant en France (30% à la commande)
  };
}

export function defaultSolde(): SoldeInfo {
  return {
    commandeRef: '',
    commandeDate: todayIso(),
    totalContractHT: 0,
    acomptes: [],
  };
}

export function defaultAvoir(): AvoirInfo {
  return {
    originalInvoiceRef: '',
    originalInvoiceDate: todayIso(),
    reason: '',
    refundMethod: 'credit_note',   // à valoir sur prochaine facture
  };
}

export function defaultRecurrente(): RecurrenteInfo {
  const from = todayIso();
  const to = plusDaysIso(30);
  return {
    periodFrom: from,
    periodTo: to,
    interval: 'monthly',
    nextBillingDate: plusDaysIso(30),
    sepaMandateRum: '',
    contractRef: '',
  };
}

/** Returns the type-specific payload populated for `type`, leaving others undefined. */
export function defaultTypeSpecific(type: InvoiceType): TypeSpecific {
  switch (type) {
    case 'pro-forma':  return { proForma: defaultProForma() };
    case 'acompte':    return { acompte: defaultAcompte() };
    case 'solde':      return { solde: defaultSolde() };
    case 'avoir':      return { avoir: defaultAvoir() };
    case 'recurrente': return { recurrente: defaultRecurrente() };
    case 'standard':
    default:           return {};
  }
}

/**
 * Per-type legal mention defaults.
 *
 *  - Pro-forma  → no late penalty (not yet due), no recovery fee.
 *  - Avoir      → no late penalty (it's a refund, nothing is due).
 *  - Standard / Acompte / Solde / Récurrente → full FR mentions on.
 */
export function defaultLegalForType(type: InvoiceType): LegalMentions {
  const off: LegalMentions = {
    showNoDiscount: false, showLatePenalty: false, showRecoveryFee: false,
    showAutoLiquidation: false, showIntraCommunityVat: false, showOptionDebits: false,
    customText: '',
  };
  switch (type) {
    case 'pro-forma': return off;   // sans valeur fiscale — aucune mention de pénalité
    case 'avoir':     return off;   // remboursement — aucune pénalité à devoir
    default:          return defaultLegal();
  }
}

export function defaultData(): InvoiceData {
  return {
    type: 'standard',
    number: nextInvoiceNumber(),
    issueDate: todayIso(),
    dueDate: plusDaysIso(30),
    currency: 'EUR',
    seller: emptySeller(),
    client: emptyParty(),
    lines: [
      { id: uuid(), description: 'Prestation de service', quantity: 1, unitPrice: 0, vatRate: 20 },
    ],
    payment: defaultPayment(),
    notes: '',
    legal: defaultLegal(),
    typeSpecific: {},
  };
}

export function defaultLayout(): InvoiceLayout {
  const visibility = Object.fromEntries(ALL_BLOCKS.map((b) => [b, true])) as Record<BlockId, boolean>;
  // typeSpecific is hidden by default — only meaningful for non-standard types.
  visibility.typeSpecific = false;
  const columns: ColumnConfig[] = [
    { key: 'description', visible: true },
    { key: 'qty',         visible: true },
    { key: 'unitPrice',   visible: true },
    { key: 'vat',         visible: true },
    { key: 'discount',    visible: false },
    { key: 'total',       visible: true },
  ];
  return {
    blockOrder: [...ALL_BLOCKS],
    blockVisibility: visibility,
    columns,
  };
}

export function defaultTheme(): InvoiceTheme {
  return {
    logo: { url: null, width: 120, align: 'left' },
    colors: {
      primary: '#0f172a',
      accent:  '#6366f1',
      text:    '#1a1a1a',
      muted:   '#64748b',
    },
    font: 'inter',
    fontScale: 'md',
    background: 'plain',
    design: defaultDesign(),
  };
}

export function defaultDesign(): import('./types').InvoiceDesign {
  return {
    tableHeaderStyle: 'filled',
    tableRowStriping: 'none',
    tableCellBorders: 'rows',
    blockStyle: 'flat',
    cornerRadius: 'soft',
  };
}

export function defaultInvoice(): Invoice {
  return {
    schema_version: INVOICE_SCHEMA_VERSION,
    data: defaultData(),
    layout: defaultLayout(),
    theme: defaultTheme(),
  };
}
