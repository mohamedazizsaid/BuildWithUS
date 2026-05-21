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
import { Label } from '@/components/ui/label';
// Reuse the email editor's properties-panel primitives so the invoice editor
// shares the same visual language (accordion sections, pill toggle, swatch
// color picker, rounded numeric inputs, styled selects).
import { AccordionSection, ColorPicker, NumericInput, Toggle as SharedToggle } from '@/components/editor/panels/shared';
import { StyledSelect } from '@/components/editor/panels/FontSelectors';
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
    <div className="w-70 border-l border-border bg-background flex flex-col overflow-hidden shrink-0">
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
        active ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-muted-foreground hover:text-foreground/80'
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
  const [openSection, setOpenSection] = useState<string | null>('logo');

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
    <div className="space-y-2">
      <AccordionSection openSection={openSection} setOpenSection={setOpenSection} id="logo" title="Logo">
        {invoice.theme.logo.url ? (
          <div className="flex items-center gap-2 p-2 border border-border rounded-xl bg-background">
            <img src={invoice.theme.logo.url} alt="" className="h-10 object-contain" />
            <button
              onClick={() => dispatch({ type: 'theme/updateLogo', patch: { url: null } })}
              className="ml-auto w-7 h-7 rounded-md hover:bg-red-50 flex items-center justify-center"
              title="Supprimer le logo"
            >
              <X size={13} className="text-red-500" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-border text-xs text-muted-foreground hover:border-ring hover:text-foreground/80 transition-colors disabled:opacity-50"
          >
            <Upload size={13} />
            {uploading ? 'Téléchargement…' : 'Ajouter un logo'}
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleUpload(f);
            e.target.value = '';
          }}
        />
        <div>
          <Label className="text-xs">Largeur (px)</Label>
          <NumericInput
            value={`${invoice.theme.logo.width}px`}
            onChange={(v) => dispatch({ type: 'theme/updateLogo', patch: { width: parseInt(v) || 0 } })}
          />
        </div>
        <StyledSelect
          label="Alignement"
          value={invoice.theme.logo.align}
          options={[{ value: 'left', label: 'Gauche' }, { value: 'center', label: 'Centre' }, { value: 'right', label: 'Droite' }]}
          onChange={(v) => dispatch({ type: 'theme/updateLogo', patch: { align: v as 'left' | 'center' | 'right' } })}
        />
      </AccordionSection>

      <AccordionSection openSection={openSection} setOpenSection={setOpenSection} id="colors" title="Couleurs">
        <ColorPicker label="Principale"     value={invoice.theme.colors.primary} onChange={(v) => dispatch({ type: 'theme/updateColors', patch: { primary: v } })} />
        <ColorPicker label="Accentuation"   value={invoice.theme.colors.accent}  onChange={(v) => dispatch({ type: 'theme/updateColors', patch: { accent: v } })} />
        <ColorPicker label="Texte"          value={invoice.theme.colors.text}    onChange={(v) => dispatch({ type: 'theme/updateColors', patch: { text: v } })} />
        <ColorPicker label="Texte secondaire" value={invoice.theme.colors.muted} onChange={(v) => dispatch({ type: 'theme/updateColors', patch: { muted: v } })} />
      </AccordionSection>

      <AccordionSection openSection={openSection} setOpenSection={setOpenSection} id="typography" title="Typographie">
        <StyledSelect
          label="Police"
          value={invoice.theme.font}
          options={FONTS.map((f) => ({ value: f.value, label: f.label }))}
          onChange={(v) => dispatch({ type: 'theme/update', patch: { font: v as FontFamily } })}
        />
        <StyledSelect
          label="Taille"
          value={invoice.theme.fontScale}
          options={FONT_SCALES.map((s) => ({ value: s.value, label: s.label }))}
          onChange={(v) => dispatch({ type: 'theme/update', patch: { fontScale: v as FontScale } })}
        />
      </AccordionSection>

      <AccordionSection openSection={openSection} setOpenSection={setOpenSection} id="background" title="Arrière-plan">
        <StyledSelect
          label="Style"
          value={invoice.theme.background}
          options={BACKGROUNDS.map((b) => ({ value: b.value, label: b.label }))}
          onChange={(v) => dispatch({ type: 'theme/update', patch: { background: v as BackgroundStyle } })}
        />
      </AccordionSection>

      <AccordionSection openSection={openSection} setOpenSection={setOpenSection} id="currency" title="Devise">
        <StyledSelect
          label="Devise de la facture"
          value={invoice.data.currency}
          options={CURRENCIES.map((c) => ({ value: c.code, label: `${c.code} (${c.symbol})` }))}
          onChange={(v) => dispatch({ type: 'data/setCurrency', value: v as Currency })}
        />
      </AccordionSection>

      <AccordionSection openSection={openSection} setOpenSection={setOpenSection} id="design" title="Design (tables & bordures)">
        <DesignFields invoice={invoice} dispatch={dispatch} />
      </AccordionSection>
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

function DesignFields({ invoice, dispatch }: Props) {
  const d = invoice.theme.design;
  const update = (patch: Partial<InvoiceDesign>) => dispatch({ type: 'theme/updateDesign', patch });
  return (
    <>
      <StyledSelect label="En-tête de table"    value={d.tableHeaderStyle} options={TABLE_HEADER_OPTIONS}  onChange={(v) => update({ tableHeaderStyle: v as TableHeaderStyle })} />
      <StyledSelect label="Lignes alternées"    value={d.tableRowStriping} options={TABLE_STRIPE_OPTIONS}  onChange={(v) => update({ tableRowStriping: v as TableRowStriping })} />
      <StyledSelect label="Bordures cellules"   value={d.tableCellBorders} options={TABLE_BORDERS_OPTIONS} onChange={(v) => update({ tableCellBorders: v as TableCellBorders })} />
      <StyledSelect label="Style des blocs"     value={d.blockStyle}       options={BLOCK_STYLE_OPTIONS}   onChange={(v) => update({ blockStyle: v as BlockStyle })} />
      <StyledSelect label="Coins arrondis"      value={d.cornerRadius}     options={RADIUS_OPTIONS}        onChange={(v) => update({ cornerRadius: v as CornerRadius })} />
    </>
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
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Glissez pour réordonner. Les colonnes <span className="font-semibold text-foreground/80">Description, Quantité, Prix unitaire</span> et <span className="font-semibold text-foreground/80">Total HT</span> sont obligatoires.
      </p>
      <div className="space-y-1.5">
        {invoice.layout.columns.map((c) => {
          const essential = ESSENTIAL_COLUMNS.includes(c.key);
          return (
            <div
              key={c.key}
              draggable
              onDragStart={() => setDragKey(c.key)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(c.key)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-background text-xs shadow-sm hover:border-ring transition-all ${!c.visible ? 'opacity-50' : ''}`}
            >
              <GripVertical size={12} className="text-muted-foreground cursor-grab" />
              <span className="flex-1 truncate font-medium text-foreground/80">{COLUMN_LABELS[c.key]}</span>
              <button
                onClick={() => dispatch({ type: 'layout/toggleColumn', key: c.key })}
                disabled={essential}
                className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                title={essential ? 'Colonne obligatoire' : c.visible ? 'Masquer' : 'Afficher'}
              >
                {essential ? <Lock size={12} className="text-muted-foreground" />
                : c.visible ? <Eye size={12} className="text-muted-foreground" />
                            : <EyeOff size={12} className="text-muted-foreground" />}
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
  // Payment terms / IBAN / BIC / Bank are edited directly in the Paiement
  // block on the canvas — only the rate-style fields and legal-mention
  // toggles live here.
  const [openSection, setOpenSection] = useState<string | null>('penalty');

  const TYPE_HINT: Record<typeof type, string | null> = {
    standard:    null,
    'pro-forma': 'Pro-forma : pas une facture au sens du CGI. Pénalités et frais de recouvrement sont désactivés par défaut.',
    acompte:     'Acompte : TVA exigible à l\'encaissement (art. 269-2-a bis CGI). Référencez la commande dans le bloc « Spécifique au type ».',
    solde:       'Solde : pensez à lister les acomptes déjà facturés dans le bloc « Spécifique au type » — ils seront soustraits du total.',
    avoir:       'Avoir : facture rectificative (art. 289-I-2 CGI). Pas de pénalités de retard, montant présenté en négatif.',
    recurrente:  'Récurrente : période facturée et mandat SEPA (RUM) — règlement UE 260/2012.',
  };

  return (
    <div className="space-y-2">
      {TYPE_HINT[type] && (
        <div className="text-[10px] leading-relaxed text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-2">
          {TYPE_HINT[type]}
        </div>
      )}

      <AccordionSection openSection={openSection} setOpenSection={setOpenSection} id="penalty" title="Pénalités & frais (FR)">
        <DecimalField label="Taux de pénalité (% / an)" value={payment.latePenaltyRate} step={0.01}
          onChange={(v) => dispatch({ type: 'payment/update', patch: { latePenaltyRate: v } })} />
        <DecimalField label="Indemnité de recouvrement" value={payment.recoveryFee} step={1}
          onChange={(v) => dispatch({ type: 'payment/update', patch: { recoveryFee: v } })} />
      </AccordionSection>

      <AccordionSection openSection={openSection} setOpenSection={setOpenSection} id="mentions" title="Mentions légales auto-injectées">
        <SharedToggle label="Escompte « néant »" value={legal.showNoDiscount}
          onChange={(v) => dispatch({ type: 'legal/update', patch: { showNoDiscount: v } })} />
        <SharedToggle label="Pénalités de retard (L. 441-10)" value={legal.showLatePenalty}
          onChange={(v) => dispatch({ type: 'legal/update', patch: { showLatePenalty: v } })} />
        <SharedToggle label="Indemnité de recouvrement 40 €" value={legal.showRecoveryFee}
          onChange={(v) => dispatch({ type: 'legal/update', patch: { showRecoveryFee: v } })} />
        <SharedToggle label="Auto-liquidation (art. 283-2 CGI)" value={legal.showAutoLiquidation}
          onChange={(v) => dispatch({ type: 'legal/update', patch: { showAutoLiquidation: v } })} />
        <SharedToggle label="Exonération TVA intracom. (262 ter)" value={legal.showIntraCommunityVat}
          onChange={(v) => dispatch({ type: 'legal/update', patch: { showIntraCommunityVat: v } })} />
        <SharedToggle label="Option pour les débits" value={legal.showOptionDebits}
          onChange={(v) => dispatch({ type: 'legal/update', patch: { showOptionDebits: v } })} />
      </AccordionSection>

      <AccordionSection openSection={openSection} setOpenSection={setOpenSection} id="efactor" title="Facturation électronique (2026)">
        <StyledSelect
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
      </AccordionSection>

      <AccordionSection openSection={openSection} setOpenSection={setOpenSection} id="custom" title="Texte légal personnalisé">
        <textarea
          value={legal.customText}
          onChange={(e) => dispatch({ type: 'legal/update', patch: { customText: e.target.value } })}
          rows={4}
          placeholder="Ajouter un texte légal supplémentaire…"
          className="w-full text-xs px-3 py-2 rounded-xl border border-border bg-background shadow-sm focus:outline-none focus:border-ring resize-y"
        />
      </AccordionSection>
    </div>
  );
}

// ─── Local field primitives matching the email editor's look ──────────────

/** Numeric field for decimal/fractional values (rates, fees) — sibling of
 *  shared `NumericInput`, which is whole-pixel-only. */
function DecimalField({ label, value, step = 1, onChange }: {
  label: string; value: number; step?: number; onChange: (v: number) => void;
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center h-9 rounded-xl border border-border overflow-hidden shadow-sm hover:border-ring transition-all mt-1">
        <input
          type="number"
          value={value}
          step={step}
          onChange={(e) => {
            const n = parseFloat(e.target.value);
            onChange(Number.isFinite(n) ? n : 0);
          }}
          className="flex-1 h-full text-xs px-3 border-0 outline-none bg-background"
        />
      </div>
    </div>
  );
}
