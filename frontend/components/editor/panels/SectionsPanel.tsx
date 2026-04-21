'use client';

import React, { useState } from 'react';
import { Row } from '@/lib/editor-types';
import { SECTIONS, SECTION_CATEGORIES } from '@/lib/editor-sections';

// ─── Section Mini Preview ───
export function SectionMiniPreview({ layout }: { layout: import('@/lib/editor-sections').LayoutRow[] }) {
  const cellConfig: Record<string, { bg: string; border: string; h: string; label: string }> = {
    img:     { bg: 'bg-slate-100', border: 'border-slate-200', h: 'h-10',  label: '' },
    title:   { bg: 'bg-slate-100', border: 'border-slate-200', h: 'h-3',   label: 'Titre' },
    text:    { bg: 'bg-slate-50',  border: 'border-slate-200', h: 'h-2.5', label: 'Texte' },
    btn:     { bg: 'bg-slate-800', border: 'border-slate-900', h: 'h-3.5', label: 'Bouton' },
    divider: { bg: '',             border: '',                  h: '',      label: '' },
    empty:   { bg: '',             border: '',                  h: '',      label: '' },
  };

  return (
    <div className="space-y-0.5">
      {layout.map((row, ri) => (
        <div key={ri} className="flex gap-0.5">
          {row.cells.map((cell, ci) => {
            const cfg = cellConfig[cell.type] || cellConfig.empty;

            if (cell.type === 'divider') {
              return <div key={ci} className="w-full h-px bg-slate-300 my-1" />;
            }
            if (cell.type === 'empty') {
              return <div key={ci} style={{ width: `${cell.w}%` }} />;
            }

            if (cell.type === 'img') {
              return (
                <div
                  key={ci}
                  className={`${cfg.h} rounded-sm border ${cfg.border} overflow-hidden`}
                  style={{ width: `${cell.w}%` }}
                >
                  {cell.src ? (
                    <img src={cell.src} alt="" className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className={`w-full h-full ${cfg.bg} flex items-center justify-center`}>
                      <span className="text-[8px] text-muted-foreground">🖼️</span>
                    </div>
                  )}
                </div>
              );
            }

            return (
              <div
                key={ci}
                className={`${cfg.h} rounded-sm ${cfg.bg} border ${cfg.border} flex items-center justify-center overflow-hidden`}
                style={{ width: `${cell.w}%` }}
              >
                <span className={`text-[7px] leading-none ${cell.type === 'btn' ? 'text-white' : 'text-muted-foreground/70'}`}>
                  {cfg.label}
                </span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── Sections Panel ───
export function SectionsPanel({ onAddSection }: { onAddSection: (rows: Row[]) => void }) {
  const [activeCategory, setActiveCategory] = useState<string>('text-image');

  const filtered = SECTIONS.filter(s => s.category === activeCategory);

  return (
    <div>
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Sections</h3>

      {/* Category tabs */}
      <div className="flex gap-1 mb-3">
        {SECTION_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-xl text-[10px] font-medium transition-all ${
              activeCategory === cat.id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'border border-border hover:bg-accent hover:border-ring'
            }`}
          >
            <span>{cat.icon}</span>
          </button>
        ))}
      </div>

      {/* Section items */}
      <div className="grid grid-cols-2 gap-2">
        {filtered.map((section) => (
          <div
            key={section.id}
            onClick={() => onAddSection(section.rows())}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('sectionId', section.id);
              e.dataTransfer.effectAllowed = 'copy';
            }}
            className="rounded-xl border border-border p-2.5 hover:border-ring hover:shadow-md hover:-translate-y-0.5 transition-all cursor-grab active:cursor-grabbing"
          >
            <p className="text-[9px] font-medium text-muted-foreground mb-1.5 leading-tight truncate">{section.name}</p>
            <div className="p-1.5 bg-muted/30 rounded-lg">
              <SectionMiniPreview layout={section.layout} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
