import { Mail, FileText, ScrollText, Receipt, MessageSquare, MessageSquareMore } from 'lucide-react';

export type TabType = 'email' | 'contrat' | 'facture' | 'sms' | 'rcs';
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
  SMS:     { label: 'SMS',     icon: MessageSquare, color: 'text-violet-600', bg: 'bg-violet-50', gradient: 'from-violet-100 to-violet-50' },
  RCS:     { label: 'RCS',     icon: MessageSquareMore, color: 'text-teal-600', bg: 'bg-teal-50', gradient: 'from-teal-100 to-teal-50' },
  email:   { label: 'Email',   icon: Mail,       color: 'text-blue-600',    bg: 'bg-blue-50',    gradient: 'from-blue-100 to-blue-50' },
  facture: { label: 'Facture', icon: FileText,   color: 'text-emerald-600', bg: 'bg-emerald-50', gradient: 'from-emerald-100 to-emerald-50' },
  contrat: { label: 'Contrat', icon: ScrollText, color: 'text-amber-600',   bg: 'bg-amber-50',  gradient: 'from-amber-100 to-amber-50' },
  sms:     { label: 'SMS',     icon: MessageSquare, color: 'text-violet-600', bg: 'bg-violet-50', gradient: 'from-violet-100 to-violet-50' },
  rcs:     { label: 'RCS',     icon: MessageSquareMore, color: 'text-teal-600', bg: 'bg-teal-50', gradient: 'from-teal-100 to-teal-50' },
  '1':     { label: 'Email',   icon: Mail,       color: 'text-blue-600',    bg: 'bg-blue-50',    gradient: 'from-blue-100 to-blue-50' },
  '2':     { label: 'Facture', icon: FileText,   color: 'text-emerald-600', bg: 'bg-emerald-50', gradient: 'from-emerald-100 to-emerald-50' },
  '3':     { label: 'Contrat', icon: ScrollText, color: 'text-amber-600',   bg: 'bg-amber-50',  gradient: 'from-amber-100 to-amber-50' },
  '4':     { label: 'SMS',     icon: MessageSquare, color: 'text-violet-600', bg: 'bg-violet-50', gradient: 'from-violet-100 to-violet-50' },
  '5':     { label: 'RCS',     icon: MessageSquareMore, color: 'text-teal-600', bg: 'bg-teal-50', gradient: 'from-teal-100 to-teal-50' },
};

export function getTypeConfig(type: string | number) {
  return TYPE_CONFIG[String(type)] || TYPE_CONFIG['email'];
}

export const TABS: { key: TabType; label: string; icon: typeof Mail; newRoute: string }[] = [
  { key: 'email',   label: 'Emails',   icon: Mail,          newRoute: '/dashboard/templates/new?preselect=email'   },
  { key: 'contrat', label: 'Contrats', icon: ScrollText,    newRoute: '/dashboard/templates/new?preselect=contrat' },
  { key: 'facture', label: 'Factures', icon: Receipt,       newRoute: '/dashboard/templates/new?preselect=facture' },
  { key: 'sms',     label: 'SMS',      icon: MessageSquare, newRoute: '/dashboard/templates/new?preselect=sms'     },
  { key: 'rcs',     label: 'RCS',      icon: MessageSquareMore, newRoute: '/dashboard/templates/new?preselect=rcs' },
];

export const TAB_TYPES: Record<TabType, string[]> = {
  email:   ['email', 'EMAIL', '1'],
  contrat: ['contrat', 'CONTRAT', '3'],
  facture: ['facture', 'FACTURE', '2'],
  sms:     ['sms', 'SMS', '4'],
  rcs:     ['rcs', 'RCS', '5'],
};
