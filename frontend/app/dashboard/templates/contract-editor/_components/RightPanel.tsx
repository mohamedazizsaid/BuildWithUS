'use client';

import { CONTRACT_TYPES, type ContractType } from '../_lib/types';

export function RightPanel({
  contractType, onSwitchType,
}: {
  readonly contractType: ContractType;
  readonly onSwitchType: (t: ContractType) => void;
}) {
  return (
    <div className="w-56 border-l border-border bg-white flex flex-col overflow-hidden shrink-0">
      <div className="px-3 py-2.5 border-b border-border">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Document</p>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Type de contrat</p>
          <div className="space-y-1">
            {(Object.keys(CONTRACT_TYPES) as ContractType[]).map((t) => (
              <button
                key={t}
                onClick={() => onSwitchType(t)}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] transition-colors border ${
                  contractType === t
                    ? CONTRACT_TYPES[t].color + ' font-semibold'
                    : 'text-slate-500 border-transparent hover:bg-slate-50'
                }`}
              >
                {CONTRACT_TYPES[t].label}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 mt-2 italic">
            Changer de type remplace le contenu par le modèle correspondant.
          </p>
        </div>
      </div>
    </div>
  );
}
