'use client';

import { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { extractVariablesFromTiptap } from '@/lib/tiptap/variable-node';

export function ExtractedVars({ editor }: { readonly editor: Editor | null }) {
  const [vars, setVars] = useState<string[]>([]);

  useEffect(() => {
    if (!editor) return;
    const update = () => setVars(extractVariablesFromTiptap(editor.getJSON()));
    editor.on('update', update);
    update();
    return () => { editor.off('update', update); };
  }, [editor]);

  if (vars.length === 0) return (
    <div className="flex items-center justify-center h-20">
      <p className="text-[11px] text-slate-400 text-center">Insérez des variables<br />dans le document</p>
    </div>
  );

  return (
    <div className="p-3 flex flex-wrap gap-1.5">
      {vars.map((name) => (
        <span
          key={name}
          className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
          style={{ background: '#dbeafe', color: '#1d4ed8', border: '1px solid #bfdbfe' }}
        >
          {'{{' + name + '}}'}
        </span>
      ))}
    </div>
  );
}
