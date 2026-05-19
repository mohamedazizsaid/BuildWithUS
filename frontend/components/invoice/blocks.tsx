'use client';

import { Trash2, Copy, Plus } from 'lucide-react';
import type { Invoice, InvoiceData, InvoiceTheme, Party, ColumnKey, RecurrenceInterval } from '@/lib/invoice/types';
import type { InvoiceAction } from '@/lib/invoice/reducer';
import { computeTotals, formatMoney, lineSubtotalHT } from '@/lib/invoice/compute';
import { buildFooterMentions, designCss } from '@/lib/invoice/renderer';
import { InlineText, InlineNumber, InlineNumberOrToken } from './inline';

export type Dispatch = (action: InvoiceAction) => void;

interface BlockProps {
  invoice: Invoice;
  dispatch: Dispatch;
  selectedBlock: string | null;
  onSelectBlock: (id: string | null) => void;
}

const INVOICE_TYPE_LABELS: Record<InvoiceData['type'], string> = {
  standard:   'FACTURE',
  'pro-forma':'FACTURE PRO-FORMA',
  acompte:    'FACTURE D\'ACOMPTE',
  solde:      'FACTURE DE SOLDE',
  avoir:      'FACTURE D\'AVOIR',
  recurrente: 'FACTURE RÉCURRENTE',
};

const TYPE_BADGE: Record<InvoiceData['type'], { bg: string; fg: string; label: string } | null> = {
  standard:   null,
  'pro-forma':{ bg: '#f1f5f9', fg: '#475569', label: 'Sans valeur fiscale' },
  acompte:    { bg: '#fef3c7', fg: '#92400e', label: 'Acompte' },
  solde:      { bg: '#d1fae5', fg: '#065f46', label: 'Facture de solde' },
  avoir:      { bg: '#fee2e2', fg: '#991b1b', label: 'Facture rectificative' },
  recurrente: { bg: '#ede9fe', fg: '#5b21b6', label: 'Échéance récurrente' },
};

const COLUMN_LABELS: Record<ColumnKey, string> = {
  description: 'Description',
  qty:         'Qté',
  unitPrice:   'Prix unitaire HT',
  vat:         'TVA',
  discount:    'Remise',
  total:       'Total HT',
};

// ─── Block wrapper ─────────────────────────────────────────────────────────

function BlockShell({
  id, selected, onSelect, children,
}: { id: string; selected: boolean; onSelect: (id: string) => void; children: React.ReactNode }) {
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onSelect(id); }}
      className={`relative rounded-md transition-all ${selected ? 'ring-2 ring-indigo-300 ring-offset-2' : 'hover:ring-1 hover:ring-slate-200'}`}
    >
      {children}
    </div>
  );
}

// ─── Header ─────────────────────────────────────────────────────────────────

export function HeaderBlock({ invoice, dispatch, selectedBlock, onSelectBlock }: BlockProps) {
  const { data, theme } = invoice;
  return (
    <BlockShell id="header" selected={selectedBlock === 'header'} onSelect={onSelectBlock}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ textAlign: theme.logo.align, flex: 1 }}>
          {theme.logo.url ? (
            <img src={theme.logo.url} alt="" style={{
              maxWidth: theme.logo.width, height: 'auto', display: 'block',
              margin: theme.logo.align === 'center' ? '0 auto' : theme.logo.align === 'right' ? '0 0 0 auto' : '0 auto 0 0',
            }} />
          ) : (
            <div className="text-[10px] text-slate-300 italic">
              Logo (ajoutez-le dans l&apos;onglet Thème)
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontSize: '22pt', fontWeight: 800, color: theme.colors.primary, letterSpacing: '-0.5px',
          }}>
            {INVOICE_TYPE_LABELS[data.type]}
          </div>
          <InlineText
            value={data.number}
            onChange={(v) => dispatch({ type: 'data/setNumber', value: v })}
            placeholder="N° de facture"
            ariaLabel="Numéro de facture"
            style={{ color: theme.colors.muted, fontSize: '10pt', marginTop: 4, textAlign: 'right' }}
          />
          {TYPE_BADGE[data.type] && (
            <div style={{
              display: 'inline-block', marginTop: 6, padding: '3px 8px', borderRadius: 4,
              background: TYPE_BADGE[data.type]!.bg, color: TYPE_BADGE[data.type]!.fg,
              fontSize: '8pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
            }}>
              {data.type === 'acompte' && data.typeSpecific.acompte
                ? `Acompte ${data.typeSpecific.acompte.depositPercent || 0}%`
                : TYPE_BADGE[data.type]!.label}
            </div>
          )}
        </div>
      </div>
    </BlockShell>
  );
}

// ─── Parties ────────────────────────────────────────────────────────────────

export function PartiesBlock({ invoice, dispatch, selectedBlock, onSelectBlock }: BlockProps) {
  const { data, theme } = invoice;
  return (
    <BlockShell id="parties" selected={selectedBlock === 'parties'} onSelect={onSelectBlock}>
      <div style={{ display: 'flex', gap: 24, marginTop: 18 }}>
        <PartyEditor label="Émetteur" party={data.seller} theme={theme} onChange={(patch) => dispatch({ type: 'data/updateParty', party: 'seller', patch })} />
        <PartyEditor label="Facturé à" party={data.client} theme={theme} onChange={(patch) => dispatch({ type: 'data/updateParty', party: 'client', patch })} />
      </div>
      <div style={{ height: 2, background: theme.colors.primary, margin: '14px 0' }} />
    </BlockShell>
  );
}

function PartyEditor({ label, party, theme, onChange }: {
  label: string;
  party: Party;
  theme: InvoiceTheme;
  onChange: (patch: Partial<Party>) => void;
}) {
  const lbl = { fontSize: '8pt', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.5px', color: theme.colors.muted, marginBottom: 4 };
  const muted = { color: theme.colors.muted, fontSize: '9pt' };
  return (
    <div style={{ flex: 1 }}>
      <div style={lbl}>{label}</div>
      <InlineText
        value={party.name}
        onChange={(v) => onChange({ name: v })}
        placeholder="Nom / Raison sociale"
        style={{ fontWeight: 700, fontSize: '11pt', color: theme.colors.primary }}
      />
      {/* Forme juridique + capital social — obligatoires pour les sociétés (C. com. R. 123-237) */}
      <div style={{ display: 'flex', gap: 6 }}>
        <InlineText value={party.legalForm ?? ''} onChange={(v) => onChange({ legalForm: v })} placeholder="Forme (SARL, SAS…)" style={{ ...muted, minWidth: 90 }} />
        <InlineText value={party.shareCapital ?? ''} onChange={(v) => onChange({ shareCapital: v })} placeholder="Capital (10 000 €)" style={muted} />
      </div>
      <InlineText value={party.address}  onChange={(v) => onChange({ address: v })}  placeholder="Adresse"      style={muted} />
      <div style={{ display: 'flex', gap: 6 }}>
        <InlineText value={party.zipCode}  onChange={(v) => onChange({ zipCode: v })}  placeholder="CP"      style={{ ...muted, minWidth: 40 }} />
        <InlineText value={party.city}     onChange={(v) => onChange({ city: v })}     placeholder="Ville"   style={muted} />
      </div>
      <InlineText value={party.country}    onChange={(v) => onChange({ country: v })}    placeholder="Pays"    style={muted} />
      <InlineText value={party.email}      onChange={(v) => onChange({ email: v })}      placeholder="Email"   style={muted} />
      <InlineText value={party.phone}      onChange={(v) => onChange({ phone: v })}      placeholder="Téléphone" style={muted} />
      <div style={{ display: 'flex', gap: 6 }}>
        <InlineText value={party.siret}    onChange={(v) => onChange({ siret: v })}    placeholder="SIRET"   style={muted} />
        <InlineText value={party.rcsCity ?? ''} onChange={(v) => onChange({ rcsCity: v })} placeholder="Ville RCS" style={muted} />
      </div>
      <InlineText value={party.vatNumber}  onChange={(v) => onChange({ vatNumber: v })}  placeholder="N° TVA intracom."  style={muted} />
    </div>
  );
}

// ─── Meta ───────────────────────────────────────────────────────────────────

export function MetaBlock({ invoice, dispatch, selectedBlock, onSelectBlock }: BlockProps) {
  const { data, theme } = invoice;
  const lbl = { fontSize: '8pt', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.5px', color: theme.colors.muted, marginRight: 6 };
  return (
    <BlockShell id="meta" selected={selectedBlock === 'meta'} onSelect={onSelectBlock}>
      <div style={{ display: 'flex', gap: 18, rowGap: 8, flexWrap: 'wrap', fontSize: '10pt', marginTop: 10 }}>
        <div>
          <span style={lbl}>Date</span>
          <input
            type="date"
            value={data.issueDate}
            onChange={(e) => dispatch({ type: 'data/setDate', field: 'issueDate', value: e.target.value })}
            className="bg-transparent focus:outline-none focus:bg-indigo-50/40 rounded"
          />
        </div>
        {/* Date de livraison / exécution — obligatoire (Art. 242 nonies A, Ann. II CGI) */}
        <div title="Date de livraison/exécution — mention obligatoire">
          <span style={lbl}>Livraison</span>
          <input
            type="date"
            value={data.deliveryDate ?? ''}
            onChange={(e) => dispatch({ type: 'data/setDeliveryDate', value: e.target.value })}
            className="bg-transparent focus:outline-none focus:bg-indigo-50/40 rounded"
          />
        </div>
        <div>
          <span style={lbl}>Échéance</span>
          <input
            type="date"
            value={data.dueDate}
            onChange={(e) => dispatch({ type: 'data/setDate', field: 'dueDate', value: e.target.value })}
            className="bg-transparent focus:outline-none focus:bg-indigo-50/40 rounded"
          />
        </div>
        <div>
          <span style={lbl}>Devise</span>
          <span style={{ fontWeight: 600 }}>{data.currency}</span>
        </div>
        <div>
          <span style={lbl}>Bon de cmd</span>
          <InlineText
            value={data.purchaseOrderRef ?? ''}
            onChange={(v) => dispatch({ type: 'data/setPurchaseOrderRef', value: v })}
            placeholder="BC-2026-001"
          />
        </div>
      </div>
    </BlockShell>
  );
}

// ─── Type-specific (FR/EU regulatory info — varies per invoice type) ───────

export function TypeSpecificBlock({ invoice, dispatch, selectedBlock, onSelectBlock }: BlockProps) {
  const { data, theme } = invoice;
  if (data.type === 'standard') {
    return (
      <BlockShell id="typeSpecific" selected={selectedBlock === 'typeSpecific'} onSelect={onSelectBlock}>
        <div style={{ marginTop: 14, padding: '10px 14px', background: '#f8fafc', borderRadius: 8, fontSize: '9pt', color: theme.colors.muted, fontStyle: 'italic' }}>
          Aucune information type-spécifique pour une facture standard.
        </div>
      </BlockShell>
    );
  }
  const d = designCss(theme);
  const accentStyle: React.CSSProperties = {
    ...cssStringToObj(d.blockAccent),
    marginTop: 14, padding: '12px 14px', fontSize: '10pt',
    borderRadius: `0 ${d.radiusPx}px ${d.radiusPx}px 0`,
  };
  return (
    <BlockShell id="typeSpecific" selected={selectedBlock === 'typeSpecific'} onSelect={onSelectBlock}>
      <div style={accentStyle}>
        <TypeSpecificFields data={data} theme={theme} dispatch={dispatch} />
      </div>
    </BlockShell>
  );
}

function TypeSpecificFields({ data, theme, dispatch }: { data: InvoiceData; theme: InvoiceTheme; dispatch: Dispatch }) {
  switch (data.type) {
    case 'pro-forma':  return <ProFormaFields data={data} theme={theme} dispatch={dispatch} />;
    case 'acompte':    return <AcompteFields  data={data} theme={theme} dispatch={dispatch} />;
    case 'solde':      return <SoldeFields    data={data} theme={theme} dispatch={dispatch} />;
    case 'avoir':      return <AvoirFields    data={data} theme={theme} dispatch={dispatch} />;
    case 'recurrente': return <RecurrenteFields data={data} theme={theme} dispatch={dispatch} />;
    default:           return null;
  }
}

function FieldRow({ label, theme, children }: { label: string; theme: InvoiceTheme; children: React.ReactNode }) {
  const lbl = {
    fontSize: '8pt', fontWeight: 700 as const, textTransform: 'uppercase' as const,
    letterSpacing: '0.5px', color: theme.colors.muted, display: 'inline-block',
    minWidth: 150, marginRight: 6,
  };
  return (
    <div style={{ marginBottom: 4 }}>
      <span style={lbl}>{label}</span>
      {children}
    </div>
  );
}

function ProFormaFields({ data, theme, dispatch }: { data: InvoiceData; theme: InvoiceTheme; dispatch: Dispatch }) {
  const pf = data.typeSpecific.proForma ?? { validUntil: '', acceptanceClause: '' };
  return (
    <>
      <FieldRow label="Valable jusqu'au" theme={theme}>
        <input
          type="date" value={pf.validUntil}
          onChange={(e) => dispatch({ type: 'proForma/update', patch: { validUntil: e.target.value } })}
          className="bg-transparent focus:outline-none focus:bg-indigo-50/40 rounded text-[10pt]"
        />
      </FieldRow>
      <FieldRow label="Clause d'acceptation" theme={theme}>
        <InlineText
          value={pf.acceptanceClause}
          onChange={(v) => dispatch({ type: 'proForma/update', patch: { acceptanceClause: v } })}
          placeholder="Pour acceptation, signer précédé de « Bon pour accord »"
        />
      </FieldRow>
    </>
  );
}

function AcompteFields({ data, theme, dispatch }: { data: InvoiceData; theme: InvoiceTheme; dispatch: Dispatch }) {
  const a = data.typeSpecific.acompte ?? { commandeRef: '', commandeDate: '', totalContractHT: 0, depositPercent: 0 };
  return (
    <>
      <FieldRow label="N° commande / devis" theme={theme}>
        <InlineText
          value={a.commandeRef}
          onChange={(v) => dispatch({ type: 'acompte/update', patch: { commandeRef: v } })}
          placeholder="DEV-2026-001"
        />
      </FieldRow>
      <FieldRow label="Date commande" theme={theme}>
        <input
          type="date" value={a.commandeDate}
          onChange={(e) => dispatch({ type: 'acompte/update', patch: { commandeDate: e.target.value } })}
          className="bg-transparent focus:outline-none focus:bg-indigo-50/40 rounded text-[10pt]"
        />
      </FieldRow>
      <FieldRow label="Montant total HT" theme={theme}>
        <InlineNumber
          value={a.totalContractHT} min={0} step={0.01}
          onChange={(v) => dispatch({ type: 'acompte/update', patch: { totalContractHT: v } })}
        />
      </FieldRow>
      <FieldRow label="Acompte (%)" theme={theme}>
        <InlineNumber
          value={a.depositPercent} min={0} step={1}
          onChange={(v) => dispatch({ type: 'acompte/update', patch: { depositPercent: v } })}
        />
      </FieldRow>
    </>
  );
}

function SoldeFields({ data, theme, dispatch }: { data: InvoiceData; theme: InvoiceTheme; dispatch: Dispatch }) {
  const s = data.typeSpecific.solde ?? { commandeRef: '', commandeDate: '', totalContractHT: 0, acomptes: [] };
  return (
    <>
      <FieldRow label="N° commande" theme={theme}>
        <InlineText
          value={s.commandeRef}
          onChange={(v) => dispatch({ type: 'solde/update', patch: { commandeRef: v } })}
          placeholder="DEV-2026-001"
        />
      </FieldRow>
      <FieldRow label="Date commande" theme={theme}>
        <input
          type="date" value={s.commandeDate}
          onChange={(e) => dispatch({ type: 'solde/update', patch: { commandeDate: e.target.value } })}
          className="bg-transparent focus:outline-none focus:bg-indigo-50/40 rounded text-[10pt]"
        />
      </FieldRow>
      <FieldRow label="Montant total HT" theme={theme}>
        <InlineNumber
          value={s.totalContractHT} min={0} step={0.01}
          onChange={(v) => dispatch({ type: 'solde/update', patch: { totalContractHT: v } })}
        />
      </FieldRow>

      <div style={{ marginTop: 8, fontSize: '8pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: theme.colors.muted }}>
        Acomptes déjà facturés
      </div>
      <table style={{ width: '100%', marginTop: 4, borderCollapse: 'collapse', fontSize: '9pt' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '4px 6px', borderBottom: '1px solid #e2e8f0', color: theme.colors.muted, fontWeight: 600 }}>N° acompte</th>
            <th style={{ textAlign: 'left', padding: '4px 6px', borderBottom: '1px solid #e2e8f0', color: theme.colors.muted, fontWeight: 600 }}>Date</th>
            <th style={{ textAlign: 'right', padding: '4px 6px', borderBottom: '1px solid #e2e8f0', color: theme.colors.muted, fontWeight: 600 }}>HT</th>
            <th style={{ textAlign: 'right', padding: '4px 6px', borderBottom: '1px solid #e2e8f0', color: theme.colors.muted, fontWeight: 600 }}>TTC</th>
            <th style={{ width: 28, borderBottom: '1px solid #e2e8f0' }} />
          </tr>
        </thead>
        <tbody>
          {s.acomptes.map((acc, i) => (
            <tr key={i}>
              <td style={{ padding: '4px 6px', borderBottom: '1px solid #f1f5f9' }}>
                <InlineText value={acc.ref}
                  onChange={(v) => dispatch({ type: 'solde/updateAcompte', index: i, patch: { ref: v } })}
                  placeholder="FA-…" />
              </td>
              <td style={{ padding: '4px 6px', borderBottom: '1px solid #f1f5f9' }}>
                <input type="date" value={acc.date}
                  onChange={(e) => dispatch({ type: 'solde/updateAcompte', index: i, patch: { date: e.target.value } })}
                  className="bg-transparent focus:outline-none focus:bg-indigo-50/40 rounded text-[9pt]" />
              </td>
              <td style={{ padding: '4px 6px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>
                <InlineNumber value={acc.amountHT} min={0} step={0.01}
                  onChange={(v) => dispatch({ type: 'solde/updateAcompte', index: i, patch: { amountHT: v } })} />
              </td>
              <td style={{ padding: '4px 6px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>
                <InlineNumber value={acc.amountTTC} min={0} step={0.01}
                  onChange={(v) => dispatch({ type: 'solde/updateAcompte', index: i, patch: { amountTTC: v } })} />
              </td>
              <td style={{ padding: '2px 4px', borderBottom: '1px solid #f1f5f9', width: 28 }}>
                <button
                  onClick={(e) => { e.stopPropagation(); dispatch({ type: 'solde/removeAcompte', index: i }); }}
                  className="w-5 h-5 rounded hover:bg-red-50 flex items-center justify-center"
                  title="Supprimer cet acompte"
                >
                  <Trash2 size={10} className="text-red-500" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        onClick={(e) => { e.stopPropagation(); dispatch({ type: 'solde/addAcompte' }); }}
        className="mt-2 flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium rounded-md border border-dashed border-slate-300 text-slate-500 hover:border-indigo-300 hover:text-indigo-600"
      >
        <Plus size={10} /> Ajouter un acompte
      </button>
    </>
  );
}

function AvoirFields({ data, theme, dispatch }: { data: InvoiceData; theme: InvoiceTheme; dispatch: Dispatch }) {
  const av = data.typeSpecific.avoir ?? { originalInvoiceRef: '', originalInvoiceDate: '', reason: '', refundMethod: 'credit_note' as const };
  return (
    <>
      <FieldRow label="Facture rectifiée" theme={theme}>
        <InlineText
          value={av.originalInvoiceRef}
          onChange={(v) => dispatch({ type: 'avoir/update', patch: { originalInvoiceRef: v } })}
          placeholder="F2026-001"
        />
      </FieldRow>
      <FieldRow label="Date facture" theme={theme}>
        <input
          type="date" value={av.originalInvoiceDate}
          onChange={(e) => dispatch({ type: 'avoir/update', patch: { originalInvoiceDate: e.target.value } })}
          className="bg-transparent focus:outline-none focus:bg-indigo-50/40 rounded text-[10pt]"
        />
      </FieldRow>
      <FieldRow label="Motif" theme={theme}>
        <InlineText
          value={av.reason}
          onChange={(v) => dispatch({ type: 'avoir/update', patch: { reason: v } })}
          placeholder="Remise commerciale / Retour marchandise / Erreur de facturation"
        />
      </FieldRow>
      <FieldRow label="Modalité" theme={theme}>
        <select
          value={av.refundMethod}
          onChange={(e) => dispatch({ type: 'avoir/update', patch: { refundMethod: e.target.value as 'credit_note' | 'refund' } })}
          className="bg-transparent focus:outline-none focus:bg-indigo-50/40 rounded text-[10pt]"
        >
          <option value="credit_note">Avoir à valoir (déduction prochaine facture)</option>
          <option value="refund">Remboursement par virement</option>
        </select>
      </FieldRow>
    </>
  );
}

function RecurrenteFields({ data, theme, dispatch }: { data: InvoiceData; theme: InvoiceTheme; dispatch: Dispatch }) {
  const r = data.typeSpecific.recurrente ?? {
    periodFrom: '', periodTo: '', interval: 'monthly' as RecurrenceInterval,
    nextBillingDate: '', sepaMandateRum: '', contractRef: '',
  };
  return (
    <>
      <FieldRow label="N° contrat" theme={theme}>
        <InlineText
          value={r.contractRef}
          onChange={(v) => dispatch({ type: 'recurrente/update', patch: { contractRef: v } })}
          placeholder="ABO-2026-001"
        />
      </FieldRow>
      <FieldRow label="Période — début" theme={theme}>
        <input type="date" value={r.periodFrom}
          onChange={(e) => dispatch({ type: 'recurrente/update', patch: { periodFrom: e.target.value } })}
          className="bg-transparent focus:outline-none focus:bg-indigo-50/40 rounded text-[10pt]" />
      </FieldRow>
      <FieldRow label="Période — fin" theme={theme}>
        <input type="date" value={r.periodTo}
          onChange={(e) => dispatch({ type: 'recurrente/update', patch: { periodTo: e.target.value } })}
          className="bg-transparent focus:outline-none focus:bg-indigo-50/40 rounded text-[10pt]" />
      </FieldRow>
      <FieldRow label="Récurrence" theme={theme}>
        <select
          value={r.interval}
          onChange={(e) => dispatch({ type: 'recurrente/update', patch: { interval: e.target.value as RecurrenceInterval } })}
          className="bg-transparent focus:outline-none focus:bg-indigo-50/40 rounded text-[10pt]"
        >
          <option value="weekly">Hebdomadaire</option>
          <option value="monthly">Mensuelle</option>
          <option value="quarterly">Trimestrielle</option>
          <option value="yearly">Annuelle</option>
        </select>
      </FieldRow>
      <FieldRow label="Prochaine échéance" theme={theme}>
        <input type="date" value={r.nextBillingDate}
          onChange={(e) => dispatch({ type: 'recurrente/update', patch: { nextBillingDate: e.target.value } })}
          className="bg-transparent focus:outline-none focus:bg-indigo-50/40 rounded text-[10pt]" />
      </FieldRow>
      <FieldRow label="Mandat SEPA (RUM)" theme={theme}>
        <InlineText
          value={r.sepaMandateRum}
          onChange={(v) => dispatch({ type: 'recurrente/update', patch: { sepaMandateRum: v } })}
          placeholder="RUM-XXXXXXXX (Règlement UE 260/2012)"
        />
      </FieldRow>
    </>
  );
}

// ─── Lines ──────────────────────────────────────────────────────────────────

export function LinesBlock({ invoice, dispatch, selectedBlock, onSelectBlock }: BlockProps) {
  const { data, layout, theme } = invoice;
  const cols = layout.columns.filter((c) => c.visible);
  const d = designCss(theme);
  const headerCss = cssStringToObj(d.tableHeader);
  const cellCss = cssStringToObj(d.tableCell);
  const stripeCss = cssStringToObj(d.tableStripe);

  return (
    <BlockShell id="lines" selected={selectedBlock === 'lines'} onSelect={onSelectBlock}>
      <div style={{ marginTop: 14 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt' }}>
          <thead>
            <tr>
              {cols.map((c) => (
                <th
                  key={c.key}
                  style={{
                    ...headerCss,
                    padding: '8px 10px', textAlign: c.key === 'description' ? 'left' : 'right',
                    fontWeight: 600, fontSize: '10pt',
                  }}
                >
                  {COLUMN_LABELS[c.key]}
                </th>
              ))}
              <th style={{ width: 60, ...headerCss }} aria-hidden />
            </tr>
          </thead>
          <tbody>
            {data.lines.map((line, rowIdx) => (
              <tr key={line.id} className="group">
                {cols.map((c) => {
                  const numeric = c.key !== 'description';
                  const stripe = rowIdx % 2 === 1 ? stripeCss : {};
                  const td: React.CSSProperties = { padding: '8px 10px', ...cellCss, ...stripe, textAlign: numeric ? 'right' : 'left', verticalAlign: 'top' };
                  switch (c.key) {
                    case 'description':
                      return (
                        <td key={c.key} style={td}>
                          <InlineText
                            value={line.description}
                            onChange={(v) => dispatch({ type: 'lines/update', id: line.id, patch: { description: v } })}
                            placeholder="Description"
                          />
                        </td>
                      );
                    case 'qty':
                      return (
                        <td key={c.key} style={td}>
                          <InlineNumberOrToken value={line.quantity} min={0} step={1}
                            onChange={(v) => dispatch({ type: 'lines/update', id: line.id, patch: { quantity: v } })} />
                        </td>
                      );
                    case 'unitPrice':
                      return (
                        <td key={c.key} style={td}>
                          <InlineNumberOrToken value={line.unitPrice} min={0} step={0.01}
                            onChange={(v) => dispatch({ type: 'lines/update', id: line.id, patch: { unitPrice: v } })} />
                        </td>
                      );
                    case 'vat':
                      return (
                        <td key={c.key} style={td}>
                          <InlineNumberOrToken value={line.vatRate} min={0} step={0.1} suffix="%"
                            onChange={(v) => dispatch({ type: 'lines/update', id: line.id, patch: { vatRate: v } })} />
                        </td>
                      );
                    case 'discount':
                      return (
                        <td key={c.key} style={td}>
                          <InlineNumber
                            value={line.discount?.value ?? 0}
                            min={0} step={0.01}
                            onChange={(v) => dispatch({
                              type: 'lines/update', id: line.id,
                              patch: { discount: v > 0 ? { type: line.discount?.type ?? 'percent', value: v } : undefined },
                            })}
                          />
                        </td>
                      );
                    case 'total':
                      return (
                        <td key={c.key} style={{ ...td, fontWeight: 600 }}>
                          {formatMoney(lineSubtotalHT(line), data.currency)}
                        </td>
                      );
                  }
                })}
                <td style={{ padding: '4px 6px', ...cellCss, ...(rowIdx % 2 === 1 ? stripeCss : {}), width: 60 }}>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); dispatch({ type: 'lines/duplicate', id: line.id }); }}
                      className="w-6 h-6 rounded hover:bg-slate-100 flex items-center justify-center"
                      title="Dupliquer la ligne"
                    >
                      <Copy size={11} className="text-slate-500" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); dispatch({ type: 'lines/remove', id: line.id }); }}
                      disabled={data.lines.length <= 1}
                      className="w-6 h-6 rounded hover:bg-red-50 flex items-center justify-center disabled:opacity-30"
                      title="Supprimer la ligne"
                    >
                      <Trash2 size={11} className="text-red-500" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          onClick={(e) => { e.stopPropagation(); dispatch({ type: 'lines/add' }); }}
          className="mt-2 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-dashed border-slate-300 text-slate-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
        >
          <Plus size={12} /> Ajouter une ligne
        </button>
      </div>
    </BlockShell>
  );
}

// ─── Totals (read-only, derived) ────────────────────────────────────────────

export function TotalsBlock({ invoice, selectedBlock, onSelectBlock }: BlockProps) {
  const { data, theme } = invoice;
  const totals = computeTotals(data);
  const isAvoir = data.type === 'avoir';
  const sign = isAvoir ? -1 : 1;
  const fmt = (n: number) => formatMoney(sign * n, data.currency);

  // Solde — soustraction des acomptes déjà facturés (TTC).
  const soldeAcomptes = (data.type === 'solde' ? data.typeSpecific.solde?.acomptes : null) ?? [];
  const acomptesTotalTTC = soldeAcomptes.reduce((s, a) => s + a.amountTTC, 0);
  const netDue = data.type === 'solde'
    ? totals.totalTTC - acomptesTotalTTC
    : totals.totalTTC * sign;

  const grandLabel =
    data.type === 'pro-forma' ? 'Estimation TTC'
    : data.type === 'acompte' ? 'Acompte à régler TTC'
    : data.type === 'solde'   ? 'Solde à régler TTC'
    : isAvoir                 ? 'Total à déduire TTC'
                              : 'Total à régler TTC';

  return (
    <BlockShell id="totals" selected={selectedBlock === 'totals'} onSelect={onSelectBlock}>
      <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ width: 280 }}>
          <Row label="Sous-total HT" value={fmt(totals.subtotalHT)} muted color={theme.colors.muted} />
          {totals.totalDiscount > 0 && (
            <Row label="Remises" value={`-${formatMoney(totals.totalDiscount, data.currency)}`} muted color={theme.colors.muted} />
          )}
          {totals.vatBreakdown.map((v) => (
            <Row key={v.rate} label={`TVA ${v.rate}%`} value={fmt(v.amount)} muted color={theme.colors.muted} />
          ))}
          <Row label="Total TTC" value={fmt(totals.totalTTC)} muted color={theme.colors.muted} />
          {soldeAcomptes.map((a, i) => (
            <Row key={i} label={`Acompte ${a.ref || '—'}`} value={`-${formatMoney(a.amountTTC, data.currency)}`} muted color={theme.colors.muted} />
          ))}
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            background: theme.colors.primary, color: '#fff',
            padding: '10px 14px', borderRadius: designCss(theme).radiusPx, marginTop: 8,
            fontWeight: 700, fontSize: '11pt',
          }}>
            <span>{grandLabel}</span>
            <span>{formatMoney(netDue, data.currency)}</span>
          </div>
          <div className="text-[9px] text-slate-400 italic mt-1.5 text-right">
            Totaux calculés automatiquement
          </div>
        </div>
      </div>
    </BlockShell>
  );
}

function Row({ label, value, muted, color }: { label: string; value: string; muted?: boolean; color: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '10pt', color: muted ? color : undefined }}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

// ─── Payment ────────────────────────────────────────────────────────────────

export function PaymentBlock({ invoice, dispatch, selectedBlock, onSelectBlock }: BlockProps) {
  const { data, theme } = invoice;
  const lbl = { fontSize: '8pt', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.5px', color: theme.colors.muted, marginRight: 6, display: 'inline-block', minWidth: 78 };
  const d = designCss(theme);
  const boxStyle: React.CSSProperties = { ...cssStringToObj(d.blockBox), borderRadius: d.radiusPx, padding: '12px 14px', fontSize: '10pt', marginTop: 14 };
  return (
    <BlockShell id="payment" selected={selectedBlock === 'payment'} onSelect={onSelectBlock}>
      <div style={boxStyle}>
        <div style={lbl}>Informations de paiement</div>
        <div style={{ marginTop: 4 }}>
          <div><span style={lbl}>Conditions</span>
            <InlineText value={data.payment.paymentTerms} onChange={(v) => dispatch({ type: 'payment/update', patch: { paymentTerms: v } })} placeholder="30 jours" />
          </div>
          <div><span style={lbl}>IBAN</span>
            <InlineText value={data.payment.iban} onChange={(v) => dispatch({ type: 'payment/update', patch: { iban: v } })} placeholder="FR76 ..." />
          </div>
          <div><span style={lbl}>BIC</span>
            <InlineText value={data.payment.bic} onChange={(v) => dispatch({ type: 'payment/update', patch: { bic: v } })} placeholder="XXXXFRPP" />
          </div>
          <div><span style={lbl}>Banque</span>
            <InlineText value={data.payment.bankName} onChange={(v) => dispatch({ type: 'payment/update', patch: { bankName: v } })} placeholder="Nom de la banque" />
          </div>
        </div>
      </div>
    </BlockShell>
  );
}

// ─── Footer / legal mentions ────────────────────────────────────────────────

export function FooterBlock({ invoice, dispatch, selectedBlock, onSelectBlock }: BlockProps) {
  const { data, theme } = invoice;
  // We render legal mentions through the shared builder so the live preview
  // and the rendered PDF stay in sync.
  // Notes are edited inline above and already included by buildFooterMentions;
  // strip them from the auto-list to avoid duplicating the textarea text below.
  const auto = buildFooterMentions(data).filter((m) => m !== data.notes.trim());
  return (
    <BlockShell id="footer" selected={selectedBlock === 'footer'} onSelect={onSelectBlock}>
      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 12, marginTop: 14, fontSize: '8pt', color: theme.colors.muted, lineHeight: 1.5 }}>
        <InlineText
          value={data.notes}
          onChange={(v) => dispatch({ type: 'data/setNotes', value: v })}
          placeholder="Notes / Conditions particulières (optionnel)"
          multiline
          style={{ minHeight: 16, marginBottom: auto.length ? 6 : 0 }}
        />
        {auto.map((m, i) => <div key={i}>{m}</div>)}
      </div>
    </BlockShell>
  );
}

// ─── Block registry ─────────────────────────────────────────────────────────

/**
 * Tiny CSS-string → React.CSSProperties parser.
 *
 * Why this exists: the renderer (renderer.ts) outputs CSS strings because
 * it produces HTML for the PDF service. The live editor needs the same
 * styling rules but in React inline-style form. Rather than maintain two
 * parallel encodings, the renderer exports its design-knob output as CSS
 * strings and we re-parse them here. Strings are produced by us, so we can
 * use a small regex parser without worrying about edge cases.
 */
function cssStringToObj(css: string): React.CSSProperties {
  const result: Record<string, string> = {};
  for (const decl of css.split(';')) {
    const idx = decl.indexOf(':');
    if (idx < 0) continue;
    const prop = decl.slice(0, idx).trim();
    const val = decl.slice(idx + 1).trim();
    if (!prop || !val) continue;
    const camel = prop.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    result[camel] = val;
  }
  return result as React.CSSProperties;
}

export const BLOCK_COMPONENTS = {
  header:       HeaderBlock,
  parties:      PartiesBlock,
  meta:         MetaBlock,
  typeSpecific: TypeSpecificBlock,
  lines:        LinesBlock,
  totals:       TotalsBlock,
  payment:      PaymentBlock,
  footer:       FooterBlock,
} as const;

export const BLOCK_LABELS: Record<keyof typeof BLOCK_COMPONENTS, string> = {
  header:       'En-tête',
  parties:      'Émetteur & Client',
  meta:         'Détails (n°, dates)',
  typeSpecific: 'Spécifique au type',
  lines:        'Lignes',
  totals:       'Totaux',
  payment:      'Paiement',
  footer:       'Mentions légales',
};
