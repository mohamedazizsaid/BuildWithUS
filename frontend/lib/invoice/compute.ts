import type { Currency, InvoiceData, InvoiceLine, InvoiceTotals, VatBreakdownEntry } from './types';

// ─── Currency formatting ───────────────────────────────────────────────────

interface CurrencySpec {
  code: Currency;
  symbol: string;
  locale: string;
  position: 'before' | 'after';
}

export const CURRENCIES: CurrencySpec[] = [
  { code: 'EUR', symbol: '€',  locale: 'fr-FR', position: 'after'  },
  { code: 'USD', symbol: '$',  locale: 'en-US', position: 'before' },
  { code: 'GBP', symbol: '£',  locale: 'en-GB', position: 'before' },
  { code: 'CHF', symbol: 'CHF',locale: 'fr-CH', position: 'after'  },
  { code: 'CAD', symbol: 'CA$',locale: 'fr-CA', position: 'before' },
  { code: 'MAD', symbol: 'DH', locale: 'fr-MA', position: 'after'  },
  { code: 'TND', symbol: 'DT', locale: 'fr-TN', position: 'after'  },
];

export function currencyFor(code: Currency): CurrencySpec {
  return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];
}

export function formatMoney(amount: number, currency: Currency): string {
  const spec = currencyFor(currency);
  const n = round2(amount).toLocaleString(spec.locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return spec.position === 'before' ? `${spec.symbol} ${n}` : `${n} ${spec.symbol}`;
}

// ─── Rounding ──────────────────────────────────────────────────────────────

// Banker's-safe 2-decimal rounding used for displayed and stored monetary values.
export function round2(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// ─── Line math ─────────────────────────────────────────────────────────────

/** Total HT for a single line after its own discount. */
export function lineSubtotalHT(line: InvoiceLine): number {
  const gross = (line.quantity || 0) * (line.unitPrice || 0);
  if (!line.discount) return round2(gross);
  if (line.discount.type === 'percent') {
    return round2(gross * (1 - (line.discount.value || 0) / 100));
  }
  return round2(Math.max(0, gross - (line.discount.value || 0)));
}

export function lineDiscountAmount(line: InvoiceLine): number {
  const gross = (line.quantity || 0) * (line.unitPrice || 0);
  if (!line.discount) return 0;
  if (line.discount.type === 'percent') {
    return round2(gross * ((line.discount.value || 0) / 100));
  }
  return round2(Math.min(gross, line.discount.value || 0));
}

export function lineVAT(line: InvoiceLine): number {
  return round2(lineSubtotalHT(line) * ((line.vatRate || 0) / 100));
}

export function lineTotalTTC(line: InvoiceLine): number {
  return round2(lineSubtotalHT(line) + lineVAT(line));
}

// ─── Invoice totals ────────────────────────────────────────────────────────

export function computeTotals(data: InvoiceData): InvoiceTotals {
  let subtotalHT = 0;
  let totalDiscount = 0;
  const vatBuckets = new Map<number, { base: number; amount: number }>();

  for (const line of data.lines) {
    const ht = lineSubtotalHT(line);
    const vat = lineVAT(line);
    subtotalHT += ht;
    totalDiscount += lineDiscountAmount(line);
    const rate = line.vatRate || 0;
    const bucket = vatBuckets.get(rate) ?? { base: 0, amount: 0 };
    bucket.base += ht;
    bucket.amount += vat;
    vatBuckets.set(rate, bucket);
  }

  const vatBreakdown: VatBreakdownEntry[] = [...vatBuckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([rate, b]) => ({ rate, base: round2(b.base), amount: round2(b.amount) }));

  const totalVAT = round2(vatBreakdown.reduce((s, e) => s + e.amount, 0));
  const totalTTC = round2(subtotalHT + totalVAT);

  return {
    subtotalHT: round2(subtotalHT),
    totalDiscount: round2(totalDiscount),
    vatBreakdown,
    totalVAT,
    totalTTC,
  };
}

// ─── Auto-injected legal mentions ──────────────────────────────────────────

/** True if no line has VAT — triggers the "TVA non applicable" mention. */
export function isVatExempt(data: InvoiceData): boolean {
  return data.lines.every((l) => (l.vatRate || 0) === 0);
}
