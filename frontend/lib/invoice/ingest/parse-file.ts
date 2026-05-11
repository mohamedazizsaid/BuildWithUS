export interface ParsedFile {
  filename: string;
  headers: string[];
  rows: Record<string, string>[];
}

/** Read a CSV, TSV, or XLSX/ODS file and return rows keyed by header. */
export async function parseFile(file: File): Promise<ParsedFile> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const isSpreadsheet = ['xlsx', 'xls', 'ods'].includes(ext);

  if (isSpreadsheet) return parseSpreadsheet(file);
  return parseCsvText(file);
}

async function parseSpreadsheet(file: File): Promise<ParsedFile> {
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json<(string | number)[]>(ws, { header: 1, defval: '' });
  if (data.length === 0) return { filename: file.name, headers: [], rows: [] };

  const headers = (data[0] as (string | number)[]).map((h) => String(h).trim()).filter(Boolean);
  const rows = data.slice(1).map((row) => {
    const r: Record<string, string> = {};
    headers.forEach((h, i) => {
      r[h] = String((row as (string | number)[])[i] ?? '').trim();
    });
    return r;
  }).filter((row) => Object.values(row).some((v) => v));

  return { filename: file.name, headers, rows };
}

async function parseCsvText(file: File): Promise<ParsedFile> {
  const text = await file.text();
  const { headers, rows } = parseCsvString(text);
  return { filename: file.name, headers, rows };
}

// Simple CSV parser handling quoted fields, escaped quotes ("") and comma/semicolon detection.
export function parseCsvString(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const stripped = text.replace(/^﻿/, '');
  // Auto-detect delimiter from first line
  const firstNewline = stripped.indexOf('\n');
  const firstLine = firstNewline === -1 ? stripped : stripped.slice(0, firstNewline);
  const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ',';

  const rows: string[][] = [];
  let current: string[] = [];
  let buf = '';
  let inQuotes = false;

  for (let i = 0; i < stripped.length; i++) {
    const ch = stripped[i];
    if (inQuotes) {
      if (ch === '"' && stripped[i + 1] === '"') { buf += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { buf += ch; }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === sep) {
      current.push(buf); buf = '';
    } else if (ch === '\r') {
      // ignore
    } else if (ch === '\n') {
      current.push(buf); buf = '';
      rows.push(current); current = [];
    } else {
      buf += ch;
    }
  }
  if (buf.length || current.length) {
    current.push(buf);
    rows.push(current);
  }

  if (rows.length === 0) return { headers: [], rows: [] };
  const headers = rows[0].map((h) => h.trim()).filter(Boolean);
  const dataRows = rows.slice(1).map((row) => {
    const r: Record<string, string> = {};
    headers.forEach((h, i) => { r[h] = (row[i] ?? '').trim(); });
    return r;
  }).filter((r) => Object.values(r).some((v) => v));

  return { headers, rows: dataRows };
}
