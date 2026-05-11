'use client';

import { Trash2, Copy, Plus } from 'lucide-react';
import type { Invoice, InvoiceData, InvoiceTheme, InvoiceLayout, Party, ColumnKey } from '@/lib/invoice/types';
import type { InvoiceAction } from '@/lib/invoice/reducer';
import { computeTotals, formatMoney, isVatExempt, lineSubtotalHT } from '@/lib/invoice/compute';
import { InlineText, InlineNumber } from './inline';

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
      <InlineText value={party.address}  onChange={(v) => onChange({ address: v })}  placeholder="Adresse"      style={muted} />
      <div style={{ display: 'flex', gap: 6 }}>
        <InlineText value={party.zipCode}  onChange={(v) => onChange({ zipCode: v })}  placeholder="CP"      style={{ ...muted, minWidth: 40 }} />
        <InlineText value={party.city}     onChange={(v) => onChange({ city: v })}     placeholder="Ville"   style={muted} />
      </div>
      <InlineText value={party.country}    onChange={(v) => onChange({ country: v })}    placeholder="Pays"    style={muted} />
      <InlineText value={party.email}      onChange={(v) => onChange({ email: v })}      placeholder="Email"   style={muted} />
      <InlineText value={party.phone}      onChange={(v) => onChange({ phone: v })}      placeholder="Téléphone" style={muted} />
      <InlineText value={party.siret}      onChange={(v) => onChange({ siret: v })}      placeholder="SIRET"   style={muted} />
      <InlineText value={party.vatNumber}  onChange={(v) => onChange({ vatNumber: v })}  placeholder="N° TVA"  style={muted} />
    </div>
  );
}

// ─── Meta ───────────────────────────────────────────────────────────────────

export function MetaBlock({ invoice, dispatch, selectedBlock, onSelectBlock }: BlockProps) {
  const { data, theme } = invoice;
  const lbl = { fontSize: '8pt', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.5px', color: theme.colors.muted, marginRight: 6 };
  return (
    <BlockShell id="meta" selected={selectedBlock === 'meta'} onSelect={onSelectBlock}>
      <div style={{ display: 'flex', gap: 24, fontSize: '10pt', marginTop: 10 }}>
        <div>
          <span style={lbl}>Date</span>
          <input
            type="date"
            value={data.issueDate}
            onChange={(e) => dispatch({ type: 'data/setDate', field: 'issueDate', value: e.target.value })}
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
      </div>
    </BlockShell>
  );
}

// ─── Lines ──────────────────────────────────────────────────────────────────

export function LinesBlock({ invoice, dispatch, selectedBlock, onSelectBlock }: BlockProps) {
  const { data, layout, theme } = invoice;
  const cols = layout.columns.filter((c) => c.visible);

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
                    background: theme.colors.primary, color: '#fff',
                    padding: '8px 10px', textAlign: c.key === 'description' ? 'left' : 'right',
                    fontWeight: 600, fontSize: '10pt',
                  }}
                >
                  {COLUMN_LABELS[c.key]}
                </th>
              ))}
              <th style={{ width: 60, background: theme.colors.primary }} aria-hidden />
            </tr>
          </thead>
          <tbody>
            {data.lines.map((line) => (
              <tr key={line.id} className="group">
                {cols.map((c) => {
                  const numeric = c.key !== 'description';
                  const td: React.CSSProperties = { padding: '8px 10px', borderBottom: '1px solid #e2e8f0', textAlign: numeric ? 'right' : 'left', verticalAlign: 'top' };
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
                          <InlineNumber value={line.quantity} min={0} step={1}
                            onChange={(v) => dispatch({ type: 'lines/update', id: line.id, patch: { quantity: v } })} />
                        </td>
                      );
                    case 'unitPrice':
                      return (
                        <td key={c.key} style={td}>
                          <InlineNumber value={line.unitPrice} min={0} step={0.01}
                            onChange={(v) => dispatch({ type: 'lines/update', id: line.id, patch: { unitPrice: v } })} />
                        </td>
                      );
                    case 'vat':
                      return (
                        <td key={c.key} style={td}>
                          <select
                            value={line.vatRate}
                            onChange={(e) => dispatch({ type: 'lines/update', id: line.id, patch: { vatRate: parseFloat(e.target.value) } })}
                            className="bg-transparent focus:outline-none focus:bg-indigo-50/40 rounded text-right"
                          >
                            {[0, 2.1, 5.5, 10, 20].map((r) => <option key={r} value={r}>{r}%</option>)}
                          </select>
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
                <td style={{ padding: '4px 6px', borderBottom: '1px solid #e2e8f0', width: 60 }}>
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
  return (
    <BlockShell id="totals" selected={selectedBlock === 'totals'} onSelect={onSelectBlock}>
      <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ width: 280 }}>
          <Row label="Sous-total HT" value={formatMoney(totals.subtotalHT, data.currency)} muted color={theme.colors.muted} />
          {totals.totalDiscount > 0 && (
            <Row label="Remises" value={`-${formatMoney(totals.totalDiscount, data.currency)}`} muted color={theme.colors.muted} />
          )}
          {totals.vatBreakdown.map((v) => (
            <Row key={v.rate} label={`TVA ${v.rate}%`} value={formatMoney(v.amount, data.currency)} muted color={theme.colors.muted} />
          ))}
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            background: theme.colors.primary, color: '#fff',
            padding: '10px 14px', borderRadius: 6, marginTop: 8,
            fontWeight: 700, fontSize: '11pt',
          }}>
            <span>Total TTC</span>
            <span>{formatMoney(totals.totalTTC, data.currency)}</span>
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
  return (
    <BlockShell id="payment" selected={selectedBlock === 'payment'} onSelect={onSelectBlock}>
      <div style={{ background: '#f8fafc', borderRadius: 8, padding: '12px 14px', fontSize: '10pt', marginTop: 14 }}>
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
  const mentions: string[] = [];
  if (isVatExempt(data))             mentions.push('TVA non applicable, art. 293 B du CGI.');
  if (data.legal.showNoDiscount)     mentions.push('Pas d\'escompte pour règlement anticipé.');
  if (data.legal.showLatePenalty)    mentions.push(`En cas de retard de paiement, pénalités au taux de ${data.payment.latePenaltyRate}% l'an.`);
  if (data.legal.showRecoveryFee)    mentions.push(`Indemnité forfaitaire pour frais de recouvrement : ${formatMoney(data.payment.recoveryFee, data.currency)}.`);
  return (
    <BlockShell id="footer" selected={selectedBlock === 'footer'} onSelect={onSelectBlock}>
      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 12, marginTop: 14, fontSize: '8pt', color: theme.colors.muted, lineHeight: 1.5 }}>
        <InlineText
          value={data.notes}
          onChange={(v) => dispatch({ type: 'data/setNotes', value: v })}
          placeholder="Notes / Conditions particulières (optionnel)"
          multiline
          style={{ minHeight: 16, marginBottom: mentions.length ? 6 : 0 }}
        />
        {mentions.map((m, i) => <div key={i}>{m}</div>)}
        {data.legal.customText && (
          <div style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>{data.legal.customText}</div>
        )}
      </div>
    </BlockShell>
  );
}

// ─── Block registry ─────────────────────────────────────────────────────────

export const BLOCK_COMPONENTS = {
  header:  HeaderBlock,
  parties: PartiesBlock,
  meta:    MetaBlock,
  lines:   LinesBlock,
  totals:  TotalsBlock,
  payment: PaymentBlock,
  footer:  FooterBlock,
} as const;

export const BLOCK_LABELS: Record<keyof typeof BLOCK_COMPONENTS, string> = {
  header:  'En-tête',
  parties: 'Émetteur & Client',
  meta:    'Détails (n°, dates)',
  lines:   'Lignes',
  totals:  'Totaux',
  payment: 'Paiement',
  footer:  'Mentions légales',
};
