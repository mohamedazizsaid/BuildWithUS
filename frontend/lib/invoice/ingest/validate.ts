import type { TargetType } from './schema';

export interface FieldError {
  path: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface CoerceResult {
  value: unknown;
  error?: FieldError;
}

// ─── Coercion (string → typed value) ───────────────────────────────────────

export function coerce(raw: string | undefined | null, type: TargetType, path: string): CoerceResult {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return { value: defaultFor(type) };

  switch (type) {
    case 'string':
      return { value: trimmed };

    case 'number':
    case 'integer': {
      // Tolerate French formatting: "1 234,56" → 1234.56
      const cleaned = trimmed.replaceAll(/\s/g, '').replace(',', '.');
      const n = parseFloat(cleaned);
      if (!Number.isFinite(n)) {
        return { value: 0, error: warn(path, `« ${trimmed} » n'est pas un nombre valide`) };
      }
      return { value: type === 'integer' ? Math.round(n) : n };
    }

    case 'date': {
      const iso = parseDate(trimmed);
      if (!iso) return { value: '', error: warn(path, `« ${trimmed} » n'est pas une date valide (attendu AAAA-MM-JJ)`) };
      return { value: iso };
    }

    case 'email': {
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
      return { value: trimmed, error: ok ? undefined : warn(path, `« ${trimmed} » ne ressemble pas à un email`) };
    }

    case 'siret': {
      const digits = trimmed.replaceAll(/\D/g, '');
      const ok = digits.length === 14;
      return { value: digits, error: ok ? undefined : warn(path, 'Le SIRET doit contenir 14 chiffres') };
    }

    case 'vatNumber': {
      const upper = trimmed.toUpperCase().replaceAll(/\s/g, '');
      const ok = /^[A-Z]{2}[A-Z0-9]{2,13}$/.test(upper);
      return { value: upper, error: ok ? undefined : warn(path, 'N° TVA invalide (ex: FR12345678901)') };
    }

    case 'iban': {
      const upper = trimmed.toUpperCase().replaceAll(/\s/g, '');
      const ok = /^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(upper);
      return { value: upper, error: ok ? undefined : warn(path, 'IBAN invalide') };
    }

    case 'currency': {
      const upper = trimmed.toUpperCase();
      return { value: upper };
    }
  }
}

// ─── Row-level validation ──────────────────────────────────────────────────

export interface RowValidation {
  errors: FieldError[];     // blockers (severity='error')
  warnings: FieldError[];   // soft issues (severity='warning')
}

export function classifyErrors(errs: FieldError[]): RowValidation {
  return {
    errors:   errs.filter((e) => e.severity === 'error'),
    warnings: errs.filter((e) => e.severity === 'warning'),
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function defaultFor(type: TargetType): unknown {
  switch (type) {
    case 'number':
    case 'integer':
      return 0;
    case 'string':
    case 'date':
    case 'email':
    case 'siret':
    case 'vatNumber':
    case 'iban':
    case 'currency':
      return '';
  }
}

function warn(path: string, message: string): FieldError {
  return { path, message, severity: 'warning' };
}

export function requiredMissing(path: string, label: string): FieldError {
  return { path, message: `Champ requis manquant : ${label}`, severity: 'error' };
}

// Best-effort date parsing — accepts ISO, FR (DD/MM/YYYY), US (MM/DD/YYYY) — returns ISO or null.
function parseDate(raw: string): string | null {
  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  // DD/MM/YYYY or DD-MM-YYYY (assume FR convention since user is in France)
  const fr = raw.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (fr) {
    const [, d, m, y] = fr;
    const year = y.length === 2 ? `20${y}` : y;
    return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  // Try native parse as a last resort
  const t = Date.parse(raw);
  if (!Number.isNaN(t)) return new Date(t).toISOString().split('T')[0];
  return null;
}
