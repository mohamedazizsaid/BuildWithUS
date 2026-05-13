'use client';

import { FileText } from 'lucide-react';
import { CONTRACT_TYPES, type ContractType } from '../_lib/types';

export function SwitchTypeModal({
  fromType, toType, onConfirm, onClose,
}: {
  readonly fromType: ContractType;
  readonly toType: ContractType;
  readonly onConfirm: () => void;
  readonly onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-1">Changer de type de contrat ?</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Le contenu actuel sera remplacé par le modèle{' '}
            <span className="font-semibold text-slate-700">{CONTRACT_TYPES[toType].label}</span>.
            Cette action est irréversible.
          </p>

          <div className="mt-4 flex items-center gap-2">
            <span className={`px-2 py-1 rounded-md text-[10px] font-medium border ${CONTRACT_TYPES[fromType].color}`}>
              {CONTRACT_TYPES[fromType].label}
            </span>
            <ArrowRightIcon />
            <span className={`px-2 py-1 rounded-md text-[10px] font-medium border ${CONTRACT_TYPES[toType].color}`}>
              {CONTRACT_TYPES[toType].label}
            </span>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors"
          >
            <FileText size={13} /> Charger le modèle
          </button>
        </div>
      </div>
    </div>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400">
      <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
    </svg>
  );
}
