'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { VARIABLE_PALETTE } from '@/lib/tiptap/contract-templates';
import { BLOCK_LIBRARY } from '../_lib/block-library';
import type { SlashMenuItem } from '../_lib/types';

export function SlashMenu({
  query,
  coords,
  allVars,
  varLabels,
  onSelect,
  onClose,
}: {
  query: string;
  coords: { top: number; bottom: number; left: number };
  allVars: Record<string, string[]>;
  varLabels: Record<string, string>;
  onSelect: (item: SlashMenuItem) => void;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(0);

  const items = useMemo<SlashMenuItem[]>(() => {
    const q = query.toLowerCase();
    const varItems: SlashMenuItem[] = Object.entries(allVars)
      .flatMap(([cat, names]) =>
        names
          .filter((n) => !q || n.includes(q) || (varLabels[n] ?? '').toLowerCase().includes(q) || cat.toLowerCase().includes(q))
          .slice(0, 4)
          .map((n) => ({
            type: 'variable' as const,
            key: `v:${n}`,
            name: n,
            label: varLabels[n] ?? n.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
            category: cat,
          }))
      )
      .slice(0, 8);

    const blockItems: SlashMenuItem[] = BLOCK_LIBRARY
      .filter((b) => !q || b.label.toLowerCase().includes(q) || b.type.toLowerCase().includes(q))
      .slice(0, 4)
      .map((b) => ({
        type: 'block' as const,
        key: `b:${b.label}`,
        label: b.label,
        description: b.description,
        color: b.color,
        build: b.build,
      }));

    return [...varItems, ...blockItems];
  }, [query, allVars, varLabels]);

  useEffect(() => setIdx(0), [items]);

  useEffect(() => {
    if (!menuRef.current) return;
    const active = menuRef.current.querySelector<HTMLElement>('[data-active="true"]');
    active?.scrollIntoView({ block: 'nearest' });
  }, [idx]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(i + 1, items.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
      else if (e.key === 'Enter') { e.preventDefault(); if (items[idx]) onSelect(items[idx]); }
      else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    };
    window.addEventListener('keydown', handler, { capture: true });
    return () => window.removeEventListener('keydown', handler, { capture: true });
  }, [items, idx, onSelect, onClose]);

  const menuRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!menuRef.current) return;
    const { offsetHeight, offsetWidth } = menuRef.current;
    const spaceBelow = window.innerHeight - coords.bottom - 8;
    const spaceAbove = coords.top - 8;
    const top = spaceBelow >= offsetHeight
      ? coords.bottom + 4
      : spaceAbove >= offsetHeight
        ? coords.top - offsetHeight - 4
        : spaceBelow >= spaceAbove
          ? coords.bottom + 4
          : coords.top - offsetHeight - 4;
    const left = Math.min(coords.left, window.innerWidth - offsetWidth - 8);
    setPlacement((prev) => {
      const next = { top: Math.max(8, top), left: Math.max(8, left) };
      if (prev && prev.top === next.top && prev.left === next.left) return prev;
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords.top, coords.bottom, coords.left, items]);

  if (items.length === 0) return null;

  const varSectionItems = items.filter((i) => i.type === 'variable');
  const blockSectionItems = items.filter((i) => i.type === 'block');

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: placement ? placement.top : coords.bottom + 4,
        left: placement ? placement.left : coords.left,
        zIndex: 9999,
        visibility: placement ? 'visible' : 'hidden',
      }}
      className="w-72 bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden"
    >
      <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center gap-1.5">
        <span className="text-[11px] font-semibold text-slate-500">Insérer…</span>
        <span className="text-[10px] text-slate-400 ml-auto">↑↓ Naviguer · ↵ Insérer · Esc Fermer</span>
      </div>
      <div className="max-h-72 overflow-y-auto">
        {varSectionItems.length > 0 && (
          <>
            <div className="px-3 py-1 bg-slate-50 border-b border-slate-100">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Variables</span>
            </div>
            {varSectionItems.map((item) => {
              if (item.type !== 'variable') return null;
              const cat = VARIABLE_PALETTE.find((c) => c.label === item.category);
              const bg = cat?.bg ?? '#f1f5f9';
              const color = cat?.color ?? '#334155';
              const globalIdx = items.indexOf(item);
              return (
                <button
                  key={item.key}
                  data-active={globalIdx === idx ? 'true' : undefined}
                  onMouseDown={(e) => { e.preventDefault(); onSelect(item); }}
                  onMouseEnter={() => setIdx(globalIdx)}
                  className={`w-full text-left px-3 py-2 flex items-center gap-2.5 transition-colors ${globalIdx === idx ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
                >
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0" style={{ background: bg, color }}>
                    {item.label}
                  </span>
                  <span className="text-[10px] text-slate-400">{item.category}</span>
                </button>
              );
            })}
          </>
        )}
        {blockSectionItems.length > 0 && (
          <>
            <div className="px-3 py-1 bg-slate-50 border-b border-slate-100">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Blocs</span>
            </div>
            {blockSectionItems.map((item) => {
              if (item.type !== 'block') return null;
              const globalIdx = items.indexOf(item);
              return (
                <button
                  key={item.key}
                  data-active={globalIdx === idx ? 'true' : undefined}
                  onMouseDown={(e) => { e.preventDefault(); onSelect(item); }}
                  onMouseEnter={() => setIdx(globalIdx)}
                  className={`w-full text-left px-3 py-2 flex items-center gap-2.5 transition-colors ${globalIdx === idx ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
                >
                  <div className={`w-5 h-5 rounded shrink-0 ${item.color.split(' ')[0]}`} />
                  <div>
                    <div className="text-[11px] font-medium text-slate-800">{item.label}</div>
                    <div className="text-[9px] text-slate-400">{item.description}</div>
                  </div>
                </button>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
