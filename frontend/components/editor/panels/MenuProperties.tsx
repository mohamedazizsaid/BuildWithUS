'use client';

import React from 'react';
import { X, Plus, Rows3, Columns3 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BlockData } from '@/lib/editor-types';
import { ColorPicker, NumericInput } from './shared';
import { FontWeightSelector, StyledSelect } from './FontSelectors';

export function MenuBlockProperties({
  block,
  onUpdate,
}: {
  block: BlockData;
  onUpdate: (updates: Partial<BlockData>) => void;
}) {
  const items = (block.content.items || []) as string[][];
  const layout = (block.content.layout as string) || 'horizontal';
  const align = (block.content.align as string) || 'center';

  const updateContent = (patch: Record<string, unknown>) => {
    onUpdate({ content: { ...block.content, ...patch } as BlockData['content'] });
  };

  const updateStyle = (key: string, value: string) => {
    onUpdate({ styles: { ...block.styles, [key]: value } });
  };

  const setItems = (next: string[][]) => updateContent({ items: next });

  const setLabel = (i: number, label: string) => {
    setItems(items.map((it, idx) => (idx === i ? [label, it[1] ?? '#'] : it)));
  };

  const setUrl = (i: number, url: string) => {
    setItems(items.map((it, idx) => (idx === i ? [it[0] ?? '', url] : it)));
  };

  const addItem = () => {
    setItems([...items, [`Option ${items.length + 1}`, '#']]);
  };

  const removeItem = (i: number) => {
    setItems(items.filter((_, idx) => idx !== i));
  };

  return (
    <div className="space-y-4">
      {/* Layout */}
      <div>
        <Label className="text-xs mb-1 block">Disposition</Label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => updateContent({ layout: 'horizontal' })}
            className={`flex flex-col items-center gap-1 h-16 rounded-lg border transition-all ${
              layout === 'horizontal'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:bg-muted/50'
            }`}
          >
            <Columns3 size={18} />
            <span className="text-[10px] font-medium">Horizontal</span>
          </button>
          <button
            onClick={() => updateContent({ layout: 'vertical' })}
            className={`flex flex-col items-center gap-1 h-16 rounded-lg border transition-all ${
              layout === 'vertical'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:bg-muted/50'
            }`}
          >
            <Rows3 size={18} />
            <span className="text-[10px] font-medium">Vertical</span>
          </button>
        </div>
      </div>

      {/* Alignment */}
      <div>
        <Label className="text-xs mb-1 block">Alignement</Label>
        <div className="flex gap-1">
          {(['left', 'center', 'right'] as const).map((a) => (
            <button
              key={a}
              onClick={() => updateContent({ align: a })}
              className={`flex-1 h-7 rounded text-xs font-medium transition-all ${
                align === a ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {a === 'left' ? 'Gauche' : a === 'center' ? 'Centré' : 'Droite'}
            </button>
          ))}
        </div>
      </div>

      {/* Items */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Options</Label>
          <button
            onClick={addItem}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium"
          >
            <Plus size={12} />
            Ajouter
          </button>
        </div>
        {items.map(([label, url], idx) => (
          <div key={idx} className="space-y-1 p-2 rounded-md border border-border bg-muted/30">
            <div className="flex items-center gap-1.5">
              <Input
                value={label}
                onChange={(e) => setLabel(idx, e.target.value)}
                placeholder="Libellé"
                className="h-7 text-xs flex-1"
              />
              <button
                onClick={() => removeItem(idx)}
                className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                title="Supprimer"
              >
                <X size={12} />
              </button>
            </div>
            <Input
              value={url}
              onChange={(e) => setUrl(idx, e.target.value)}
              onBlur={(e) => {
                const val = e.target.value.trim();
                if (val && !val.match(/^https?:\/\//) && val !== '#') {
                  setUrl(idx, `https://${val}`);
                }
              }}
              placeholder="https://..."
              className="h-7 text-xs"
            />
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-[11px] text-muted-foreground italic">Aucune option — cliquez « Ajouter »</p>
        )}
      </div>

      {/* Typography */}
      <div className="pt-2 border-t border-border space-y-3">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase">Typographie</h4>
        <ColorPicker
          label="Couleur du texte"
          value={block.styles.color || '#0f172a'}
          onChange={(c) => updateStyle('color', c)}
        />
        <div>
          <Label className="text-xs">Taille de police</Label>
          <NumericInput
            value={block.styles.fontSize || '14px'}
            onChange={(v) => updateStyle('fontSize', v)}
          />
        </div>
        <FontWeightSelector
          value={block.styles.fontWeight || 'normal'}
          onChange={(v) => updateStyle('fontWeight', v)}
        />
        <StyledSelect
          label="Décoration"
          value={block.styles.textDecoration || 'none'}
          onChange={(v) => updateStyle('textDecoration', v)}
          options={[
            { value: 'none', label: 'Aucune' },
            { value: 'underline', label: 'Soulignée' },
          ]}
        />
      </div>

      {/* Spacing */}
      <div className="pt-2 border-t border-border space-y-3">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase">Espacement</h4>
        <div>
          <Label className="text-xs">Entre les options</Label>
          <NumericInput
            value={block.styles.spacing || '20px'}
            onChange={(v) => updateStyle('spacing', v)}
          />
        </div>
        <div>
          <Label className="text-xs">Marge intérieure</Label>
          <NumericInput
            value={block.styles.padding || '10px'}
            onChange={(v) => updateStyle('padding', v)}
          />
        </div>
      </div>
    </div>
  );
}
