import { v4 as uuid } from 'uuid';
import type {
  Invoice, InvoiceData, InvoiceLayout, InvoiceTheme,
  Party, PaymentInfo, LegalMentions, BlockId, ColumnConfig,
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

function nextInvoiceNumber(): string {
  const year = new Date().getFullYear();
  const seq = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
  return `F${year}-${seq}`;
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
  };
}

export function defaultLayout(): InvoiceLayout {
  const visibility = Object.fromEntries(ALL_BLOCKS.map((b) => [b, true])) as Record<BlockId, boolean>;
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
