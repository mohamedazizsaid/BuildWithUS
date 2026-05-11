import { ai } from '@/lib/api';
import { INVOICE_TARGETS, type InvoiceTarget } from './schema';
import type { InvoiceMapping } from './apply';

export type MappingSource = 'exact' | 'ai' | 'none';

export interface InvoiceMappingResult {
  mapping: InvoiceMapping;
  sources: Record<string, MappingSource>;
}

const COMBINING_MARKS = /[̀-ͯ]/g;

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .replaceAll(/[_\-\s]+/g, '');
}

// Per-target alias hints used during the exact-match pre-pass. Catches the
// common French/English column names so the AI doesn't have to.
const ALIASES: Record<string, string[]> = {
  'data.number':                 ['numero', 'numerofacture', 'invoice', 'invoicenumber', 'reference', 'ref'],
  'data.issueDate':              ['date', 'dateemission', 'issuedate', 'dateedition'],
  'data.dueDate':                ['echeance', 'duedate', 'dateecheance'],
  'data.client.name':            ['client', 'clientname', 'nom', 'nomclient', 'customer', 'raisonsociale', 'lastname', 'nomprenom'],
  'data.client.email':           ['email', 'mail', 'clientemail', 'courriel'],
  'data.client.phone':           ['telephone', 'tel', 'phone', 'mobile'],
  'data.client.address':         ['adresse', 'address', 'rue'],
  'data.client.zipCode':         ['cp', 'codepostal', 'zip', 'zipcode', 'postalcode'],
  'data.client.city':            ['ville', 'city', 'town'],
  'data.client.country':         ['pays', 'country'],
  'data.client.siret':           ['siret', 'siren'],
  'data.client.vatNumber':       ['tvaintracom', 'numerotva', 'vat', 'vatnumber', 'tva'],
  'data.lines[].description':    ['description', 'produit', 'designation', 'libelle', 'item'],
  'data.lines[].quantity':       ['quantite', 'qte', 'quantity', 'qty', 'nombre'],
  'data.lines[].unitPrice':      ['prix', 'prixunitaire', 'unitprice', 'price', 'puht', 'montantht'],
  'data.lines[].vatRate':        ['tva', 'tauxtva', 'vatrate', 'taxrate'],
};

function exactMatch(target: InvoiceTarget, normalizedHeaders: Map<string, string>): string | null {
  // Try the label and target path itself first
  const candidates = [
    target.label,
    target.path.split('.').pop() ?? '',
    ...(ALIASES[target.path] ?? []),
  ];
  for (const c of candidates) {
    const hit = normalizedHeaders.get(normalize(c));
    if (hit) return hit;
  }
  return null;
}

export async function buildInvoiceMapping(
  fileHeaders: string[],
  sampleRow: Record<string, string> | undefined,
): Promise<InvoiceMappingResult> {
  const mapping: InvoiceMapping = {};
  const sources: Record<string, MappingSource> = {};

  const normalizedHeaders = new Map<string, string>();
  for (const h of fileHeaders) {
    const k = normalize(h);
    if (!normalizedHeaders.has(k)) normalizedHeaders.set(k, h);
  }

  // 1. Exact / alias pass — cheap and covers most cases.
  const unmatched: InvoiceTarget[] = [];
  for (const t of INVOICE_TARGETS) {
    const hit = exactMatch(t, normalizedHeaders);
    if (hit) {
      mapping[t.path] = hit;
      sources[t.path] = 'exact';
    } else {
      mapping[t.path] = null;
      sources[t.path] = 'none';
      unmatched.push(t);
    }
  }

  // 2. AI pass for the leftovers — pass schema context so the model can reason.
  if (unmatched.length > 0) {
    try {
      const { mapping: aiMapping } = await ai.mapInvoiceFields({
        targets: unmatched.map((t) => ({ path: t.path, label: t.label, type: t.type, hint: t.hint ?? '' })),
        file_columns: fileHeaders,
        already_matched: Object.entries(mapping)
          .filter(([, v]) => v !== null)
          .map(([k, v]) => ({ target: k, column: v as string })),
        sample_row: sampleRow,
      });
      for (const t of unmatched) {
        const m = aiMapping[t.path];
        if (m && fileHeaders.includes(m)) {
          mapping[t.path] = m;
          sources[t.path] = 'ai';
        }
      }
    } catch {
      // AI failed — leave unmatched as null, user assigns manually
    }
  }

  return { mapping, sources };
}
