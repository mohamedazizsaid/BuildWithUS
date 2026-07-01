'use client';

import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { BlockData } from '@/lib/editor-types';
import { ColorPicker, SectionHeader, NumericInput, SpacingControl } from './shared';
import { StyledSelect } from './FontSelectors';

// ─── Color Bar Properties ───
// Edits the decorative multi-segment stripe: its segment colours (add/remove/
// recolour), thickness and corner rounding. Serialised as an email-safe table
// (see mjml-builder color-bar case).
export function ColorBarProperties({
  block,
  onUpdate,
}: {
  block: BlockData;
  onUpdate: (updates: Partial<BlockData>) => void;
}) {
  const segments = ((block.content.segments as string[]) || []);
  const height = block.styles.height || '8px';
  const radius = block.styles.borderRadius || '0px';

  const setSegments = (next: string[]) => onUpdate({ content: { ...block.content, segments: next } });
  const updateStyles = (updates: Record<string, string>) => onUpdate({ styles: { ...block.styles, ...updates } });

  const setColor = (i: number, color: string) => {
    const next = [...segments];
    next[i] = color;
    setSegments(next);
  };
  const addSegment = () => setSegments([...segments, '#94a3b8']);
  const removeSegment = (i: number) => setSegments(segments.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-4">
      {/* ─── Segments ─── */}
      <div>
        <SectionHeader>Segments de couleur</SectionHeader>
        <div className="space-y-2">
          {segments.map((color, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="flex-1">
                <ColorPicker label="" value={color} onChange={(c) => setColor(i, c)} />
              </div>
              <button
                onClick={() => removeSegment(i)}
                disabled={segments.length <= 1}
                className="w-8 h-8 shrink-0 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-red-50 hover:text-red-500 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Supprimer le segment"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={addSegment}
          className="w-full h-8 mt-2 rounded-xl border border-dashed border-border text-xs text-muted-foreground hover:bg-accent hover:border-ring transition-all flex items-center justify-center gap-1.5"
        >
          <Plus size={13} /> Ajouter un segment
        </button>
      </div>

      {/* ─── Épaisseur ─── */}
      <div>
        <SectionHeader>Épaisseur</SectionHeader>
        <Label className="text-xs">Hauteur de la barre</Label>
        <NumericInput value={height} onChange={(v) => updateStyles({ height: v })} />
      </div>

      {/* ─── Angles arrondis ─── */}
      <div>
        <SectionHeader>Angles arrondis</SectionHeader>
        <StyledSelect
          label=""
          value={radius}
          onChange={(v) => updateStyles({ borderRadius: v })}
          options={[
            { value: '0px', label: 'Carré' },
            { value: '4px', label: 'Léger (4px)' },
            { value: '9999px', label: 'Complet' },
          ]}
        />
      </div>

      {/* ─── Espacement ─── */}
      <div>
        <SectionHeader>Espacement</SectionHeader>
        <SpacingControl styles={block.styles} updateStyles={updateStyles} defaultValue="0" />
      </div>
    </div>
  );
}
