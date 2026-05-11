import { ai } from '@/lib/api';

export type MappingSource = 'exact' | 'ai' | 'none';

export interface MappingResult {
  mapping: Record<string, string | null>;
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

export async function buildVariableMapping(
  templateVars: string[],
  fileHeaders: string[],
  sampleRow: Record<string, string> | undefined,
): Promise<MappingResult> {
  const mapping: Record<string, string | null> = {};
  const sources: Record<string, MappingSource> = {};

  const headerByNormalized = new Map<string, string>();
  for (const h of fileHeaders) {
    const k = normalize(h);
    if (!headerByNormalized.has(k)) headerByNormalized.set(k, h);
  }

  const unmatched: string[] = [];
  for (const v of templateVars) {
    const exact = headerByNormalized.get(normalize(v));
    if (exact) {
      mapping[v] = exact;
      sources[v] = 'exact';
    } else {
      unmatched.push(v);
    }
  }

  if (unmatched.length > 0) {
    try {
      const { mapping: aiMapping } = await ai.mapVariables({
        template_vars: unmatched,
        file_columns: fileHeaders,
        sample_row: sampleRow,
      });
      for (const v of unmatched) {
        const m = aiMapping[v];
        mapping[v] = m ?? null;
        sources[v] = m ? 'ai' : 'none';
      }
    } catch {
      for (const v of unmatched) {
        mapping[v] = null;
        sources[v] = 'none';
      }
    }
  }

  return { mapping, sources };
}

export function applyMapping(
  row: Record<string, string>,
  mapping: Record<string, string | null>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [templateVar, fileCol] of Object.entries(mapping)) {
    if (fileCol && fileCol in row) out[templateVar] = row[fileCol];
  }
  return out;
}
