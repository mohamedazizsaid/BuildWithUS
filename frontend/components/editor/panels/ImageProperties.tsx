'use client';

import React, { useState, useRef } from 'react';
import { ImageIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BlockData } from '@/lib/editor-types';
import { ColorPicker, NumericInput, AccordionSection, SpacingControl } from './shared';
import { StyledSelect } from './FontSelectors';

// ─── Image Block Properties (with upload + full options) ───
export function ImageBlockProperties({
  block,
  updateContent,
  updateStyle,
  updateStyles,
}: {
  block: BlockData;
  updateContent: (key: string, value: string) => void;
  updateStyle: (key: string, value: string) => void;
  updateStyles: (updates: Record<string, string>) => void;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>('visual');
  const [imgDimensions, setImgDimensions] = useState<{ w: number; h: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const { media } = await import('@/lib/api');
      const result = await media.upload(file);
      updateContent('src', result.url);
    } catch (err: unknown) {
      console.error('Upload failed:', err instanceof Error ? err.message : err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Detect image dimensions
  const onImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImgDimensions({ w: img.naturalWidth, h: img.naturalHeight });
  };

  return (
    <div className="space-y-1">
      {/* ─── Visuel ─── */}
      <AccordionSection openSection={openSection} setOpenSection={setOpenSection} id="visual" title="Visuel">
        <div className="space-y-2">
          {block.content.src && (
            <div className="relative rounded-xl overflow-hidden border border-border">
              <img
                src={block.content.src as string}
                alt={block.content.alt as string || ''}
                className="w-full h-32 object-contain bg-muted/30"
                onLoad={onImgLoad}
              />
              <button
                onClick={() => { updateContent('src', ''); setImgDimensions(null); }}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs hover:bg-red-600 shadow"
              >
                ×
              </button>
              {imgDimensions && (
                <div className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px]">
                  {imgDimensions.w} × {imgDimensions.h} px
                </div>
              )}
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
              <><ImageIcon size={14} />{block.content.src ? "Changer l'image" : "Importer une image"}</>
            )}
          </button>
        </div>
        <div>
          <Label className="text-xs">URL de l&apos;image</Label>
          <Input value={block.content.src as string} onChange={(e) => updateContent('src', e.target.value)} className="h-8 text-xs mt-1" placeholder="https://..." />
        </div>
        <div>
          <Label className="text-xs">Texte alternatif</Label>
          <Input value={block.content.alt as string} onChange={(e) => updateContent('alt', e.target.value)} className="h-8 text-xs mt-1" />
        </div>
      </AccordionSection>

      {/* ─── Lien ─── */}
      {/* ─── Lien ─── */}
      <AccordionSection openSection={openSection} setOpenSection={setOpenSection} id="link" title="Lien">
        <div>
          <Label className="text-xs">URL du lien</Label>
          <Input
            value={block.content.href as string || ''}
            onChange={(e) => updateContent('href', e.target.value)}
            onBlur={(e) => {
              const val = e.target.value.trim();
              if (val && !val.match(/^https?:\/\//) && val !== '#') {
                updateContent('href', `https://${val}`);
              }
            }}
            className="h-8 text-xs mt-1"
            placeholder="https://..."
          />
        </div>
      </AccordionSection>

      {/* ─── Mise en page ─── */}
      <AccordionSection openSection={openSection} setOpenSection={setOpenSection} id="layout" title="Mise en page">
        <div>
          <Label className="text-xs">Largeur</Label>
          <div className="flex items-center gap-2 mt-1">
            <input
              type="range"
              min={10}
              max={100}
              value={parseInt(block.styles.width) || 100}
              onChange={(e) => updateStyle('width', `${e.target.value}%`)}
              className="flex-1 h-2 rounded-full appearance-none bg-muted cursor-pointer accent-primary"
            />
            <span className="text-xs text-muted-foreground w-12 text-right">{parseInt(block.styles.width) || 100}%</span>
          </div>
          {imgDimensions && (
            <p className="text-[10px] text-muted-foreground mt-1">Original : {imgDimensions.w} × {imgDimensions.h} px</p>
          )}
        </div>
        <div>
          <Label className="text-xs">Alignement du bloc</Label>
          <div className="flex gap-1 mt-1">
            {[
              { v: 'left', l: 'Gauche' },
              { v: 'center', l: 'Centre' },
              { v: 'right', l: 'Droite' },
            ].map((opt) => (
              <button
                key={opt.v}
                onClick={() => updateStyles({ textAlign: opt.v, blockAlign: opt.v })}
                className={`flex-1 h-8 text-xs rounded-xl border transition-colors ${
                  (block.styles.textAlign || 'center') === opt.v
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'border-border hover:bg-accent hover:border-ring'
                }`}
              >
                {opt.l}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-xs">Forme</Label>
          <div className="grid grid-cols-3 gap-1.5 mt-1">
            {[
              { v: '0px', l: 'Rectangle', preview: 'rounded-none' },
              { v: '8px', l: 'Arrondi', preview: 'rounded-lg' },
              { v: '50%', l: 'Cercle', preview: 'rounded-full' },
            ].map((opt) => (
              <button
                key={opt.v}
                onClick={() => updateStyle('borderRadius', opt.v)}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${
                  (block.styles.borderRadius || '0px') === opt.v
                    ? 'bg-primary/10 border-primary shadow-sm'
                    : 'border-border hover:bg-accent hover:border-ring'
                }`}
              >
                <div className={`w-8 h-8 bg-muted-foreground/20 ${opt.preview}`} />
                <span className="text-[10px] text-muted-foreground">{opt.l}</span>
              </button>
            ))}
          </div>
        </div>
      </AccordionSection>

      {/* ─── Espacement ─── */}
      <AccordionSection openSection={openSection} setOpenSection={setOpenSection} id="spacing" title="Espacement">
        <SpacingControl styles={block.styles} updateStyles={updateStyles} />
      </AccordionSection>

      {/* ─── Bordures ─── */}
      <AccordionSection openSection={openSection} setOpenSection={setOpenSection} id="borders" title="Bordures">
        <div>
          <Label className="text-xs">Taille</Label>
          <NumericInput value={block.styles.borderSize || '0px'} onChange={(v) => updateStyle('borderSize', v)} />
        </div>
        <StyledSelect
          label="Style"
          value={block.styles.borderStyle || 'solid'}
          onChange={(v) => updateStyle('borderStyle', v)}
          options={[
            { value: 'solid', label: 'Plein' },
            { value: 'dashed', label: 'Tirets' },
            { value: 'dotted', label: 'Pointillés' },
          ]}
        />
        <ColorPicker label="Couleur" value={block.styles.borderColor || '#e2e8f0'} onChange={(c) => updateStyle('borderColor', c)} />
      </AccordionSection>
    </div>
  );
}
