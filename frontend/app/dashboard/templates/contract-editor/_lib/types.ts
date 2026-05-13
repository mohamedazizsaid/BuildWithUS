export type ContractType = 'b2c' | 'b2b' | 'web' | 'abonnement' | 'aop' | 'blank';

export const CONTRACT_TYPES: Record<ContractType, { label: string; color: string }> = {
  b2c:        { label: 'B2C — Particulier',    color: 'bg-blue-50 text-blue-700 border-blue-200' },
  b2b:        { label: 'B2B — Entreprise',     color: 'bg-violet-50 text-violet-700 border-violet-200' },
  web:        { label: 'Web / E-commerce',     color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  aop:        { label: "Appel d'Offre Public", color: 'bg-amber-50 text-amber-700 border-amber-200' },
  abonnement: { label: 'Abonnement / Télécom', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  blank:      { label: 'Page blanche',         color: 'bg-slate-50 text-slate-600 border-slate-200' },
};

export type SlashMenuItem =
  | { type: 'variable'; key: string; name: string; label: string; category: string }
  | { type: 'block'; key: string; label: string; description: string; color: string; build: () => Record<string, unknown> };

export interface CsvDataset {
  filename: string;
  headers: string[];
  rows: Record<string, string>[];
}

export interface BlockMeta {
  label: string; nodeType: string;
  from: number;  to: number;
  top: number;   height: number;
  left: number;  right: number;
}
