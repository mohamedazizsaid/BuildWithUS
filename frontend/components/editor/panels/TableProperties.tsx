'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BlockData } from '@/lib/editor-types';
import { ColorPicker, AccordionSection, Toggle, SpacingControl, NumericInput, SectionHeader } from './shared';
import { FontSizeSelector, StyledSelect } from './FontSelectors';

// ─── Table Properties ───
export function TableBlockProperties({
  block, onUpdate, updateStyle,
}: {
  block: BlockData;
  onUpdate: (updates: Partial<BlockData>) => void;
  updateStyle: (key: string, value: string) => void;
}) {
  const [openSection, setOpenSection] = useState<string | null>('data');
  const headers = (block.content.headers || []) as string[];
  const rows = (block.content.rows || []) as string[][];

  const aligns = (block.content.aligns || []) as string[];

  const setHeaders = (h: string[]) => onUpdate({ content: { ...block.content, headers: h } });
  const setRows = (r: string[][]) => onUpdate({ content: { ...block.content, rows: r } });
  const setAlign = (idx: number, val: string) => {
    const next = headers.map((_, i) => aligns[i] || 'left');
    next[idx] = val;
    onUpdate({ content: { ...block.content, aligns: next } });
  };

  const addColumn = () => {
    onUpdate({ content: { ...block.content, headers: [...headers, `Col ${headers.length + 1}`], rows: rows.map(r => [...r, '']) } });
  };

  const removeColumn = (idx: number) => {
    if (headers.length <= 1) return;
    onUpdate({ content: { ...block.content, headers: headers.filter((_, i) => i !== idx), rows: rows.map(r => r.filter((_, i) => i !== idx)) } });
  };

  const addRow = () => {
    setRows([...rows, headers.map(() => '')]);
  };

  const removeRow = (idx: number) => {
    setRows(rows.filter((_, i) => i !== idx));
  };

  const updateHeader = (idx: number, val: string) => {
    const h = [...headers];
    h[idx] = val;
    setHeaders(h);
  };

  const updateCell = (rowIdx: number, colIdx: number, val: string) => {
    const r = rows.map(row => [...row]);
    r[rowIdx][colIdx] = val;
    setRows(r);
  };

  return (
    <div className="space-y-1">
      <AccordionSection openSection={openSection} setOpenSection={setOpenSection} id="data" title="Données">
        {/* Headers */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <Label className="text-xs">Colonnes ({headers.length})</Label>
            <button onClick={addColumn} className="text-[10px] text-primary hover:underline">+ Ajouter</button>
          </div>
          <div className="space-y-1">
            {headers.map((h, i) => (
              <div key={i} className="flex gap-1">
                <Input value={h} onChange={(e) => updateHeader(i, e.target.value)} className="h-7 text-xs flex-1" />
                {headers.length > 1 && (
                  <button onClick={() => removeColumn(i)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 text-red-500 text-xs">×</button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Rows */}
        <div>
          <div className="flex items-center justify-between mb-1 mt-3">
            <Label className="text-xs">Lignes ({rows.length})</Label>
            <button onClick={addRow} className="text-[10px] text-primary hover:underline">+ Ajouter</button>
          </div>
          <div className="space-y-2">
            {rows.map((row, ri) => (
              <div key={ri} className="rounded-lg border border-border p-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-muted-foreground">Ligne {ri + 1}</span>
                  <button onClick={() => removeRow(ri)} className="text-[10px] text-red-500 hover:underline">Supprimer</button>
                </div>
                <div className="space-y-1">
                  {row.map((cell, ci) => (
                    <div key={ci} className="flex gap-1 items-center">
                      <span className="text-[9px] text-muted-foreground w-12 truncate">{headers[ci] || `C${ci}`}</span>
                      <Input value={cell} onChange={(e) => updateCell(ri, ci, e.target.value)} className="h-6 text-xs flex-1" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </AccordionSection>

      <AccordionSection openSection={openSection} setOpenSection={setOpenSection} id="style" title="Style">
        <FontSizeSelector value={block.styles.fontSize || '14px'} onChange={(v) => updateStyle('fontSize', v)} />
        <ColorPicker label="Couleur du texte" value={block.styles.color || '#334155'} onChange={(c) => updateStyle('color', c)} />
        <ColorPicker label="Fond de l'en-tête" value={block.styles.headerBg || '#f1f5f9'} onChange={(c) => updateStyle('headerBg', c)} />
        <ColorPicker label="Texte de l'en-tête" value={block.styles.headerColor || '#0f172a'} onChange={(c) => updateStyle('headerColor', c)} />
        <ColorPicker label="Lignes (séparateurs)" value={block.styles.tableBorderColor || '#e5e7eb'} onChange={(c) => updateStyle('tableBorderColor', c)} />
        <div className="pt-1">
          <Toggle label="Lignes alternées" value={block.styles.striped !== 'off'} onChange={(v) => updateStyle('striped', v ? 'on' : 'off')} />
        </div>
        {block.styles.striped !== 'off' && (
          <ColorPicker label="Couleur des lignes alternées" value={block.styles.stripeColor || '#f9fafb'} onChange={(c) => updateStyle('stripeColor', c)} />
        )}

        <SectionHeader>Cellules</SectionHeader>
        <div>
          <Label className="text-xs">Épaisseur des bordures</Label>
          <NumericInput value={block.styles.tableBorderWidth || '1px'} onChange={(v) => updateStyle('tableBorderWidth', v)} />
        </div>
        <StyledSelect
          label="Espacement des cellules"
          value={block.styles.cellPadding || 'normal'}
          onChange={(v) => updateStyle('cellPadding', v)}
          options={[
            { value: 'compact', label: 'Compact' },
            { value: 'normal', label: 'Normal' },
            { value: 'large', label: 'Large' },
          ]}
        />

        <SectionHeader>Alignement par colonne</SectionHeader>
        <div className="space-y-1.5">
          {headers.map((h, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground w-14 truncate">{h || `C${i + 1}`}</span>
              <div className="flex gap-1 flex-1">
                {[
                  { v: 'left', l: 'G' },
                  { v: 'center', l: 'C' },
                  { v: 'right', l: 'D' },
                ].map((opt) => (
                  <button
                    key={opt.v}
                    onClick={() => setAlign(i, opt.v)}
                    className={`flex-1 h-7 text-xs rounded-lg border transition-colors ${
                      (aligns[i] || 'left') === opt.v
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border hover:bg-accent hover:border-ring'
                    }`}
                    title={opt.v}
                  >
                    {opt.l}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </AccordionSection>

      <AccordionSection openSection={openSection} setOpenSection={setOpenSection} id="spacing" title="Espacement">
        <SpacingControl styles={block.styles} updateStyles={(u) => onUpdate({ styles: { ...block.styles, ...u } })} />
      </AccordionSection>
    </div>
  );
}
