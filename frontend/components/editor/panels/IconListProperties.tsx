'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { BlockData } from '@/lib/editor-types';
import { ColorPicker, NumericInput } from './shared';
import { FontWeightSelector } from './FontSelectors';

export function IconListBlockProperties({
  block,
  onUpdate,
}: {
  block: BlockData;
  onUpdate: (updates: Partial<BlockData>) => void;
}) {
  const align = (block.content.align as string) || 'left';

  const updateContent = (patch: Record<string, unknown>) => {
    onUpdate({ content: { ...block.content, ...patch } as BlockData['content'] });
  };
  const updateStyle = (key: string, value: string) => {
    onUpdate({ styles: { ...block.styles, [key]: value } });
  };

  return (
    <div className="space-y-4">
      <p className="text-[11px] text-muted-foreground italic">
        Modifiez le texte et les icônes directement sur le canvas. Cliquez sur une icône pour la changer, et « + Élément » pour en ajouter.
      </p>

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

      {/* Icon styles */}
      <div className="pt-2 border-t border-border space-y-3">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase">Icône</h4>
        <ColorPicker
          label="Couleur de l'icône"
          value={block.styles.iconColor || '#16a34a'}
          onChange={(c) => updateStyle('iconColor', c)}
        />
        <div>
          <Label className="text-xs">Taille de l&apos;icône</Label>
          <NumericInput
            value={block.styles.iconSize || '20px'}
            onChange={(v) => updateStyle('iconSize', v)}
          />
        </div>
      </div>

      {/* Text typography */}
      <div className="pt-2 border-t border-border space-y-3">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase">Texte</h4>
        <ColorPicker
          label="Couleur du texte"
          value={block.styles.color || '#0f172a'}
          onChange={(c) => updateStyle('color', c)}
        />
        <div>
          <Label className="text-xs">Taille de police</Label>
          <NumericInput
            value={block.styles.fontSize || '16px'}
            onChange={(v) => updateStyle('fontSize', v)}
          />
        </div>
        <FontWeightSelector
          value={block.styles.fontWeight || 'normal'}
          onChange={(v) => updateStyle('fontWeight', v)}
        />
      </div>

      {/* Spacing */}
      <div className="pt-2 border-t border-border space-y-3">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase">Espacement</h4>
        <div>
          <Label className="text-xs">Entre les éléments</Label>
          <NumericInput
            value={block.styles.spacing || '12px'}
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
