// The catalog of fields a CSV/JSON row can map TO when bulk-importing invoices.
// Lives separately from `types.ts` (which describes the runtime shape) — this
// file describes the *importable* surface, which is intentionally narrower:
// totals are computed (not importable), seller/theme/payment come from the
// template (not importable), etc.

export type TargetKind = 'scalar' | 'line';

export type TargetType =
  | 'string'
  | 'number'
  | 'integer'
  | 'date'         // ISO YYYY-MM-DD
  | 'email'
  | 'siret'        // 14 digits
  | 'vatNumber'    // FR XX 999999999 (loose check)
  | 'iban'         // loose IBAN check
  | 'currency';    // ISO code

export interface InvoiceTarget {
  path: string;          // dotted path, e.g. "data.client.name" or "data.lines[].quantity"
  label: string;         // French label shown in UI
  hint?: string;         // short description / example
  kind: TargetKind;      // scalar (1 per invoice) or line (1 per row of the line items table)
  type: TargetType;      // expected value type after coercion
  required?: boolean;    // blocks save if missing
  section: 'meta' | 'client' | 'line';
}

export const INVOICE_TARGETS: InvoiceTarget[] = [
  // ── Meta ────────────────────────────────────────────────────────────────
  { path: 'data.number',     label: 'Numéro de facture', hint: 'F2026-001', kind: 'scalar', type: 'string', section: 'meta' },
  { path: 'data.issueDate',  label: "Date d'émission",    hint: 'AAAA-MM-JJ', kind: 'scalar', type: 'date',   section: 'meta' },
  { path: 'data.dueDate',    label: "Date d'échéance",    hint: 'AAAA-MM-JJ', kind: 'scalar', type: 'date',   section: 'meta' },

  // ── Client ──────────────────────────────────────────────────────────────
  { path: 'data.client.name',      label: 'Nom du client',     kind: 'scalar', type: 'string',    section: 'client', required: true },
  { path: 'data.client.email',     label: 'Email client',      kind: 'scalar', type: 'email',     section: 'client' },
  { path: 'data.client.phone',     label: 'Téléphone client',  kind: 'scalar', type: 'string',    section: 'client' },
  { path: 'data.client.address',   label: 'Adresse client',    kind: 'scalar', type: 'string',    section: 'client' },
  { path: 'data.client.zipCode',   label: 'Code postal',       kind: 'scalar', type: 'string',    section: 'client' },
  { path: 'data.client.city',      label: 'Ville',             kind: 'scalar', type: 'string',    section: 'client' },
  { path: 'data.client.country',   label: 'Pays',              kind: 'scalar', type: 'string',    section: 'client' },
  { path: 'data.client.siret',     label: 'SIRET',             kind: 'scalar', type: 'siret',     section: 'client' },
  { path: 'data.client.vatNumber', label: 'N° TVA',            kind: 'scalar', type: 'vatNumber', section: 'client' },

  // ── Line item (one row of CSV becomes one line — MVP Mode A) ───────────
  { path: 'data.lines[].description', label: 'Description',        kind: 'line', type: 'string',  section: 'line', required: true },
  { path: 'data.lines[].quantity',    label: 'Quantité',           kind: 'line', type: 'number',  section: 'line', required: true },
  { path: 'data.lines[].unitPrice',   label: 'Prix unitaire HT',   kind: 'line', type: 'number',  section: 'line', required: true },
  { path: 'data.lines[].vatRate',     label: 'Taux TVA (%)',       kind: 'line', type: 'number',  section: 'line' },
];

export const REQUIRED_TARGETS = INVOICE_TARGETS.filter((t) => t.required).map((t) => t.path);

export function targetByPath(path: string): InvoiceTarget | undefined {
  return INVOICE_TARGETS.find((t) => t.path === path);
}

// Path → user-readable label, used in error messages.
export function labelForPath(path: string): string {
  return targetByPath(path)?.label ?? path;
}
