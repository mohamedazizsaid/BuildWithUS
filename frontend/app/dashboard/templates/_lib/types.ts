import { Mail, FileText, ScrollText, Receipt } from 'lucide-react';

export type TabType = 'email' | 'contrat' | 'facture';
export type ViewMode = 'modeles' | 'favoris' | 'predifinis';

export interface Template {
  id: string;
  name: string;
  description: string;
  type: string;
  subject: string;
  content: string;
  created_at: string;
  updated_at: string;
  version: number;
  usage_count: number;
  is_favorite?: boolean;
  is_predefined_override?: boolean;
  predefined_template_id?: string;
}

export const TYPE_CONFIG: Record<string, { label: string; icon: typeof Mail; color: string; bg: string; gradient: string }> = {
  EMAIL:   { label: 'Email',   icon: Mail,       color: 'text-blue-600',    bg: 'bg-blue-50',    gradient: 'from-blue-100 to-blue-50' },
  FACTURE: { label: 'Facture', icon: FileText,   color: 'text-emerald-600', bg: 'bg-emerald-50', gradient: 'from-emerald-100 to-emerald-50' },
  CONTRAT: { label: 'Contrat', icon: ScrollText, color: 'text-amber-600',   bg: 'bg-amber-50',  gradient: 'from-amber-100 to-amber-50' },
  email:   { label: 'Email',   icon: Mail,       color: 'text-blue-600',    bg: 'bg-blue-50',    gradient: 'from-blue-100 to-blue-50' },
  facture: { label: 'Facture', icon: FileText,   color: 'text-emerald-600', bg: 'bg-emerald-50', gradient: 'from-emerald-100 to-emerald-50' },
  contrat: { label: 'Contrat', icon: ScrollText, color: 'text-amber-600',   bg: 'bg-amber-50',  gradient: 'from-amber-100 to-amber-50' },
};

export function getTypeConfig(type: string) {
  return TYPE_CONFIG[type] || TYPE_CONFIG['EMAIL'];
}

export const TABS: { key: TabType; label: string; icon: typeof Mail; newRoute: string }[] = [
  { key: 'email',   label: 'Emails',   icon: Mail,       newRoute: '/dashboard/templates/new?preselect=email'   },
  { key: 'contrat', label: 'Contrats', icon: ScrollText, newRoute: '/dashboard/templates/new?preselect=contrat' },
  { key: 'facture', label: 'Factures', icon: Receipt,    newRoute: '/dashboard/templates/new?preselect=facture' },
];

export const TAB_TYPES: Record<TabType, string[]> = {
  email:   ['email', 'EMAIL'],
  contrat: ['contrat', 'CONTRAT'],
  facture: ['facture', 'FACTURE'],
};
