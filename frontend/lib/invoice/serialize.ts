import { v4 as uuid } from 'uuid';
import type { Invoice, InvoiceData, InvoiceLine, Party, BlockId } from './types';
import { INVOICE_SCHEMA_VERSION, ALL_BLOCKS } from './types';
import {
  defaultInvoice, defaultLayout, defaultTheme, defaultPayment, defaultLegal,
  defaultDesign, emptyParty, emptySeller,
} from './defaults';

// ─── v1 shape (legacy, what's currently saved in DB) ───────────────────────

interface InvoiceV1 {
  invoiceType?: string;
  invoiceNumber?: string;
  issueDate?: string;
  dueDate?: string;
  clientName?: string;
  clientEmail?: string;
  clientAddress?: string;
  clientSiret?: string;
  lines?: Array<{ id?: string; description?: string; quantity?: number; unitPrice?: number }>;
  tvaRate?: number;
  notes?: string;
  paymentTerms?: string;
}

// ─── Public API ────────────────────────────────────────────────────────────

/** Read whatever's in the DB and return a normalized v2 Invoice. */
export function deserialize(raw: string | null | undefined): Invoice {
  if (!raw) return defaultInvoice();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return defaultInvoice();
  }
  if (!parsed || typeof parsed !== 'object') return defaultInvoice();

  // v2: already normalized
  if ((parsed as Invoice).schema_version === INVOICE_SCHEMA_VERSION) {
    return ensureShape(parsed as Invoice);
  }

  // v1: legacy flat shape — migrate
  return migrateV1(parsed as InvoiceV1);
}

export function serialize(invoice: Invoice): string {
  return JSON.stringify(invoice);
}

// ─── v1 → v2 migration ─────────────────────────────────────────────────────

function migrateV1(v1: InvoiceV1): Invoice {
  const base = defaultInvoice();
  const flatRate = typeof v1.tvaRate === 'number' ? v1.tvaRate : 20;

  const data: InvoiceData = {
    ...base.data,
    type: (v1.invoiceType as InvoiceData['type']) || 'standard',
    number: v1.invoiceNumber || base.data.number,
    issueDate: v1.issueDate || base.data.issueDate,
    dueDate: v1.dueDate || base.data.dueDate,
    client: {
      ...emptyParty(),
      name: v1.clientName || '',
      email: v1.clientEmail || '',
      address: v1.clientAddress || '',
      siret: v1.clientSiret || '',
    },
    lines: (v1.lines ?? []).map<InvoiceLine>((l) => ({
      id: l.id || uuid(),
      description: l.description || '',
      quantity: l.quantity ?? 1,
      unitPrice: l.unitPrice ?? 0,
      vatRate: flatRate,            // promote flat tvaRate to per-line
    })),
    payment: { ...defaultPayment(), paymentTerms: v1.paymentTerms || '30 jours' },
    notes: v1.notes || '',
    legal: defaultLegal(),
    typeSpecific: {},
  };
  if (data.lines.length === 0) data.lines = base.data.lines;

  return { schema_version: INVOICE_SCHEMA_VERSION, data, layout: defaultLayout(), theme: defaultTheme() };
}

// ─── Shape guard (defends against partial/legacy v2 objects) ───────────────

function ensureShape(inv: Invoice): Invoice {
  const base = defaultInvoice();
  // Older saved invoices may lack the typeSpecific block — splice it in.
  const incomingOrder = (inv.layout?.blockOrder ?? base.layout.blockOrder) as BlockId[];
  const blockOrder: BlockId[] = incomingOrder.filter((b) => ALL_BLOCKS.includes(b));
  if (!blockOrder.includes('typeSpecific')) {
    const metaIdx = blockOrder.indexOf('meta');
    blockOrder.splice(metaIdx >= 0 ? metaIdx + 1 : 0, 0, 'typeSpecific');
  }
  const blockVisibility = { ...base.layout.blockVisibility, ...(inv.layout?.blockVisibility ?? {}) };
  if (blockVisibility.typeSpecific === undefined) blockVisibility.typeSpecific = false;

  return {
    schema_version: INVOICE_SCHEMA_VERSION,
    data: {
      ...base.data,
      ...inv.data,
      seller: { ...emptySeller(), ...(inv.data?.seller ?? {}) } as Party,
      client: { ...emptyParty(),  ...(inv.data?.client ?? {}) } as Party,
      payment: { ...defaultPayment(), ...(inv.data?.payment ?? {}) },
      legal:   { ...defaultLegal(),   ...(inv.data?.legal ?? {}) },
      typeSpecific: inv.data?.typeSpecific ?? {},
      lines:   (inv.data?.lines?.length ? inv.data.lines : base.data.lines).map((l) => ({
        id: l.id || uuid(),
        description: l.description ?? '',
        quantity: Number.isFinite(l.quantity) ? l.quantity : 1,
        unitPrice: Number.isFinite(l.unitPrice) ? l.unitPrice : 0,
        vatRate: Number.isFinite(l.vatRate) ? l.vatRate : 20,
        discount: l.discount,
      })),
    },
    layout: { ...base.layout, ...(inv.layout ?? {}), blockOrder, blockVisibility },
    theme:  { ...base.theme,  ...(inv.theme ?? {}),
      colors: { ...base.theme.colors, ...(inv.theme?.colors ?? {}) },
      logo:   { ...base.theme.logo,   ...(inv.theme?.logo ?? {}) },
      design: { ...defaultDesign(),   ...(inv.theme?.design ?? {}) },
    },
  };
}
