'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BlockData } from '@/lib/editor-types';
import { ColorPicker, AccordionSection } from './shared';
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

  const setHeaders = (h: string[]) => onUpdate({ content: { ...block.content, headers: h } });
  const setRows = (r: string[][]) => onUpdate({ content: { ...block.content, rows: r } });

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
        <ColorPicker label="Couleur du texte" value={block.styles.color || '#333333'} onChange={(c) => updateStyle('color', c)} />
        <ColorPicker label="Fond de l'en-tête" value={block.styles.headerBg || '#f1f5f9'} onChange={(c) => updateStyle('headerBg', c)} />
        <ColorPicker label="Couleur de bordure" value={block.styles.tableBorderColor || '#dddddd'} onChange={(c) => updateStyle('tableBorderColor', c)} />
      </AccordionSection>

      <AccordionSection openSection={openSection} setOpenSection={setOpenSection} id="spacing" title="Espacement">
        <StyledSelect
          label="Marge intérieure"
          value={block.styles.padding || '10px'}
          onChange={(v) => updateStyle('padding', v)}
          options={[
            { value: '0px', label: 'Aucun' },
            { value: '10px', label: 'Normal (10px)' },
            { value: '16px', label: 'Grand (16px)' },
            { value: '24px', label: 'Extra (24px)' },
          ]}
        />
      </AccordionSection>
    </div>
  );
}
