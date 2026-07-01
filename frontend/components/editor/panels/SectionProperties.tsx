'use client';

import React, { useRef, useState } from 'react';
import { ImageIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Row } from '@/lib/editor-types';
import { ColorPicker, SectionHeader, SpacingControl } from './shared';
import { StyledSelect } from './FontSelectors';

// ─── Section Properties ───
// Sections (mj-section) carry background colour + hero background image, padding
// and rounded corners. The model, MJML export (page.tsx) and preview already
// support all of these via row.styles.{backgroundColor,backgroundUrl,padding,
// borderRadius} — this panel is what makes them editable without touching code.
export function SectionProperties({
  row,
  onUpdateStyles,
}: {
  row: Row;
  onUpdateStyles: (styles: Record<string, string>) => void;
}) {
  const current = row.styles.backgroundColor || 'transparent';
  const isTransparent = current === 'transparent';
  const bgUrl = row.styles.backgroundUrl || '';
  const radius = row.styles.borderRadius || '0px';

  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const { media } = await import('@/lib/api');
      const result = await media.upload(file);
      onUpdateStyles({ backgroundUrl: result.url });
    } catch (err: unknown) {
      console.error('Upload failed:', err instanceof Error ? err.message : err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Radius presets cover the common email-card shapes plus the top/bottom-only
  // rounding used in premium templates (rounded hero on top, rounded footer).
  const RADIUS_OPTIONS = [
    { value: '0px', label: 'Carré' },
    { value: '8px', label: 'Léger (8px)' },
    { value: '16px', label: 'Moyen (16px)' },
    { value: '20px', label: 'Grand (20px)' },
    { value: '20px 20px 0 0', label: 'Haut arrondi' },
    { value: '0 0 20px 20px', label: 'Bas arrondi' },
  ];
  // Show the current value even if it isn't one of the presets (e.g. imported MJML).
  const radiusOptions = RADIUS_OPTIONS.some((o) => o.value === radius)
    ? RADIUS_OPTIONS
    : [{ value: radius, label: `Personnalisé (${radius})` }, ...RADIUS_OPTIONS];

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Section — Propriétés</h3>

      {/* ─── Couleur de fond ─── */}
      <div>
        <Label className="text-xs">Couleur de fond</Label>
        <div className="mt-1 space-y-2">
          <button
            onClick={() => onUpdateStyles({ backgroundColor: 'transparent' })}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
              isTransparent
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-border text-muted-foreground hover:bg-muted/50'
            }`}
          >
            <span
              className="w-5 h-5 rounded-md border border-border shrink-0"
              style={{
                background: 'repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 0 0 / 10px 10px',
              }}
            />
            Transparent
          </button>
          <ColorPicker
            label=""
            value={isTransparent ? '#ffffff' : current}
            onChange={(color) => onUpdateStyles({ backgroundColor: color })}
          />
        </div>
      </div>

      {/* ─── Image de fond (hero) ─── */}
      <div>
        <SectionHeader>Image de fond</SectionHeader>
        {bgUrl && (
          <div className="relative rounded-xl overflow-hidden border border-border mb-2">
            <img src={bgUrl} alt="" className="w-full h-24 object-cover bg-muted/30" />
            <button
              onClick={() => onUpdateStyles({ backgroundUrl: '' })}
              className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs hover:bg-red-600 shadow"
            >
              ×
            </button>
          </div>
        )}
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml" onChange={handleUpload} className="hidden" />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="w-full h-9 rounded-xl border border-dashed border-border text-xs text-muted-foreground hover:bg-accent hover:border-ring transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isUploading ? (
            <><div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" /> Upload en cours...</>
          ) : (
            <><ImageIcon size={14} />{bgUrl ? "Changer l'image" : "Importer une image"}</>
          )}
        </button>
        <div className="mt-2">
          <Label className="text-xs">URL de l&apos;image</Label>
          <Input
            value={bgUrl}
            onChange={(e) => onUpdateStyles({ backgroundUrl: e.target.value })}
            className="h-8 text-xs mt-1"
            placeholder="https://..."
          />
        </div>
        {bgUrl && (
          <p className="text-[10px] text-muted-foreground mt-1.5">
            Un voile sombre est appliqué automatiquement pour garder le texte lisible.
          </p>
        )}
      </div>

      {/* ─── Espacement ─── */}
      <div>
        <SectionHeader>Espacement (marge intérieure)</SectionHeader>
        <SpacingControl styles={row.styles} updateStyles={onUpdateStyles} defaultValue="10px 0" />
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
    </div>
  );
}
