// Schema versioning lets us evolve the invoice shape without breaking old
// templates. Migrations live in serialize.ts.
export const INVOICE_SCHEMA_VERSION = 2 as const;

// ─── Top-level ─────────────────────────────────────────────────────────────

export interface Invoice {
  schema_version: typeof INVOICE_SCHEMA_VERSION;
  data: InvoiceData;
  layout: InvoiceLayout;
  theme: InvoiceTheme;
}

// ─── Data layer (accounting truth) ─────────────────────────────────────────

export type InvoiceType =
  | 'standard'
  | 'pro-forma'
  | 'acompte'
  | 'solde'
  | 'avoir'
  | 'recurrente';

export type Currency =
  | 'EUR' | 'USD' | 'GBP' | 'CHF' | 'CAD' | 'MAD' | 'TND';

export interface Party {
  name: string;
  address: string;
  city: string;
  zipCode: string;
  country: string;
  email: string;
  phone: string;
  siret: string;
  vatNumber: string;
  // For seller only:
  logo?: string | null;
  iban?: string;
  bic?: string;
  bankName?: string;
}

export interface InvoiceLine {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;                 // per-line VAT enables multi-rate invoices
  discount?: LineDiscount;
}

export interface LineDiscount {
  type: 'percent' | 'amount';
  value: number;
}

export interface PaymentInfo {
  iban: string;
  bic: string;
  bankName: string;
  paymentTerms: string;            // "30 jours", "À réception", ...
  latePenaltyRate: number;         // legal rate in France ≈ 3× taux d'intérêt légal
  recoveryFee: number;             // indemnité forfaitaire recouvrement (€40 par défaut FR)
}

export interface LegalMentions {
  showNoDiscount: boolean;         // "Pas d'escompte pour règlement anticipé"
  showLatePenalty: boolean;        // "Pénalités de retard..."
  showRecoveryFee: boolean;        // "Indemnité forfaitaire 40€..."
  customText: string;              // free-form additional legal notes
}

export interface InvoiceMetadata {
  status?: 'draft' | 'sent' | 'paid' | 'cancelled' | 'overdue';
  recurrence?: {
    interval: 'monthly' | 'quarterly' | 'yearly';
    until?: string;                // ISO date
  };
}

export interface InvoiceData {
  type: InvoiceType;
  number: string;
  issueDate: string;               // ISO date
  dueDate: string;                 // ISO date
  currency: Currency;
  seller: Party;
  client: Party;
  lines: InvoiceLine[];
  payment: PaymentInfo;
  notes: string;
  legal: LegalMentions;
  metadata?: InvoiceMetadata;      // reserved for recurring / status (v2 features)
}

// ─── Layout layer (presentation) ───────────────────────────────────────────

export type BlockId =
  | 'header' | 'parties' | 'meta' | 'lines' | 'totals' | 'payment' | 'footer';

export const ALL_BLOCKS: BlockId[] = [
  'header', 'parties', 'meta', 'lines', 'totals', 'payment', 'footer',
];

// Blocks that must always be visible — hiding them would break the document.
export const ESSENTIAL_BLOCKS: BlockId[] = ['lines', 'totals'];

export type ColumnKey =
  | 'description' | 'qty' | 'unitPrice' | 'vat' | 'discount' | 'total';

export const ESSENTIAL_COLUMNS: ColumnKey[] = ['description', 'qty', 'unitPrice', 'total'];

export interface ColumnConfig {
  key: ColumnKey;
  visible: boolean;
}

export interface InvoiceLayout {
  blockOrder: BlockId[];
  blockVisibility: Record<BlockId, boolean>;
  columns: ColumnConfig[];
}

// ─── Theme layer (branding) ────────────────────────────────────────────────

export type FontFamily = 'inter' | 'roboto' | 'opensans';
export type FontScale = 'sm' | 'md' | 'lg';
export type BackgroundStyle = 'plain' | 'watermark' | 'header_band';

export interface InvoiceTheme {
  logo: {
    url: string | null;
    width: number;                 // px
    align: 'left' | 'center' | 'right';
  };
  colors: {
    primary: string;               // headers, totals row
    accent: string;                // separators, badges
    text: string;
    muted: string;
  };
  font: FontFamily;
  fontScale: FontScale;
  background: BackgroundStyle;
}

// ─── Derived (compute output, never stored) ────────────────────────────────

export interface VatBreakdownEntry {
  rate: number;
  base: number;                    // HT sum at this rate
  amount: number;                  // VAT amount
}

export interface InvoiceTotals {
  subtotalHT: number;              // sum of (qty × unit − discount), pre-VAT
  totalDiscount: number;           // sum of all line discounts
  vatBreakdown: VatBreakdownEntry[];
  totalVAT: number;
  totalTTC: number;
}
