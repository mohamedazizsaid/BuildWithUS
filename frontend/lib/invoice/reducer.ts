import { v4 as uuid } from 'uuid';
import type {
  Invoice, InvoiceData, InvoiceLine, InvoiceLayout, InvoiceTheme,
  BlockId, ColumnConfig, ColumnKey, Party,
} from './types';
import { ESSENTIAL_BLOCKS, ESSENTIAL_COLUMNS } from './types';

export type InvoiceAction =
  // Data — top-level fields
  | { type: 'data/setType';     value: InvoiceData['type'] }
  | { type: 'data/setNumber';   value: string }
  | { type: 'data/setDate';     field: 'issueDate' | 'dueDate'; value: string }
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
  // Layout
  | { type: 'layout/reorder';   order: BlockId[] }
  | { type: 'layout/toggleBlock'; id: BlockId }
  | { type: 'layout/toggleColumn'; key: ColumnKey }
  | { type: 'layout/reorderColumns'; columns: ColumnConfig[] }
  // Theme
  | { type: 'theme/update';     patch: Partial<InvoiceTheme> }
  | { type: 'theme/updateColors'; patch: Partial<InvoiceTheme['colors']> }
  | { type: 'theme/updateLogo';   patch: Partial<InvoiceTheme['logo']> }
  // Full replace (after loading from DB)
  | { type: 'invoice/replace';  invoice: Invoice };

export function invoiceReducer(state: Invoice, action: InvoiceAction): Invoice {
  switch (action.type) {
    case 'data/setType':
      return setData(state, { type: action.value });
    case 'data/setNumber':
      return setData(state, { number: action.value });
    case 'data/setDate':
      return setData(state, { [action.field]: action.value } as Partial<InvoiceData>);
    case 'data/setCurrency':
      return setData(state, { currency: action.value });
    case 'data/setNotes':
      return setData(state, { notes: action.value });

    case 'data/updateParty': {
      const next = { ...state.data[action.party], ...action.patch } as Party;
      return setData(state, { [action.party]: next } as Partial<InvoiceData>);
    }

    case 'lines/add': {
      const newLine: InvoiceLine = {
        id: uuid(), description: '', quantity: 1, unitPrice: 0,
        vatRate: state.data.lines[0]?.vatRate ?? 20,
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

    case 'invoice/replace':
      return action.invoice;
  }
}

function setData(state: Invoice, patch: Partial<InvoiceData>): Invoice {
  return { ...state, data: { ...state.data, ...patch } };
}
