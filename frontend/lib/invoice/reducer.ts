import { v4 as uuid } from 'uuid';
import type {
  Invoice, InvoiceData, InvoiceLine, InvoiceLayout, InvoiceTheme,
  BlockId, ColumnConfig, ColumnKey, Party,
  ProFormaInfo, AcompteInfo, SoldeInfo, AvoirInfo, RecurrenteInfo,
  AcompteReference, InvoiceStamp,
} from './types';
import { ESSENTIAL_BLOCKS, ESSENTIAL_COLUMNS } from './types';
import {
  defaultTypeSpecific, defaultLegalForType,
  defaultClientForRelation,
  TYPE_NUMBER_PREFIX, nextInvoiceNumberFor,
} from './defaults';
import type { ClientRelation } from './types';

export type InvoiceAction =
  // Data — top-level fields
  | { type: 'data/setType';     value: InvoiceData['type'] }
  | { type: 'data/setClientRelation'; value: ClientRelation }
  | { type: 'data/setTitle';    value: string }
  | { type: 'data/setNumber';   value: string }
  | { type: 'data/setDate';     field: 'issueDate' | 'dueDate'; value: string }
  | { type: 'data/setDeliveryDate'; value: string }
  | { type: 'data/setPurchaseOrderRef'; value: string }
  | { type: 'data/setOperationNature'; value: InvoiceData['operationNature'] }
  | { type: 'data/setCurrency'; value: InvoiceData['currency'] }
  | { type: 'data/setNotes';    value: string }
  // Data — party
  | { type: 'data/updateParty'; party: 'seller' | 'client'; patch: Partial<Party> }
  // Data — lines
  | { type: 'lines/add' }
  | { type: 'lines/remove';     id: string }
  | { type: 'lines/update';     id: string; patch: Partial<InvoiceLine> }
  | { type: 'lines/duplicate';  id: string }
  // Data — payment & legal
  | { type: 'payment/update';   patch: Partial<InvoiceData['payment']> }
  | { type: 'legal/update';     patch: Partial<InvoiceData['legal']> }
  // Data — type-specific (FR/EU regulatory payloads)
  | { type: 'proForma/update';  patch: Partial<ProFormaInfo> }
  | { type: 'acompte/update';   patch: Partial<AcompteInfo> }
  | { type: 'solde/update';     patch: Partial<SoldeInfo> }
  | { type: 'solde/addAcompte' }
  | { type: 'solde/removeAcompte'; index: number }
  | { type: 'solde/updateAcompte'; index: number; patch: Partial<AcompteReference> }
  | { type: 'avoir/update';     patch: Partial<AvoirInfo> }
  | { type: 'recurrente/update'; patch: Partial<RecurrenteInfo> }
  // Layout
  | { type: 'layout/reorder';   order: BlockId[] }
  | { type: 'layout/toggleBlock'; id: BlockId }
  | { type: 'layout/toggleColumn'; key: ColumnKey }
  | { type: 'layout/reorderColumns'; columns: ColumnConfig[] }
  // Theme
  | { type: 'theme/update';     patch: Partial<InvoiceTheme> }
  | { type: 'theme/updateColors'; patch: Partial<InvoiceTheme['colors']> }
  | { type: 'theme/updateLogo';   patch: Partial<InvoiceTheme['logo']> }
  | { type: 'theme/updateDesign'; patch: Partial<InvoiceTheme['design']> }
  // Stamp (cachet) — free-positioned overlay
  | { type: 'stamp/setImage';   url: string }
  | { type: 'stamp/place';      x: number; y: number }
  | { type: 'stamp/update';     patch: Partial<InvoiceStamp> }
  | { type: 'stamp/remove' }
  // Full replace (after loading from DB)
  | { type: 'invoice/replace';  invoice: Invoice };

/** Predicate: is `n` a default-generated number for type `t`? Used to decide
 * whether we can safely swap the prefix when the user changes the invoice type. */
function isDefaultNumberForType(n: string, t: InvoiceData['type']): boolean {
  const prefix = TYPE_NUMBER_PREFIX[t];
  return new RegExp(`^${prefix}\\d{4}-\\d{3}$`).test(n);
}

export function invoiceReducer(state: Invoice, action: InvoiceAction): Invoice {
  switch (action.type) {
    case 'data/setType': {
      const oldType = state.data.type;
      const newType = action.value;
      if (oldType === newType) return state;

      // Smart number-prefix swap — only if the user hasn't overridden the default.
      const number = isDefaultNumberForType(state.data.number, oldType)
        ? nextInvoiceNumberFor(newType)
        : state.data.number;

      // Preserve user-edited typeSpecific payloads when re-selecting an earlier type.
      const typeSpecific = { ...state.data.typeSpecific, ...defaultTypeSpecific(newType) };
      if (state.data.typeSpecific.proForma   && newType === 'pro-forma')  typeSpecific.proForma   = state.data.typeSpecific.proForma;
      if (state.data.typeSpecific.acompte    && newType === 'acompte')    typeSpecific.acompte    = state.data.typeSpecific.acompte;
      if (state.data.typeSpecific.solde      && newType === 'solde')      typeSpecific.solde      = state.data.typeSpecific.solde;
      if (state.data.typeSpecific.avoir      && newType === 'avoir')      typeSpecific.avoir      = state.data.typeSpecific.avoir;
      if (state.data.typeSpecific.recurrente && newType === 'recurrente') typeSpecific.recurrente = state.data.typeSpecific.recurrente;

      // Apply legal-mention defaults appropriate to the type (pro-forma/avoir → no late penalty etc.).
      const legal = defaultLegalForType(newType);

      // Show the typeSpecific block automatically for non-standard types.
      const blockVisibility = {
        ...state.layout.blockVisibility,
        typeSpecific: newType !== 'standard',
      };

      return {
        ...state,
        data: { ...state.data, type: newType, number, typeSpecific, legal },
        layout: { ...state.layout, blockVisibility },
      };
    }
    case 'data/setClientRelation': {
      if (state.data.clientRelation === action.value) return state;
      // Swap every client field that's still in its default (token or empty)
      // state — leave anything the user has typed by hand untouched.
      const fresh = defaultClientForRelation(action.value);
      const merged: Party = { ...state.data.client };
      for (const key of Object.keys(fresh) as (keyof Party)[]) {
        const cur = state.data.client[key];
        if (typeof cur !== 'string') continue;
        // Token-only or empty → swap to the new relation's default.
        if (cur.trim() === '' || /^\s*\{\{[a-zA-Z0-9_. ]+\}\}\s*$/.test(cur) ||
            /^(\s*\{\{[a-zA-Z0-9_. ]+\}\}\s*)+$/.test(cur)) {
          (merged as unknown as Record<string, unknown>)[key] =
            (fresh as unknown as Record<string, unknown>)[key];
        }
      }
      return setData(state, { clientRelation: action.value, client: merged });
    }
    case 'data/setTitle':
      // Empty string clears the override so the renderer falls back to the
      // type-based default. Trimming avoids "blank but truthy" titles.
      return setData(state, { titleOverride: action.value.trim() || undefined });
    case 'data/setNumber':
      return setData(state, { number: action.value });
    case 'data/setDate':
      return setData(state, { [action.field]: action.value } as Partial<InvoiceData>);
    case 'data/setDeliveryDate':
      return setData(state, { deliveryDate: action.value || undefined });
    case 'data/setPurchaseOrderRef':
      return setData(state, { purchaseOrderRef: action.value || undefined });
    case 'data/setOperationNature':
      return setData(state, { operationNature: action.value });
    case 'data/setCurrency':
      return setData(state, { currency: action.value });
    case 'data/setNotes':
      return setData(state, { notes: action.value });

    case 'data/updateParty': {
      const next = { ...state.data[action.party], ...action.patch } as Party;
      return setData(state, { [action.party]: next } as Partial<InvoiceData>);
    }

    case 'lines/add': {
      const nextIndex = state.data.lines.length + 1;
      const newLine: InvoiceLine = {
        id: uuid(),
        description: `{{ligne_description_${nextIndex}}}`,
        quantity:    `{{ligne_qte_${nextIndex}}}`,
        unitPrice:   `{{ligne_prix_${nextIndex}}}`,
        vatRate:     `{{ligne_tva_${nextIndex}}}`,
      };
      return setData(state, { lines: [...state.data.lines, newLine] });
    }
    case 'lines/remove': {
      if (state.data.lines.length <= 1) return state;       // keep at least one
      return setData(state, { lines: state.data.lines.filter((l) => l.id !== action.id) });
    }
    case 'lines/update': {
      const lines = state.data.lines.map((l) => l.id === action.id ? { ...l, ...action.patch } : l);
      return setData(state, { lines });
    }
    case 'lines/duplicate': {
      const idx = state.data.lines.findIndex((l) => l.id === action.id);
      if (idx === -1) return state;
      const copy = { ...state.data.lines[idx], id: uuid() };
      const next = [...state.data.lines];
      next.splice(idx + 1, 0, copy);
      return setData(state, { lines: next });
    }

    case 'payment/update':
      return setData(state, { payment: { ...state.data.payment, ...action.patch } });
    case 'legal/update':
      return setData(state, { legal: { ...state.data.legal, ...action.patch } });

    case 'proForma/update': {
      const proForma = { ...(state.data.typeSpecific.proForma ?? {} as ProFormaInfo), ...action.patch };
      return setData(state, { typeSpecific: { ...state.data.typeSpecific, proForma } });
    }
    case 'acompte/update': {
      const acompte = { ...(state.data.typeSpecific.acompte ?? {} as AcompteInfo), ...action.patch };
      return setData(state, { typeSpecific: { ...state.data.typeSpecific, acompte } });
    }
    case 'solde/update': {
      const solde = { ...(state.data.typeSpecific.solde ?? { acomptes: [] } as unknown as SoldeInfo), ...action.patch };
      return setData(state, { typeSpecific: { ...state.data.typeSpecific, solde } });
    }
    case 'solde/addAcompte': {
      const current = state.data.typeSpecific.solde ?? { commandeRef: '', commandeDate: '', totalContractHT: 0, acomptes: [] };
      const nextIndex = current.acomptes.length + 1;
      const next: SoldeInfo = {
        ...current,
        acomptes: [...current.acomptes, { ref: `{{acompte_ref_${nextIndex}}}`, date: '', amountHT: 0, amountTTC: 0 }],
      };
      return setData(state, { typeSpecific: { ...state.data.typeSpecific, solde: next } });
    }
    case 'solde/removeAcompte': {
      const current = state.data.typeSpecific.solde;
      if (!current) return state;
      const acomptes = current.acomptes.filter((_, i) => i !== action.index);
      return setData(state, { typeSpecific: { ...state.data.typeSpecific, solde: { ...current, acomptes } } });
    }
    case 'solde/updateAcompte': {
      const current = state.data.typeSpecific.solde;
      if (!current) return state;
      const acomptes = current.acomptes.map((a, i) => i === action.index ? { ...a, ...action.patch } : a);
      return setData(state, { typeSpecific: { ...state.data.typeSpecific, solde: { ...current, acomptes } } });
    }
    case 'avoir/update': {
      const avoir = { ...(state.data.typeSpecific.avoir ?? {} as AvoirInfo), ...action.patch };
      return setData(state, { typeSpecific: { ...state.data.typeSpecific, avoir } });
    }
    case 'recurrente/update': {
      const recurrente = { ...(state.data.typeSpecific.recurrente ?? {} as RecurrenteInfo), ...action.patch };
      return setData(state, { typeSpecific: { ...state.data.typeSpecific, recurrente } });
    }

    case 'layout/reorder':
      return { ...state, layout: { ...state.layout, blockOrder: action.order } };
    case 'layout/toggleBlock': {
      if (ESSENTIAL_BLOCKS.includes(action.id)) return state;
      return {
        ...state,
        layout: {
          ...state.layout,
          blockVisibility: { ...state.layout.blockVisibility, [action.id]: !state.layout.blockVisibility[action.id] },
        },
      };
    }
    case 'layout/toggleColumn': {
      if (ESSENTIAL_COLUMNS.includes(action.key)) return state;
      const columns = state.layout.columns.map((c) =>
        c.key === action.key ? { ...c, visible: !c.visible } : c,
      );
      return { ...state, layout: { ...state.layout, columns } };
    }
    case 'layout/reorderColumns':
      return { ...state, layout: { ...state.layout, columns: action.columns } };

    case 'theme/update':
      return { ...state, theme: { ...state.theme, ...action.patch } };
    case 'theme/updateColors':
      return { ...state, theme: { ...state.theme, colors: { ...state.theme.colors, ...action.patch } } };
    case 'theme/updateLogo':
      return { ...state, theme: { ...state.theme, logo: { ...state.theme.logo, ...action.patch } } };
    case 'theme/updateDesign':
      return { ...state, theme: { ...state.theme, design: { ...state.theme.design, ...action.patch } } };

    case 'stamp/setImage': {
      // Uploading a new image keeps existing position/size if any, otherwise
      // seeds sensible defaults: bottom-right of A4 with no rotation. The
      // user can still drag from the panel to override the placement.
      const prev = state.data.stamp;
      const next: InvoiceStamp = prev
        ? { ...prev, url: action.url }
        : { url: action.url, x: 130, y: 230, width: 50, rotation: 0 };
      return setData(state, { stamp: next });
    }
    case 'stamp/place': {
      const prev = state.data.stamp;
      if (!prev) return state;
      return setData(state, { stamp: { ...prev, x: action.x, y: action.y } });
    }
    case 'stamp/update': {
      const prev = state.data.stamp;
      if (!prev) return state;
      return setData(state, { stamp: { ...prev, ...action.patch } });
    }
    case 'stamp/remove':
      return setData(state, { stamp: undefined });

    case 'invoice/replace':
      return action.invoice;
  }
}

function setData(state: Invoice, patch: Partial<InvoiceData>): Invoice {
  return { ...state, data: { ...state.data, ...patch } };
}
