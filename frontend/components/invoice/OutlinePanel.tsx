'use client';

import { useState } from 'react';
import { Eye, EyeOff, GripVertical, Lock } from 'lucide-react';
import type { Invoice, BlockId } from '@/lib/invoice/types';
import { ESSENTIAL_BLOCKS } from '@/lib/invoice/types';
import { BLOCK_LABELS } from './blocks';
import type { Dispatch } from './blocks';

interface Props {
  invoice: Invoice;
  selectedBlock: string | null;
  onSelectBlock: (id: string) => void;
  dispatch: Dispatch;
}

export function OutlinePanel({ invoice, selectedBlock, onSelectBlock, dispatch }: Props) {
  const [dragId, setDragId] = useState<BlockId | null>(null);
  const [overId, setOverId] = useState<BlockId | null>(null);

  const handleDrop = (target: BlockId) => {
    if (!dragId || dragId === target) {
      setDragId(null); setOverId(null);
      return;
    }
    const order = [...invoice.layout.blockOrder];
    const from = order.indexOf(dragId);
    const to   = order.indexOf(target);
    if (from === -1 || to === -1) return;
    order.splice(from, 1);
    order.splice(to, 0, dragId);
    dispatch({ type: 'layout/reorder', order });
    setDragId(null); setOverId(null);
  };

  return (
    <div className="w-60 border-r border-border bg-slate-50/50 flex flex-col overflow-hidden shrink-0">
      <div className="px-3 py-2.5 border-b border-border bg-white">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Structure</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {invoice.layout.blockOrder.map((id) => {
          const visible = invoice.layout.blockVisibility[id];
          const essential = ESSENTIAL_BLOCKS.includes(id);
          const selected = selectedBlock === id;
          const isOver = overId === id && dragId !== id;

          return (
            <div
              key={id}
              draggable
              onDragStart={() => setDragId(id)}
              onDragOver={(e) => { e.preventDefault(); setOverId(id); }}
              onDragLeave={() => setOverId(null)}
              onDrop={() => handleDrop(id)}
              onClick={() => onSelectBlock(id)}
              className={`group flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer text-[12px] transition-all ${
                selected ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-white text-slate-600'
              } ${!visible ? 'opacity-50' : ''} ${isOver ? 'border-t-2 border-indigo-400' : ''}`}
            >
              <GripVertical size={11} className="text-slate-300 cursor-grab" />
              <span className="flex-1 truncate font-medium">{BLOCK_LABELS[id]}</span>
              <button
                onClick={(e) => { e.stopPropagation(); dispatch({ type: 'layout/toggleBlock', id }); }}
                disabled={essential}
                className="w-5 h-5 rounded flex items-center justify-center hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                title={essential ? 'Bloc obligatoire' : visible ? 'Masquer' : 'Afficher'}
              >
                {essential ? <Lock size={11} className="text-slate-400" />
                : visible    ? <Eye size={11} className="text-slate-500" />
                             : <EyeOff size={11} className="text-slate-400" />}
              </button>
            </div>
          );
        })}
      </div>
      <div className="px-3 py-2 border-t border-border text-[10px] text-slate-400 leading-relaxed bg-white">
        Glissez pour réordonner. Les blocs <span className="font-semibold">Lignes</span> et <span className="font-semibold">Totaux</span> sont obligatoires.
      </div>
    </div>
  );
}
