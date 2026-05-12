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
  // Mentions légales obligatoires pour les sociétés (C. com. R. 123-237) :
  legalForm?: string;      // "SARL", "SAS", "SA", "EURL", "Auto-entrepreneur" ...
  shareCapital?: string;   // "10 000 €" — capital social pour les sociétés
  rcsCity?: string;        // "Paris" → rendu en "RCS Paris" / "RM 75"
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
  showNoDiscount: boolean;         // "Escompte pour règlement anticipé : néant"
  showLatePenalty: boolean;        // "Pénalités de retard..." (art. L. 441-10 C. com.)
  showRecoveryFee: boolean;        // "Indemnité forfaitaire 40€..." (art. D. 441-5)
  showAutoLiquidation: boolean;    // « Auto-liquidation » — art. 283-2 CGI (B2B intra-EU services, BTP sous-traitance)
  showIntraCommunityVat: boolean;  // « Exonération de TVA, art. 262 ter I du CGI » — livraisons intracommunautaires B2B
  showOptionDebits: boolean;       // « Option pour les débits exercée » — prestataires ayant opté pour la TVA sur les débits
  customText: string;              // free-form additional legal notes
}

/** Nature de l'opération — obligatoire à partir de la facturation électronique (sept. 2026). */
export type OperationNature = 'goods' | 'services' | 'mixed';

export interface InvoiceMetadata {
  status?: 'draft' | 'sent' | 'paid' | 'cancelled' | 'overdue';
  recurrence?: {
    interval: 'monthly' | 'quarterly' | 'yearly';
    until?: string;                // ISO date
  };
}

// ─── Type-specific payloads (FR/EU regulatory shape) ───────────────────────
//
// Each invoice "type" carries information that the others legally don't —
// pro-forma needs a validity date, an avoir needs a reference to the original
// facture + motif, etc. We keep them all on InvoiceData under `typeSpecific`,
// optional, so the document remains backward-compatible.

export interface ProFormaInfo {
  validUntil: string;              // "Devis valable jusqu'au"
  acceptanceClause: string;        // "Pour acceptation, signer précédé de la mention « Bon pour accord »"
}

export interface AcompteInfo {
  commandeRef: string;             // référence du devis / bon de commande
  commandeDate: string;            // ISO date du devis / commande
  totalContractHT: number;         // montant total HT du contrat / commande
  depositPercent: number;          // % de l'acompte sur le total (pour affichage)
}

export interface AcompteReference {
  ref: string;                     // n° de facture d'acompte
  date: string;                    // ISO date d'émission
  amountHT: number;                // HT facturé
  amountTTC: number;               // TTC facturé
}

export interface SoldeInfo {
  commandeRef: string;
  commandeDate: string;
  totalContractHT: number;
  acomptes: AcompteReference[];    // liste des acomptes déjà facturés
}

export interface AvoirInfo {
  originalInvoiceRef: string;      // facture rectifiée (art. 289-I-2 CGI)
  originalInvoiceDate: string;
  reason: string;                  // motif (remise commerciale, retour, erreur, ...)
  refundMethod: 'credit_note' | 'refund'; // avoir à valoir / remboursement
}

export type RecurrenceInterval = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface RecurrenteInfo {
  periodFrom: string;              // ISO date — début de la période facturée
  periodTo: string;                // ISO date — fin de la période facturée
  interval: RecurrenceInterval;
  nextBillingDate: string;         // ISO date — prochaine émission
  sepaMandateRum: string;          // RUM — Référence Unique du Mandat (SEPA EU 260/2012)
  contractRef: string;             // n° de contrat d'abonnement source
}

export interface TypeSpecific {
  proForma?: ProFormaInfo;
  acompte?: AcompteInfo;
  solde?: SoldeInfo;
  avoir?: AvoirInfo;
  recurrente?: RecurrenteInfo;
}

export interface InvoiceData {
  type: InvoiceType;
  number: string;
  issueDate: string;               // ISO date — date d'émission de la facture
  deliveryDate?: string;           // ISO date — date de livraison/exécution (Art. 242 nonies A, Ann. II CGI)
  dueDate: string;                 // ISO date — échéance de paiement
  purchaseOrderRef?: string;       // référence du bon de commande (recommandé B2B, obligatoire dans certains marchés)
  operationNature?: OperationNature; // biens / services / mixte (obligatoire facturation électronique sept. 2026)
  currency: Currency;
  seller: Party;
  client: Party;
  lines: InvoiceLine[];
  payment: PaymentInfo;
  notes: string;
  legal: LegalMentions;
  typeSpecific: TypeSpecific;      // per-type regulatory fields (FR/EU)
  metadata?: InvoiceMetadata;      // reserved for recurring / status (v2 features)
}

// ─── Layout layer (presentation) ───────────────────────────────────────────

export type BlockId =
  | 'header' | 'parties' | 'meta' | 'typeSpecific' | 'lines' | 'totals' | 'payment' | 'footer';

export const ALL_BLOCKS: BlockId[] = [
  'header', 'parties', 'meta', 'typeSpecific', 'lines', 'totals', 'payment', 'footer',
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

// ─── Design controls (tables + borders + radius) ───────────────────────────
export type TableHeaderStyle = 'filled' | 'outline' | 'minimal';
export type TableRowStriping = 'none' | 'zebra_light' | 'zebra_accent';
export type TableCellBorders = 'all' | 'rows' | 'none';
export type BlockStyle = 'flat' | 'bordered' | 'shadowed';
export type CornerRadius = 'square' | 'soft' | 'rounded' | 'pill';

export interface InvoiceDesign {
  tableHeaderStyle: TableHeaderStyle;
  tableRowStriping: TableRowStriping;
  tableCellBorders: TableCellBorders;
  blockStyle: BlockStyle;
  cornerRadius: CornerRadius;
}

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
  design: InvoiceDesign;
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
