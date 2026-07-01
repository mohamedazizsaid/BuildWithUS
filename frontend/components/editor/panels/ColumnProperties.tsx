'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { Column } from '@/lib/editor-types';
import { ColorPicker, SectionHeader, SpacingControl, NumericInput } from './shared';
import { StyledSelect } from './FontSelectors';

// ─── Column Properties ("box" inside a section) ───
// A column with a background / border / radius renders as a card box around its
// blocks (see CanvasColumn + generatePreviewHtml). The model + MJML export
// (page.tsx col.styles) already support this — this panel makes those boxes
// creatable from scratch instead of only surviving an import.
//
// The border is stored as a single CSS shorthand string `border` (e.g.
// "1px solid #0055D4") because that's what MJML's mj-column expects. We split it
// into size/style/colour for editing and recompose on change.
function parseBorder(border: string | undefined) {
  if (!border) return { size: '0px', style: 'solid', color: '#0055d4' };
  const parts = border.trim().split(/\s+/);
  return {
    size: parts[0] || '0px',
    style: parts[1] || 'solid',
    color: parts.slice(2).join(' ') || '#0055d4',
  };
}

export function ColumnProperties({
  column,
  onUpdateStyles,
}: {
  column: Column;
  onUpdateStyles: (styles: Record<string, string>) => void;
}) {
  const cs = column.styles || {};
  const bgColor = cs.backgroundColor || 'transparent';
  const isTransparent = bgColor === 'transparent';
  const border = parseBorder(cs.border);
  const hasBorder = border.size !== '0px' && border.size !== '0';

  const setBorder = (next: Partial<{ size: string; style: string; color: string }>) => {
    const merged = { ...border, ...next };
    // A 0px border means "no border" — clear the shorthand so nothing renders.
    if (merged.size === '0px' || merged.size === '0') {
      onUpdateStyles({ border: '' });
    } else {
      onUpdateStyles({ border: `${merged.size} ${merged.style} ${merged.color}` });
    }
  };

  const radius = cs.borderRadius || '0px';
  const RADIUS_OPTIONS = [
    { value: '0px', label: 'Carré' },
    { value: '8px', label: 'Léger (8px)' },
    { value: '12px', label: 'Moyen (12px)' },
    { value: '18px', label: 'Grand (18px)' },
    { value: '24px', label: 'Très grand (24px)' },
  ];
  const radiusOptions = RADIUS_OPTIONS.some((o) => o.value === radius)
    ? RADIUS_OPTIONS
    : [{ value: radius, label: `Personnalisé (${radius})` }, ...RADIUS_OPTIONS];

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Colonne (boîte) — Propriétés</h3>
      <p className="text-[11px] text-muted-foreground -mt-2">
        Ajoutez un fond, une bordure et des angles arrondis pour transformer cette colonne en carte.
      </p>

      {/* ─── Couleur de fond ─── */}
      <div>
        <Label className="text-xs">Couleur de fond</Label>
        <div className="mt-1 space-y-2">
          <button
            onClick={() => onUpdateStyles({ backgroundColor: '' })}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
              isTransparent
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-border text-muted-foreground hover:bg-muted/50'
            }`}
          >
            <span
              className="w-5 h-5 rounded-md border border-border shrink-0"
              style={{ background: 'repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 0 0 / 10px 10px' }}
            />
            Transparent
          </button>
          <ColorPicker
            label=""
            value={isTransparent ? '#ffffff' : bgColor}
            onChange={(color) => onUpdateStyles({ backgroundColor: color })}
          />
        </div>
      </div>

      {/* ─── Bordure ─── */}
      <div>
        <SectionHeader>Bordure</SectionHeader>
        <Label className="text-xs">Épaisseur</Label>
        <NumericInput value={border.size} onChange={(v) => setBorder({ size: v })} />
        {hasBorder && (
          <div className="space-y-3 mt-3">
            <StyledSelect
              label="Style"
              value={border.style}
              onChange={(v) => setBorder({ style: v })}
              options={[
                { value: 'solid', label: 'Plein' },
                { value: 'dashed', label: 'Tirets' },
                { value: 'dotted', label: 'Pointillés' },
                { value: 'double', label: 'Double' },
              ]}
            />
            <ColorPicker label="Couleur" value={border.color} onChange={(c) => setBorder({ color: c })} />
          </div>
        )}
      </div>

      {/* ─── Angles arrondis ─── */}
      <div>
        <SectionHeader>Angles arrondis</SectionHeader>
        <StyledSelect
          label=""
          value={radius}
          onChange={(v) => onUpdateStyles({ borderRadius: v })}
          options={radiusOptions}
        />
      </div>

      {/* ─── Espacement intérieur (padding de la carte) ─── */}
      <div>
        <SectionHeader>Espacement intérieur</SectionHeader>
        <SpacingControl styles={cs} updateStyles={onUpdateStyles} defaultValue="24px" />
      </div>

      {/* ─── Alignement vertical ─── */}
      <div>
        <SectionHeader>Alignement vertical</SectionHeader>
        <div className="flex gap-1">
          {[
            { v: 'top', l: 'Haut' },
            { v: 'middle', l: 'Milieu' },
            { v: 'bottom', l: 'Bas' },
          ].map((opt) => (
            <button
              key={opt.v}
              onClick={() => onUpdateStyles({ verticalAlign: opt.v })}
              className={`flex-1 h-8 text-xs rounded-xl border transition-colors ${
                (cs.verticalAlign || 'top') === opt.v
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'border-border hover:bg-accent hover:border-ring'
              }`}
            >
              {opt.l}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
