import { v4 as uuid } from 'uuid';
import type { Invoice, InvoiceLine } from '../types';
import { INVOICE_TARGETS, REQUIRED_TARGETS, targetByPath, labelForPath } from './schema';
import { coerce, classifyErrors, requiredMissing, type FieldError, type RowValidation } from './validate';

// Mapping is a record of { invoice target path → CSV column name | null }.
export type InvoiceMapping = Record<string, string | null>;

export interface AppliedRow {
  invoice: Invoice;            // template clone with this row's values applied
  validation: RowValidation;
}

/**
 * Take a template invoice + a single CSV row + the mapping, and produce a
 * filled invoice (with one line). The template's seller, theme, payment, etc.
 * are preserved — only the mapped fields are overwritten.
 */
export function applyMappingToRow(
  template: Invoice,
  row: Record<string, string>,
  mapping: InvoiceMapping,
): AppliedRow {
  // Deep-clone the data portion we'll mutate (layout/theme stay shared refs — safe, never mutated)
  const data = structuredClone(template.data);
  data.lines = [{
    id: uuid(),
    description: '',
    quantity: 1,
    unitPrice: 0,
    vatRate: template.data.lines[0]?.vatRate ?? 20,
  }];
  const line: InvoiceLine = data.lines[0];

  const errors: FieldError[] = [];

  for (const target of INVOICE_TARGETS) {
    const col = mapping[target.path];
    if (!col) continue;
    const rawValue = row[col];
    const { value, error } = coerce(rawValue, target.type, target.path);
    if (error) errors.push(error);
    assign(data, line, target.path, value);
  }

  // Required field check — only after applying everything.
  for (const reqPath of REQUIRED_TARGETS) {
    if (isEmpty(readPath(data, line, reqPath))) {
      errors.push(requiredMissing(reqPath, labelForPath(reqPath)));
    }
  }

  return {
    invoice: { ...template, data },
    validation: classifyErrors(errors),
  };
}

/** Apply mapping to all rows. Returns per-row results — caller decides what to do with errors. */
export function applyMappingToRows(
  template: Invoice,
  rows: Record<string, string>[],
  mapping: InvoiceMapping,
): AppliedRow[] {
  return rows.map((row) => applyMappingToRow(template, row, mapping));
}

// ─── Path I/O for our specific shapes ──────────────────────────────────────

function assign(data: Invoice['data'], line: InvoiceLine, path: string, value: unknown): void {
  // Line-level paths
  if (path.startsWith('data.lines[].')) {
    const field = path.slice('data.lines[].'.length) as keyof InvoiceLine;
    (line as Record<string, unknown>)[field as string] = value;
    return;
  }
  // Nested client paths
  if (path.startsWith('data.client.')) {
    const field = path.slice('data.client.'.length);
    (data.client as Record<string, unknown>)[field] = value;
    return;
  }
  // Top-level data.* paths
  if (path.startsWith('data.')) {
    const field = path.slice('data.'.length);
    (data as Record<string, unknown>)[field] = value;
    return;
  }
}

function readPath(data: Invoice['data'], line: InvoiceLine, path: string): unknown {
  if (path.startsWith('data.lines[].')) return (line as Record<string, unknown>)[path.slice('data.lines[].'.length)];
  if (path.startsWith('data.client.'))  return (data.client as Record<string, unknown>)[path.slice('data.client.'.length)];
  if (path.startsWith('data.'))         return (data as Record<string, unknown>)[path.slice('data.'.length)];
  return undefined;
}

function isEmpty(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (typeof v === 'number') return v === 0; // for required quantity/price 0 is also "missing-ish" — acceptable for our use
  return false;
}
