'use client';

import { Suspense, useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft, Save, Download, Plus, Trash2, ChevronDown,
  GripVertical, Building2, Calculator, BookMarked,
  Type, AlignLeft, Users, PenLine, Minus,
  Table, CheckSquare, CreditCard, FileText, LayoutList, AlignCenter, RefreshCw, Settings2,
} from 'lucide-react';
import { templates } from '@/lib/api';
import { renderBlock } from '@/lib/contract-renderer';
import toast from 'react-hot-toast';
import { v4 as uuid } from 'uuid';

// ─── Types ────────────────────────────────────────────────────────────────────

type BlockType =
  | 'contract_header' | 'definitions' | 'pricing_ttc' | 'heading' | 'article'
  | 'legal_article' | 'clause' | 'parties' | 'form_fields' | 'checkbox_group'
  | 'pricing_table' | 'signature_block' | 'sepa_mandate' | 'retraction_form'
  | 'info_box' | 'divider';

type ContractType = keyof typeof CONTRACT_TYPES;

interface FieldDef { key: string; label: string; placeholder?: string; multiline?: boolean; type?: 'text' | 'select'; options?: string[]; }
interface FieldGroup { group: string; fields: FieldDef[]; }

interface ContractBlock {
  id: string;
  type: BlockType;
  content: string;        // rendered template string (auto-generated)
  fields: Record<string, string>;  // user-filled values
}

// ─── Contract types ───────────────────────────────────────────────────────────

const CONTRACT_TYPES = {
  b2c:        { label: 'B2C — Particulier',    color: 'bg-blue-50 text-blue-700 border-blue-200' },
  b2b:        { label: 'B2B — Entreprise',     color: 'bg-violet-50 text-violet-700 border-violet-200' },
  web:        { label: 'Web / E-commerce',     color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  aop:        { label: "Appel d'Offre Public", color: 'bg-amber-50 text-amber-700 border-amber-200' },
  abonnement: { label: 'Abonnement / Télécom', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
} as const;

// ─── Block field schemas (what the user fills) ────────────────────────────────

const BLOCK_SCHEMA: Partial<Record<BlockType, FieldGroup[]>> = {
  contract_header: [
    { group: 'Votre entreprise', fields: [
      { key: 'entreprise',      label: 'Raison sociale',    placeholder: 'Ma Société SAS' },
      { key: 'adresse',         label: 'Adresse',           placeholder: '14 av. Louison Bobet, 75001 Paris' },
      { key: 'siret',           label: 'N° SIRET',          placeholder: '123 456 789 00012' },
      { key: 'tva',             label: 'N° TVA',            placeholder: 'FR00123456789' },
    ]},
    { group: 'Document', fields: [
      { key: 'titre',           label: 'Titre du document', placeholder: 'CONTRAT DE PRESTATION DE SERVICES' },
      { key: 'numero',          label: 'N° Contrat',        placeholder: 'CTR-2026-001' },
      { key: 'version',         label: 'Version',           placeholder: 'v1.0 – 01/05/2026' },
    ]},
  ],

  parties: [
    { group: 'Prestataire', fields: [
      { key: 'prestataire_nom',    label: 'Nom / Raison sociale', placeholder: 'Ma Société SAS' },
      { key: 'prestataire_siret',  label: 'SIRET',                placeholder: '123 456 789 00012' },
      { key: 'prestataire_tva',    label: 'N° TVA',               placeholder: 'FR00123456789' },
      { key: 'prestataire_adresse',label: 'Adresse',              placeholder: '14 av. Paris, 75001 Paris' },
    ]},
    { group: 'Client', fields: [
      { key: 'client_prenom',      label: 'Prénom',        placeholder: 'Jean' },
      { key: 'client_nom',         label: 'Nom',           placeholder: 'Dupont' },
      { key: 'client_adresse',     label: 'Adresse',       placeholder: '12 rue de Paris' },
      { key: 'client_code_postal', label: 'Code postal',   placeholder: '75001' },
      { key: 'client_ville',       label: 'Ville',         placeholder: 'Paris' },
      { key: 'client_email',       label: 'Email',         placeholder: 'jean.dupont@email.com' },
      { key: 'client_telephone',   label: 'Téléphone',     placeholder: '06 12 34 56 78' },
    ]},
  ],

  pricing_ttc: [
    { group: 'Prestation', fields: [
      { key: 'description_prestation', label: 'Description', placeholder: 'Développement de site web', multiline: true },
    ]},
    { group: 'Montants', fields: [
      { key: 'montant_ht',   label: 'Montant HT (€)',  placeholder: '2 500,00' },
      { key: 'tva_rate',     label: 'Taux TVA (%)',     placeholder: '20', type: 'select', options: ['0', '5.5', '10', '20'] },
      { key: 'montant_tva',  label: 'Montant TVA (€)', placeholder: '500,00' },
      { key: 'montant_ttc',  label: 'Total TTC (€)',   placeholder: '3 000,00' },
    ]},
  ],

  legal_article: [
    { group: 'Article', fields: [
      { key: '_title', label: 'Titre de l\'article', placeholder: '1. OBJET DU CONTRAT' },
      { key: '_body',  label: 'Contenu légal',       placeholder: '1.1 Le Prestataire s\'engage à...', multiline: true },
    ]},
  ],

  clause: [
    { group: 'Clause', fields: [
      { key: '_text', label: 'Texte de la clause', placeholder: 'Le Prestataire s\'engage à...', multiline: true },
    ]},
  ],

  heading: [
    { group: 'Titre', fields: [
      { key: '_text', label: 'Texte du titre', placeholder: 'CONTRAT DE PRESTATION' },
    ]},
  ],

  article: [
    { group: 'Article', fields: [
      { key: '_text', label: 'Intitulé', placeholder: 'Article 1 — Objet du contrat' },
    ]},
  ],

  signature_block: [
    { group: 'Lieu & Date', fields: [
      { key: 'client_ville',    label: 'Ville de signature', placeholder: 'Paris' },
      { key: 'date_signature',  label: 'Date de signature',  placeholder: '01/05/2026' },
    ]},
  ],

  info_box: [
    { group: 'Encadré', fields: [
      { key: '_text', label: 'Texte à mettre en évidence', placeholder: 'Information importante...', multiline: true },
    ]},
  ],

  definitions: [
    { group: 'Définitions', fields: [
      { key: '_defs', label: 'Définitions (une par ligne : Terme: Définition)', placeholder: 'Service: {{description_prestation}}\nClient: {{client_prenom}} {{client_nom}}', multiline: true },
    ]},
  ],

  form_fields: [
    { group: 'Formulaire', fields: [
      { key: '_title',  label: 'Titre du formulaire', placeholder: 'COORDONNÉES DU CLIENT' },
      { key: '_fields', label: 'Champs (un par ligne)', placeholder: 'Nom: ___\nPrénom: ___\nAdresse: ___\nEmail: ___', multiline: true },
    ]},
  ],

  checkbox_group: [
    { group: 'Cases à cocher', fields: [
      { key: '_title',   label: 'Titre du groupe',       placeholder: 'MODE DE PAIEMENT' },
      { key: '_options', label: 'Options (une par ligne)', placeholder: 'Prélèvement automatique\nVirement bancaire\nChèque', multiline: true },
    ]},
  ],

  sepa_mandate: [
    { group: 'Créancier SEPA', fields: [
      { key: 'prestataire_nom',    label: 'Nom créancier', placeholder: 'Ma Société SAS' },
      { key: '_ics',               label: 'ICS (Identifiant Créancier)', placeholder: 'FR24ZZZ...' },
      { key: 'prestataire_adresse',label: 'Adresse créancier', placeholder: '14 av. Paris...' },
    ]},
  ],

  retraction_form: [
    { group: 'Rétractation', fields: [
      { key: 'client_prenom',     label: 'Prénom du client',   placeholder: 'Jean' },
      { key: 'client_nom',        label: 'Nom du client',      placeholder: 'Dupont' },
      { key: 'prestataire_nom',   label: 'Nom prestataire',    placeholder: 'Ma Société SAS' },
      { key: 'prestataire_adresse',label: 'Adresse prestataire', placeholder: '14 av. Paris...' },
    ]},
  ],
};

// ─── Generate block content from fields ───────────────────────────────────────

function generateContent(type: BlockType, fields: Record<string, string>): string {
  const f = (key: string, fallback = '') => fields[key] || fallback;

  switch (type) {
    case 'contract_header':
      return `entreprise: ${f('entreprise','{{prestataire_nom}}')}\nadresse: ${f('adresse','{{prestataire_adresse}}')}\nsiret: ${f('siret','{{prestataire_siret}}')}\ntva: ${f('tva','{{prestataire_tva}}')}\ntitre: ${f('titre','CONTRAT')}\nnumero: ${f('numero','{{numero_contrat}}')}\nversion: ${f('version','v1.0')}`;

    case 'parties':
      return `${f('prestataire_nom','{{prestataire_nom}}')}, immatriculée au RCS sous le N° SIRET ${f('prestataire_siret','{{prestataire_siret}}')}, N° TVA ${f('prestataire_tva','{{prestataire_tva}}')}, dont le siège est situé au ${f('prestataire_adresse','{{prestataire_adresse}}')}, ci-après désignée « le Prestataire »,\n\nEt :\n\nM./Mme ${f('client_prenom','{{client_prenom}}')} ${f('client_nom','{{client_nom}}')}, demeurant au ${f('client_adresse','{{client_adresse}}')}, ${f('client_code_postal','{{client_code_postal}}')} ${f('client_ville','{{client_ville}}')}, joignable à ${f('client_email','{{client_email}}')} / ${f('client_telephone','{{client_telephone}}')}, ci-après désigné(e) « le Client ».`;

    case 'pricing_ttc':
      return `description: ${f('description_prestation','{{description_prestation}}')}\nmontant_ht: ${f('montant_ht','{{montant_ht}}')}\ntva_rate: ${f('tva_rate','20')}\nmontant_tva: ${f('montant_tva','{{montant_tva}}')}\nmontant_ttc: ${f('montant_ttc','{{montant_ttc}}')}`;

    case 'legal_article':
      return `${f('_title','ARTICLE')}\n\n${f('_body','Contenu de l\'article...')}`;

    case 'clause':
      return f('_text', 'Texte de la clause...');

    case 'heading':
      return f('_text', 'TITRE DU DOCUMENT');

    case 'article':
      return f('_text', 'Article 1 — Intitulé');

    case 'signature_block':
      return `Fait à ${f('client_ville','{{client_ville}}')}, le ${f('date_signature','{{date_signature}}')}\n\nJe reconnais avoir pris connaissance du présent contrat et en accepte les conditions.`;

    case 'info_box':
      return f('_text', 'Information importante...');

    case 'definitions':
      return f('_defs', 'Service: {{description_prestation}}\nClient: {{client_prenom}} {{client_nom}}');

    case 'form_fields': {
      const title = f('_title', 'COORDONNÉES');
      const rawFields = f('_fields', 'Nom: ___\nPrénom: ___');
      const lines = rawFields.split('\n').map((l) => l.trim()).filter(Boolean);
      return `${title}\n\n${lines.join('\n')}`;
    }

    case 'checkbox_group': {
      const title = f('_title', 'CHOIX');
      const rawOpts = f('_options', 'Option 1\nOption 2');
      const opts = rawOpts.split('\n').map((l) => `☐ ${l.trim()}`).filter((l) => l.length > 2);
      return `${title}\n\n${opts.join('\n')}`;
    }

    case 'sepa_mandate':
      return `Nom créancier: ${f('prestataire_nom','{{prestataire_nom}}')}\nICS (Identifiant Créancier SEPA): ${f('_ics','___')}\nAdresse créancier: ${f('prestataire_adresse','{{prestataire_adresse}}')}`;

    case 'retraction_form':
      return `Je soussigné(e), ${f('client_prenom','{{client_prenom}}')} ${f('client_nom','{{client_nom}}')}, déclare renoncer à l'offre ${f('prestataire_nom','{{prestataire_nom}}')}, à renvoyer au plus tard 14 jours après signature à :\n${f('prestataire_nom','{{prestataire_nom}}')} — Service Rétractation — ${f('prestataire_adresse','{{prestataire_adresse}}')}`;

    default:
      return '';
  }
}

// ─── Block library config ─────────────────────────────────────────────────────

const LIBRARY: { category: string; blocks: { type: BlockType; label: string; icon: React.ElementType; color: string }[] }[] = [
  { category: 'Structure', blocks: [
    { type: 'contract_header', label: 'En-tête',      icon: Building2,   color: 'bg-slate-900 text-white' },
    { type: 'heading',         label: 'Titre',         icon: Type,        color: 'bg-slate-100 text-slate-700' },
    { type: 'article',         label: 'Article',       icon: AlignCenter, color: 'bg-indigo-50 text-indigo-700' },
    { type: 'divider',         label: 'Séparateur',    icon: Minus,       color: 'bg-slate-50 text-slate-400' },
  ]},
  { category: 'Contenu légal', blocks: [
    { type: 'legal_article', label: 'Article légal',  icon: LayoutList, color: 'bg-blue-50 text-blue-700' },
    { type: 'clause',        label: 'Clause',          icon: AlignLeft,  color: 'bg-sky-50 text-sky-700' },
    { type: 'parties',       label: 'Parties',         icon: Users,      color: 'bg-amber-50 text-amber-700' },
    { type: 'definitions',   label: 'Définitions',     icon: BookMarked, color: 'bg-purple-50 text-purple-700' },
  ]},
  { category: 'Formulaires', blocks: [
    { type: 'form_fields',    label: 'Formulaire',      icon: FileText,    color: 'bg-orange-50 text-orange-700' },
    { type: 'checkbox_group', label: 'Cases à cocher',  icon: CheckSquare, color: 'bg-green-50 text-green-700' },
    { type: 'pricing_table',  label: 'Tableau tarifs',  icon: Table,       color: 'bg-teal-50 text-teal-700' },
  ]},
  { category: 'Financier', blocks: [
    { type: 'pricing_ttc', label: 'Prix HT/TVA/TTC', icon: Calculator, color: 'bg-emerald-50 text-emerald-800' },
  ]},
  { category: 'Final', blocks: [
    { type: 'signature_block', label: 'Signatures',    icon: PenLine,    color: 'bg-emerald-50 text-emerald-700' },
    { type: 'sepa_mandate',    label: 'Mandat SEPA',   icon: CreditCard, color: 'bg-violet-50 text-violet-700' },
    { type: 'retraction_form', label: 'Rétractation',  icon: FileText,   color: 'bg-red-50 text-red-700' },
    { type: 'info_box',        label: 'Encadré info',  icon: FileText,   color: 'bg-yellow-50 text-yellow-700' },
  ]},
];

// ─── Library panel ────────────────────────────────────────────────────────────

function LibraryPanel({ onAdd }: { readonly onAdd: (type: BlockType) => void }) {
  const [open, setOpen] = useState('Structure');
  return (
    <div className="w-52 border-r border-border bg-slate-50 flex flex-col overflow-hidden shrink-0">
      <div className="px-3 py-2.5 border-b border-border">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Bibliothèque</p>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {LIBRARY.map((group) => (
          <div key={group.category}>
            <button
              onClick={() => setOpen(open === group.category ? '' : group.category)}
              className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <span className="text-[11px] font-semibold text-slate-500">{group.category}</span>
              <ChevronDown size={11} className={`text-slate-400 transition-transform ${open === group.category ? 'rotate-180' : ''}`} />
            </button>
            {open === group.category && (
              <div className="space-y-0.5 pl-1 mb-1">
                {group.blocks.map((b) => {
                  const Icon = b.icon;
                  return (
                    <button
                      key={b.type}
                      onClick={() => onAdd(b.type)}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('block-type', b.type)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white hover:shadow-sm transition-all cursor-grab group"
                    >
                      <span className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${b.color}`}>
                        <Icon size={10} />
                      </span>
                      <span className="text-[11px] text-slate-600 group-hover:text-slate-900 text-left flex-1">{b.label}</span>
                      <Plus size={9} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Properties panel ─────────────────────────────────────────────────────────

function PropertiesPanel({
  block, onUpdateField, onDelete,
}: {
  readonly block: ContractBlock | null;
  readonly onUpdateField: (key: string, val: string) => void;
  readonly onDelete: () => void;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const schema = block ? (BLOCK_SCHEMA[block.type] ?? []) : [];

  if (!block) {
    return (
      <div className="w-64 border-l border-border bg-white flex flex-col shrink-0">
        <div className="px-3 py-2.5 border-b border-border">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Propriétés</p>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-[11px] text-slate-400 text-center">
            Cliquez sur un bloc<br />pour l&apos;éditer
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 border-l border-border bg-white flex flex-col overflow-hidden shrink-0">
      <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
          {LIBRARY.flatMap((g) => g.blocks).find((b) => b.type === block.type)?.label ?? 'Propriétés'}
        </p>
        <button
          onClick={() => setShowAdvanced((v) => !v)}
          className="text-slate-400 hover:text-slate-700 transition-colors"
          title="Mode avancé (JSON)"
        >
          <Settings2 size={13} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">

        {schema.length === 0 && block.type !== 'divider' && (
          <p className="text-[11px] text-slate-400 text-center py-4">Aucun champ pour ce bloc</p>
        )}

        {/* Structured form fields */}
        {!showAdvanced && schema.map((group) => (
          <div key={group.group}>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">{group.group}</p>
            <div className="space-y-2">
              {group.fields.map((field) => (
                <div key={field.key}>
                  <label className="text-[11px] text-slate-500 block mb-0.5">{field.label}</label>
                  {field.type === 'select' ? (
                    <select
                      value={block.fields[field.key] ?? ''}
                      onChange={(e) => onUpdateField(field.key, e.target.value)}
                      className="w-full h-7 px-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:border-indigo-400 bg-white"
                    >
                      {field.options?.map((o) => <option key={o} value={o}>{o}%</option>)}
                    </select>
                  ) : field.multiline ? (
                    <textarea
                      value={block.fields[field.key] ?? ''}
                      onChange={(e) => onUpdateField(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      rows={3}
                      className="w-full text-xs border border-slate-200 rounded-md p-2 focus:outline-none focus:border-indigo-400 resize-none bg-slate-50"
                    />
                  ) : (
                    <input
                      value={block.fields[field.key] ?? ''}
                      onChange={(e) => onUpdateField(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className="w-full h-7 px-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:border-indigo-400 bg-slate-50"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Advanced mode: raw content */}
        {showAdvanced && block.type !== 'divider' && (
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Contenu brut</p>
            <textarea
              value={block.content}
              readOnly
              rows={10}
              className="w-full text-[10px] font-mono border border-slate-200 rounded-md p-2 bg-slate-50 resize-none text-slate-500"
            />
          </div>
        )}

        {block.type !== 'divider' && (
          <button
            onClick={onDelete}
            className="w-full flex items-center justify-center gap-1.5 h-8 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 text-xs font-medium transition-colors"
          >
            <Trash2 size={12} /> Supprimer ce bloc
          </button>
        )}
      </div>
    </div>
  );
}

// ─── A4 Canvas ────────────────────────────────────────────────────────────────

function ContractCanvas({
  blocks, selectedId, onSelect, onReorder, onDropNew,
}: {
  readonly blocks: ContractBlock[];
  readonly selectedId: string | null;
  readonly onSelect: (id: string) => void;
  readonly onReorder: (fromId: string, toId: string) => void;
  readonly onDropNew: (type: BlockType, afterId?: string) => void;
}) {
  const dragId = useRef<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const handleDrop = (e: React.DragEvent, targetId?: string) => {
    e.preventDefault();
    setDragOver(null);
    const fromId = dragId.current;
    const blockType = e.dataTransfer.getData('block-type') as BlockType;
    if (blockType) { onDropNew(blockType, targetId); }
    else if (fromId && targetId && fromId !== targetId) { onReorder(fromId, targetId); }
    dragId.current = null;
  };

  // Global variable values for rendering (fields merged across all blocks)
  const globalVars = useMemo(() => {
    const map: Record<string, string> = {};
    blocks.forEach((b) => Object.entries(b.fields ?? {}).forEach(([k, v]) => { if (v && !k.startsWith('_')) map[k] = v; }));
    return map;
  }, [blocks]);

  return (
    <div
      className="flex-1 overflow-y-auto bg-slate-100 p-6"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => handleDrop(e)}
    >
      {blocks.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 text-slate-400 border-2 border-dashed border-slate-300 rounded-2xl">
          <Plus size={24} className="mb-2 text-slate-300" />
          <p className="text-sm">Glissez des blocs ici</p>
          <p className="text-xs mt-1">ou cliquez dans la bibliothèque</p>
        </div>
      )}

      <div className="bg-white shadow-sm mx-auto" style={{ width: '210mm', minHeight: '297mm', fontFamily: 'Arial, sans-serif', color: '#1a1a1a' }}>
        {blocks.map((block) => (
          <div
            key={block.id}
            draggable
            onDragStart={(e) => { dragId.current = block.id; e.dataTransfer.effectAllowed = 'move'; }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(block.id); }}
            onDragLeave={() => setDragOver(null)}
            onDrop={(e) => handleDrop(e, block.id)}
            onClick={() => onSelect(block.id)}
            className={`relative group cursor-pointer transition-all ${
              selectedId === block.id ? 'ring-2 ring-indigo-500 ring-inset' : 'hover:ring-1 hover:ring-slate-300 hover:ring-inset'
            } ${dragOver === block.id ? 'border-t-2 border-indigo-500' : ''}`}
          >
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 opacity-0 group-hover:opacity-100 cursor-grab flex justify-center z-10">
              <GripVertical size={12} className="text-slate-300" />
            </div>
            <div style={{ padding: '0 22mm' }}
              dangerouslySetInnerHTML={{ __html: renderBlock(block, globalVars) }}
            />
            {selectedId === block.id && (
              <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-bl">
                {LIBRARY.flatMap((g) => g.blocks).find((b) => b.type === block.type)?.label}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main editor ──────────────────────────────────────────────────────────────

function ContractEditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const templateId = searchParams.get('id') || null;
  const name = searchParams.get('name') || 'Nouveau contrat';
  const description = searchParams.get('description') || '';
  const isEditMode = !!templateId;

  const [contractType, setContractType] = useState<ContractType>('b2c');
  const [blocks, setBlocks] = useState<ContractBlock[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [version, setVersion] = useState(1);

  const selectedBlock = blocks.find((b) => b.id === selectedId) ?? null;

  // Load existing template
  useEffect(() => {
    if (!templateId) return;
    templates.get(templateId)
      .then((result: any) => {
        const tmpl = result?.template ?? result;
        try {
          const parsed = JSON.parse(tmpl?.content ?? '');
          if (parsed.contractType) setContractType(parsed.contractType as ContractType);
          if (parsed.blocks?.length) setBlocks(
            parsed.blocks.map((b: ContractBlock) => ({ ...b, fields: b.fields ?? {} }))
          );
          if (parsed.version) setVersion(parsed.version);
        } catch { /* keep defaults */ }
      })
      .catch(() => toast.error('Erreur chargement du template'));
  }, [templateId]);

  // ── Block operations ──

  const createBlock = useCallback((type: BlockType): ContractBlock => {
    const fields: Record<string, string> = {};
    (BLOCK_SCHEMA[type] ?? []).forEach((g) => g.fields.forEach((f) => { fields[f.key] = ''; }));
    const content = generateContent(type, fields);
    return { id: uuid(), type, content, fields };
  }, []);

  const addBlock = useCallback((type: BlockType, afterId?: string) => {
    const newBlock = createBlock(type);
    setBlocks((prev) => {
      if (!afterId) return [...prev, newBlock];
      const idx = prev.findIndex((b) => b.id === afterId);
      const next = [...prev];
      next.splice(idx + 1, 0, newBlock);
      return next;
    });
    setSelectedId(newBlock.id);
  }, [createBlock]);

  const updateField = useCallback((blockId: string, key: string, val: string) => {
    setBlocks((prev) => prev.map((b) => {
      if (b.id !== blockId) return b;
      const newFields = { ...b.fields, [key]: val };
      return { ...b, fields: newFields, content: generateContent(b.type, newFields) };
    }));
  }, []);

  const deleteBlock = useCallback((id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    setSelectedId(null);
  }, []);

  const reorderBlocks = useCallback((fromId: string, toId: string) => {
    setBlocks((prev) => {
      const next = [...prev];
      const fromIdx = next.findIndex((b) => b.id === fromId);
      const toIdx = next.findIndex((b) => b.id === toId);
      if (fromIdx < 0 || toIdx < 0) return prev;
      const [item] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, item);
      return next;
    });
  }, []);

  // ── Save ──

  const handleSave = async () => {
    setIsSaving(true);
    const newVersion = version + 1;
    const content = JSON.stringify({ contractType, version: newVersion, blocks });
    try {
      if (isEditMode && templateId) {
        await templates.update(templateId, { name, description, type: 3, content });
      } else {
        await templates.create({ name, description, type: 3, content });
      }
      setVersion(newVersion);
      toast.success(isEditMode ? 'Contrat mis à jour' : 'Contrat enregistré');
      router.push('/dashboard/templates');
    } catch {
      toast.error("Échec de l'enregistrement");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Generate PDF ──

  const handleGenerate = async () => {
    if (blocks.length === 0) { toast.error('Ajoutez des blocs avant de générer'); return; }
    setIsGenerating(true);
    const toastId = toast.loading('Génération du PDF...');

    const globalVars: Record<string, string> = {};
    blocks.forEach((b) => Object.entries(b.fields).forEach(([k, v]) => { if (v && !k.startsWith('_')) globalVars[k] = v; }));

    const body = blocks.map((b) => `<div style="page-break-inside:avoid;">${renderBlock(b, globalVars)}</div>`).join('');
    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/><style>
      @page{size:A4;margin:18mm 20mm;}*{box-sizing:border-box;}
      body{font-family:Arial,sans-serif;font-size:10pt;color:#1a1a1a;margin:0;padding:0;line-height:1.6;}
      table{border-collapse:collapse;}hr{border:none;border-top:1px solid #e2e8f0;margin:16px 0;}
    </style></head><body>${body}</body></html>`;

    try {
      const res = await fetch('http://localhost:3000/templates/render-pdf', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ html, name }),
      });
      if (!res.ok) throw new Error('PDF failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${name}.pdf`; a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF téléchargé', { id: toastId });
    } catch {
      toast.error('Erreur génération PDF', { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };

  const typeConfig = CONTRACT_TYPES[contractType];

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden" onClick={() => setShowTypeMenu(false)}>

      {/* ── Toolbar ── */}
      <div className="h-12 border-b border-border bg-background flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={15} /> Retour
          </button>
          <div className="w-px h-4 bg-border" />
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowTypeMenu((v) => !v)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${typeConfig.color}`}>
              {typeConfig.label} <ChevronDown size={11} />
            </button>
            {showTypeMenu && (
              <div className="absolute top-full left-0 mt-1 w-52 bg-white rounded-xl border border-slate-200 shadow-lg z-50 overflow-hidden">
                {(Object.keys(CONTRACT_TYPES) as ContractType[]).map((t) => (
                  <button key={t} onClick={() => { setContractType(t); setShowTypeMenu(false); }}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-slate-50 ${contractType === t ? 'font-semibold' : 'text-muted-foreground'}`}>
                    {CONTRACT_TYPES[t].label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500">v{version}</span>
        </div>

        <span className="text-sm font-medium text-foreground/80 truncate max-w-xs">{name}</span>

        <div className="flex items-center gap-2">
          <button onClick={handleSave} disabled={isSaving}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-accent transition-colors disabled:opacity-50">
            <Save size={13} /> {isSaving ? 'Enregistrement...' : isEditMode ? 'Mettre à jour' : 'Enregistrer'}
          </button>
          <button onClick={handleGenerate} disabled={isGenerating || blocks.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors disabled:opacity-40">
            {isGenerating
              ? <><RefreshCw size={13} className="animate-spin" /> Génération...</>
              : <><Download size={13} /> Générer PDF</>}
          </button>
        </div>
      </div>

      {/* ── 3-panel body ── */}
      <div className="flex flex-1 overflow-hidden">
        <LibraryPanel onAdd={addBlock} />

        <ContractCanvas
          blocks={blocks}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onReorder={reorderBlocks}
          onDropNew={addBlock}
        />

        <PropertiesPanel
          block={selectedBlock}
          onUpdateField={(key, val) => selectedBlock && updateField(selectedBlock.id, key, val)}
          onDelete={() => selectedBlock && deleteBlock(selectedBlock.id)}
        />
      </div>
    </div>
  );
}

export default function ContractEditorPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ContractEditorContent />
    </Suspense>
  );
}
