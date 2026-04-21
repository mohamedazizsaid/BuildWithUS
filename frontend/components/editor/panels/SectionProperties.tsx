'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { Row } from '@/lib/editor-types';
import { ColorPicker } from './shared';

// ─── Section Properties ───
export function SectionProperties({
  row,
  onUpdateStyles,
}: {
  row: Row;
  onUpdateStyles: (styles: Record<string, string>) => void;
}) {
  const current = row.styles.backgroundColor || 'transparent';
  const isTransparent = current === 'transparent';

  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-4">Section — Propriétés</h3>
      <Label className="text-xs">Couleur de fond</Label>
      <div className="mt-1 space-y-2">
        {/* Transparent toggle */}
        <button
          onClick={() => onUpdateStyles({ backgroundColor: 'transparent' })}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
            isTransparent
              ? 'border-primary bg-primary/5 text-primary'
              : 'border-border text-muted-foreground hover:bg-muted/50'
          }`}
        >
          {/* Checkerboard swatch for transparent */}
          <span
            className="w-5 h-5 rounded-md border border-border shrink-0"
            style={{
              background: 'repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 0 0 / 10px 10px',
            }}
          />
          Transparent
        </button>

        {/* Color picker — only active when not transparent */}
        <ColorPicker
          label=""
          value={isTransparent ? '#ffffff' : current}
          onChange={(color) => onUpdateStyles({ backgroundColor: color })}
        />
      </div>
    </div>
  );
}
