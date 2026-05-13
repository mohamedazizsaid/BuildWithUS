export function slugifyHeader(h: string): string {
  return h
    .replace(/^﻿/, '').replace(/^ï»¿/, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/^_+|_+$/g, '');
}

export function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const raw = text.replace(/^﻿/, '').replace(/^ï»¿/, '');
  const lines = raw.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const firstLine = lines[0];
  const delimiters = [';', ',', '\t', '|'];
  const delimiter = delimiters.reduce((best, d) =>
    firstLine.split(d).length > firstLine.split(best).length ? d : best,
    ','
  );

  const splitLine = (line: string): string[] => {
    const result: string[] = [];
    let cur = '';
    let inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; }
      else if (ch === delimiter && !inQ) { result.push(cur.trim()); cur = ''; }
      else { cur += ch; }
    }
    result.push(cur.trim());
    return result;
  };

  const headers = splitLine(lines[0]).map(slugifyHeader).filter(Boolean);
  if (headers.length === 0) return { headers: [], rows: [] };

  const rows = lines.slice(1)
    .map((line) => {
      const values = splitLine(line);
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = values[i]?.trim() ?? ''; });
      return row;
    })
    .filter((row) => Object.values(row).some((v) => v));

  return { headers, rows };
}
