'use client';

import { useState, useRef } from 'react';
import { Palette, Columns3, Receipt, Upload, X, Eye, EyeOff, Lock, GripVertical } from 'lucide-react';
import type {
  Invoice, ColumnKey, FontFamily, FontScale, BackgroundStyle, Currency, OperationNature,
  TableHeaderStyle, TableRowStriping, TableCellBorders, BlockStyle, CornerRadius, InvoiceDesign,
} from '@/lib/invoice/types';
import { ESSENTIAL_COLUMNS } from '@/lib/invoice/types';
import { CURRENCIES } from '@/lib/invoice/compute';
import { media } from '@/lib/api';
import toast from 'react-hot-toast';
import type { Dispatch } from './blocks';

interface Props {
  invoice: Invoice;
  dispatch: Dispatch;
}

type Tab = 'theme' | 'columns' | 'legal';

const COLUMN_LABELS: Record<ColumnKey, string> = {
  description: 'Description',
  qty:         'Quantité',
  unitPrice:   'Prix unitaire',
  vat:         'TVA',
  discount:    'Remise',
  total:       'Total HT',
};

const FONTS: { value: FontFamily; label: string }[] = [
  { value: 'inter',    label: 'Inter' },
  { value: 'roboto',   label: 'Roboto' },
  { value: 'opensans', label: 'Open Sans' },
];

const FONT_SCALES: { value: FontScale; label: string }[] = [
  { value: 'sm', label: 'Petit' },
  { value: 'md', label: 'Moyen' },
  { value: 'lg', label: 'Grand' },
];

const BACKGROUNDS: { value: BackgroundStyle; label: string }[] = [
  { value: 'plain',       label: 'Blanc uni' },
  { value: 'watermark',   label: 'Filigrane' },
  { value: 'header_band', label: 'Bandeau coloré' },
];

export function InspectorPanel({ invoice, dispatch }: Props) {
  const [tab, setTab] = useState<Tab>('theme');
  return (
    <div className="w-72 border-l border-border bg-white flex flex-col overflow-hidden shrink-0">
      <div className="flex border-b border-border shrink-0">
        <TabButton active={tab === 'theme'}    onClick={() => setTab('theme')}    icon={Palette}  label="Thème" />
        <TabButton active={tab === 'columns'} onClick={() => setTab('columns')} icon={Columns3} label="Colonnes" />
        <TabButton active={tab === 'legal'}    onClick={() => setTab('legal')}    icon={Receipt}  label="Paiement & Légal" />
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {tab === 'theme'   && <ThemeTab   invoice={invoice} dispatch={dispatch} />}
        {tab === 'columns' && <ColumnsTab invoice={invoice} dispatch={dispatch} />}
        {tab === 'legal'   && <LegalTab   invoice={invoice} dispatch={dispatch} />}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }: {
  active: boolean; onClick: () => void; icon: typeof Palette; label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-all border-b-2 ${
        active ? 'border-indigo-500 text-indigo-700 bg-indigo-50/30' : 'border-transparent text-slate-500 hover:text-slate-700'
      }`}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}

// ─── Thème tab ─────────────────────────────────────────────────────────────

function ThemeTab({ invoice, dispatch }: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const { url } = await media.upload(file);
      dispatch({ type: 'theme/updateLogo', patch: { url } });
      toast.success('Logo téléchargé');
    } catch {
      toast.error('Échec du téléchargement');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-5">
      <Section title="Logo">
        {invoice.theme.logo.url ? (
          <div className="flex items-center gap-2 p-2 border border-slate-200 rounded-lg">
            <img src={invoice.theme.logo.url} alt="" className="h-10 object-contain" />
            <button
              onClick={() => dispatch({ type: 'theme/updateLogo', patch: { url: null } })}
              className="ml-auto w-7 h-7 rounded hover:bg-red-50 flex items-center justify-center"
            >
              <X size={13} className="text-red-500" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-200 rounded-lg text-xs text-slate-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors disabled:opacity-50"
          >
            <Upload size={13} />
            {uploading ? 'Téléchargement...' : 'Ajouter un logo'}
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUpload(f);
            e.target.value = '';
          }}
        />
        <div className="grid grid-cols-2 gap-2 mt-2">
          <SmallNumber label="Largeur (px)" value={invoice.theme.logo.width}
            onChange={(v) => dispatch({ type: 'theme/updateLogo', patch: { width: v } })} />
          <SmallSelect
            label="Alignement"
            value={invoice.theme.logo.align}
            options={[{value:'left',label:'Gauche'},{value:'center',label:'Centre'},{value:'right',label:'Droite'}]}
            onChange={(v) => dispatch({ type: 'theme/updateLogo', patch: { align: v as 'left'|'center'|'right' } })}
          />
        </div>
      </Section>

      <Section title="Couleurs">
        <ColorRow label="Principale" value={invoice.theme.colors.primary}
          onChange={(v) => dispatch({ type: 'theme/updateColors', patch: { primary: v } })} />
        <ColorRow label="Accentuation" value={invoice.theme.colors.accent}
          onChange={(v) => dispatch({ type: 'theme/updateColors', patch: { accent: v } })} />
        <ColorRow label="Texte" value={invoice.theme.colors.text}
          onChange={(v) => dispatch({ type: 'theme/updateColors', patch: { text: v } })} />
        <ColorRow label="Texte secondaire" value={invoice.theme.colors.muted}
          onChange={(v) => dispatch({ type: 'theme/updateColors', patch: { muted: v } })} />
      </Section>

      <Section title="Typographie">
        <SmallSelect
          label="Police"
          value={invoice.theme.font}
          options={FONTS.map((f) => ({ value: f.value, label: f.label }))}
          onChange={(v) => dispatch({ type: 'theme/update', patch: { font: v as FontFamily } })}
        />
        <SmallSelect
          label="Taille"
          value={invoice.theme.fontScale}
          options={FONT_SCALES.map((s) => ({ value: s.value, label: s.label }))}
          onChange={(v) => dispatch({ type: 'theme/update', patch: { fontScale: v as FontScale } })}
        />
      </Section>

      <Section title="Arrière-plan">
        <SmallSelect
          label="Style"
          value={invoice.theme.background}
          options={BACKGROUNDS.map((b) => ({ value: b.value, label: b.label }))}
          onChange={(v) => dispatch({ type: 'theme/update', patch: { background: v as BackgroundStyle } })}
        />
      </Section>

      <Section title="Devise">
        <SmallSelect
          label="Devise de la facture"
          value={invoice.data.currency}
          options={CURRENCIES.map((c) => ({ value: c.code, label: `${c.code} (${c.symbol})` }))}
          onChange={(v) => dispatch({ type: 'data/setCurrency', value: v as Currency })}
        />
      </Section>

      <DesignSection invoice={invoice} dispatch={dispatch} />
    </div>
  );
}

const TABLE_HEADER_OPTIONS: { value: TableHeaderStyle; label: string }[] = [
  { value: 'filled',  label: 'Plein (couleur principale)' },
  { value: 'outline', label: 'Contour' },
  { value: 'minimal', label: 'Minimal (souligné)' },
];

const TABLE_STRIPE_OPTIONS: { value: TableRowStriping; label: string }[] = [
  { value: 'none',         label: 'Aucune' },
  { value: 'zebra_light',  label: 'Bandes claires' },
  { value: 'zebra_accent', label: 'Bandes accent' },
];

const TABLE_BORDERS_OPTIONS: { value: TableCellBorders; label: string }[] = [
  { value: 'all',  label: 'Toutes' },
  { value: 'rows', label: 'Horizontales' },
  { value: 'none', label: 'Aucune' },
];

const BLOCK_STYLE_OPTIONS: { value: BlockStyle; label: string }[] = [
  { value: 'flat',     label: 'Plat (fond gris)' },
  { value: 'bordered', label: 'Avec bordure' },
  { value: 'shadowed', label: 'Avec ombre' },
];

const RADIUS_OPTIONS: { value: CornerRadius; label: string }[] = [
  { value: 'square',  label: 'Carré (0)' },
  { value: 'soft',    label: 'Doux (4 px)' },
  { value: 'rounded', label: 'Arrondi (8 px)' },
  { value: 'pill',    label: 'Très arrondi (12 px)' },
];

function DesignSection({ invoice, dispatch }: Props) {
  const d = invoice.theme.design;
  const update = (patch: Partial<InvoiceDesign>) =>
    dispatch({ type: 'theme/updateDesign', patch });
  return (
    <Section title="Design (tables & bordures)">
      <SmallSelect
        label="En-tête de table"
        value={d.tableHeaderStyle}
        options={TABLE_HEADER_OPTIONS}
        onChange={(v) => update({ tableHeaderStyle: v as TableHeaderStyle })}
      />
      <SmallSelect
        label="Lignes alternées"
        value={d.tableRowStriping}
        options={TABLE_STRIPE_OPTIONS}
        onChange={(v) => update({ tableRowStriping: v as TableRowStriping })}
      />
      <SmallSelect
        label="Bordures cellules"
        value={d.tableCellBorders}
        options={TABLE_BORDERS_OPTIONS}
        onChange={(v) => update({ tableCellBorders: v as TableCellBorders })}
      />
      <SmallSelect
        label="Style des blocs"
        value={d.blockStyle}
        options={BLOCK_STYLE_OPTIONS}
        onChange={(v) => update({ blockStyle: v as BlockStyle })}
      />
      <SmallSelect
        label="Coins arrondis"
        value={d.cornerRadius}
        options={RADIUS_OPTIONS}
        onChange={(v) => update({ cornerRadius: v as CornerRadius })}
      />
    </Section>
  );
}

// ─── Colonnes tab ──────────────────────────────────────────────────────────

function ColumnsTab({ invoice, dispatch }: Props) {
  const [dragKey, setDragKey] = useState<ColumnKey | null>(null);

  const handleDrop = (target: ColumnKey) => {
    if (!dragKey || dragKey === target) { setDragKey(null); return; }
    const cols = [...invoice.layout.columns];
    const from = cols.findIndex((c) => c.key === dragKey);
    const to   = cols.findIndex((c) => c.key === target);
    if (from === -1 || to === -1) return;
    const [moved] = cols.splice(from, 1);
    cols.splice(to, 0, moved);
    dispatch({ type: 'layout/reorderColumns', columns: cols });
    setDragKey(null);
  };

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-slate-500 leading-relaxed">
        Glissez pour réordonner. Les colonnes <span className="font-semibold">Description, Quantité, Prix unitaire</span> et <span className="font-semibold">Total HT</span> sont obligatoires.
      </p>
      <div className="space-y-1">
        {invoice.layout.columns.map((c) => {
          const essential = ESSENTIAL_COLUMNS.includes(c.key);
          return (
            <div
              key={c.key}
              draggable
              onDragStart={() => setDragKey(c.key)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(c.key)}
              className={`flex items-center gap-1.5 px-2 py-2 rounded-md border border-slate-200 bg-white text-[12px] ${!c.visible ? 'opacity-50' : ''}`}
            >
              <GripVertical size={11} className="text-slate-300 cursor-grab" />
              <span className="flex-1 truncate font-medium text-slate-700">{COLUMN_LABELS[c.key]}</span>
              <button
                onClick={() => dispatch({ type: 'layout/toggleColumn', key: c.key })}
                disabled={essential}
                className="w-6 h-6 rounded flex items-center justify-center hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                title={essential ? 'Colonne obligatoire' : c.visible ? 'Masquer' : 'Afficher'}
              >
                {essential ? <Lock size={11} className="text-slate-400" />
                : c.visible ? <Eye size={11} className="text-slate-500" />
                            : <EyeOff size={11} className="text-slate-400" />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Paiement & Légal tab ──────────────────────────────────────────────────

function LegalTab({ invoice, dispatch }: Props) {
  const { payment, legal, type } = invoice.data;

  const TYPE_HINT: Record<typeof type, string | null> = {
    standard:    null,
    'pro-forma': 'Pro-forma : pas une facture au sens du CGI. Pénalités et frais de recouvrement sont désactivés par défaut.',
    acompte:     'Acompte : TVA exigible à l\'encaissement (art. 269-2-a bis CGI). Référencez la commande dans le bloc « Spécifique au type ».',
    solde:       'Solde : pensez à lister les acomptes déjà facturés dans le bloc « Spécifique au type » — ils seront soustraits du total.',
    avoir:       'Avoir : facture rectificative (art. 289-I-2 CGI). Pas de pénalités de retard, montant présenté en négatif.',
    recurrente:  'Récurrente : période facturée et mandat SEPA (RUM) — règlement UE 260/2012.',
  };

  return (
    <div className="space-y-5">
      {TYPE_HINT[type] && (
        <div className="text-[10px] leading-relaxed text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-2">
          {TYPE_HINT[type]}
        </div>
      )}

      <Section title="Conditions de paiement">
        <SmallField label="Conditions" value={payment.paymentTerms}
          onChange={(v) => dispatch({ type: 'payment/update', patch: { paymentTerms: v } })} />
        <SmallField label="IBAN"     value={payment.iban}
          onChange={(v) => dispatch({ type: 'payment/update', patch: { iban: v } })} />
        <SmallField label="BIC"      value={payment.bic}
          onChange={(v) => dispatch({ type: 'payment/update', patch: { bic: v } })} />
        <SmallField label="Banque"   value={payment.bankName}
          onChange={(v) => dispatch({ type: 'payment/update', patch: { bankName: v } })} />
      </Section>

      <Section title="Pénalités & frais (FR)">
        <SmallNumber label="Taux de pénalité (% / an)" value={payment.latePenaltyRate} step={0.01}
          onChange={(v) => dispatch({ type: 'payment/update', patch: { latePenaltyRate: v } })} />
        <SmallNumber label="Indemnité de recouvrement" value={payment.recoveryFee} step={1}
          onChange={(v) => dispatch({ type: 'payment/update', patch: { recoveryFee: v } })} />
      </Section>

      <Section title="Mentions légales auto-injectées">
        <Toggle label="Escompte « néant »" value={legal.showNoDiscount}
          onChange={(v) => dispatch({ type: 'legal/update', patch: { showNoDiscount: v } })} />
        <Toggle label="Pénalités de retard (L. 441-10)" value={legal.showLatePenalty}
          onChange={(v) => dispatch({ type: 'legal/update', patch: { showLatePenalty: v } })} />
        <Toggle label="Indemnité de recouvrement 40 €" value={legal.showRecoveryFee}
          onChange={(v) => dispatch({ type: 'legal/update', patch: { showRecoveryFee: v } })} />
        <Toggle label="Auto-liquidation (art. 283-2 CGI)" value={legal.showAutoLiquidation}
          onChange={(v) => dispatch({ type: 'legal/update', patch: { showAutoLiquidation: v } })} />
        <Toggle label="Exonération TVA intracom. (262 ter)" value={legal.showIntraCommunityVat}
          onChange={(v) => dispatch({ type: 'legal/update', patch: { showIntraCommunityVat: v } })} />
        <Toggle label="Option pour les débits" value={legal.showOptionDebits}
          onChange={(v) => dispatch({ type: 'legal/update', patch: { showOptionDebits: v } })} />
      </Section>

      <Section title="Facturation électronique (2026)">
        <SmallSelect
          label="Nature de l'opération"
          value={invoice.data.operationNature ?? ''}
          options={[
            { value: '',         label: '— non spécifié —' },
            { value: 'goods',    label: 'Livraison de biens' },
            { value: 'services', label: 'Prestation de services' },
            { value: 'mixed',    label: 'Mixte (biens et services)' },
          ]}
          onChange={(v) => dispatch({ type: 'data/setOperationNature', value: (v || undefined) as OperationNature | undefined })}
        />
      </Section>

      <Section title="Texte légal personnalisé">
        <textarea
          value={legal.customText}
          onChange={(e) => dispatch({ type: 'legal/update', patch: { customText: e.target.value } })}
          rows={4}
          placeholder="Ajouter un texte légal supplémentaire..."
          className="w-full text-[11px] px-2.5 py-2 rounded-md border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-300 resize-y"
        />
      </Section>
    </div>
  );
}

// ─── Shared field primitives ───────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-2">{title}</h4>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <label className="flex-1 text-[11px] text-slate-600">{label}</label>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-7 rounded cursor-pointer border border-slate-200"
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-20 text-[11px] font-mono px-1.5 py-1 rounded border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-300"
      />
    </div>
  );
}

function SmallField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-[10px] text-slate-500 mb-0.5">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full text-[11px] px-2.5 py-1.5 rounded-md border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-300"
      />
    </div>
  );
}

function SmallNumber({ label, value, step = 1, onChange }: { label: string; value: number; step?: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="block text-[10px] text-slate-500 mb-0.5">{label}</label>
      <input
        type="number"
        value={value}
        step={step}
        onChange={(e) => {
          const n = parseFloat(e.target.value);
          onChange(Number.isFinite(n) ? n : 0);
        }}
        className="w-full text-[11px] px-2.5 py-1.5 rounded-md border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-300"
      />
    </div>
  );
}

function SmallSelect({ label, value, options, onChange }: {
  label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-[10px] text-slate-500 mb-0.5">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full text-[11px] px-2.5 py-1.5 rounded-md border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-300"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-[11px] text-slate-600 cursor-pointer">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-300"
      />
      {label}
    </label>
  );
}
