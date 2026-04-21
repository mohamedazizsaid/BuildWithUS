'use client';

import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { BlockData } from '@/lib/editor-types';
import { ColorPicker } from './shared';

// ─── Font Groups ───
export const FONT_GROUPS = [
  { label: 'SANS-SERIF', fonts: [
    { name: 'Inter', value: 'Inter, sans-serif' },
    { name: 'DM Sans', value: "'DM Sans', sans-serif" },
    { name: 'Nunito', value: 'Nunito, sans-serif' },
    { name: 'Poppins', value: 'Poppins, sans-serif' },
    { name: 'Raleway', value: 'Raleway, sans-serif' },
    { name: 'Outfit', value: 'Outfit, sans-serif' },
    { name: 'Plus Jakarta Sans', value: "'Plus Jakarta Sans', sans-serif" },
    { name: 'Manrope', value: 'Manrope, sans-serif' },
    { name: 'Figtree', value: 'Figtree, sans-serif' },
    { name: 'Sora', value: 'Sora, sans-serif' },
    { name: 'Verdana', value: 'Verdana, sans-serif' },
    { name: 'Arial', value: 'Arial, sans-serif' },
    { name: 'Helvetica', value: 'Helvetica, sans-serif' },
    { name: 'Tahoma', value: 'Tahoma, sans-serif' },
  ]},
  { label: 'SERIF', fonts: [
    { name: 'Playfair Display', value: "'Playfair Display', serif" },
    { name: 'Lora', value: 'Lora, serif' },
    { name: 'Merriweather', value: 'Merriweather, serif' },
    { name: 'DM Serif Display', value: "'DM Serif Display', serif" },
    { name: 'Cormorant Garamond', value: "'Cormorant Garamond', serif" },
    { name: 'Libre Baskerville', value: "'Libre Baskerville', serif" },
    { name: 'Georgia', value: 'Georgia, serif' },
    { name: 'Times New Roman', value: "'Times New Roman', serif" },
  ]},
  { label: 'MONOSPACE', fonts: [
    { name: 'JetBrains Mono', value: "'JetBrains Mono', monospace" },
    { name: 'Fira Code', value: "'Fira Code', monospace" },
    { name: 'Space Mono', value: "'Space Mono', monospace" },
    { name: 'IBM Plex Mono', value: "'IBM Plex Mono', monospace" },
    { name: 'Courier New', value: "'Courier New', monospace" },
  ]},
  { label: 'DISPLAY', fonts: [
    { name: 'Pacifico', value: 'Pacifico, cursive' },
    { name: 'Lobster', value: 'Lobster, cursive' },
    { name: 'Righteous', value: 'Righteous, cursive' },
    { name: 'Bebas Neue', value: "'Bebas Neue', sans-serif" },
    { name: 'Abril Fatface', value: "'Abril Fatface', serif" },
    { name: 'Yeseva One', value: "'Yeseva One', serif" },
  ]},
];

// ─── Font Select ───
export function FontSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const currentFont = FONT_GROUPS.flatMap(g => g.fonts).find(f => f.value === value);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-8 rounded-lg border border-border text-xs px-3 text-left flex items-center justify-between hover:border-ring transition-colors"
        style={{ fontFamily: value }}
      >
        <span className="truncate">{currentFont?.name || 'Verdana'}</span>
        <span className="text-muted-foreground ml-1">▾</span>
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-9 left-0 z-50 w-full max-h-64 overflow-y-auto rounded-xl border border-border bg-popover shadow-[0_8px_24px_rgba(0,0,0,0.12)] py-1">
            {FONT_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider px-3 pt-2 pb-1">{group.label}</p>
                {group.fonts.map((font) => (
                  <button
                    key={font.value}
                    onClick={() => { onChange(font.value); setIsOpen(false); }}
                    className={`w-full text-left px-3 py-1.5 text-sm hover:bg-accent transition-colors flex items-center gap-2 ${
                      value === font.value ? 'bg-accent text-accent-foreground' : ''
                    }`}
                    style={{ fontFamily: font.value }}
                  >
                    {font.name}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Font Size Selector (consistent across all blocks) ───
const FONT_SIZES = ['10px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px', '40px', '48px', '56px', '64px'];

export function FontSizeSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  // Resolve the effective size — always use the actual numeric value
  const resolvedValue = value && value !== '' ? value : '16px';
  const currentSize = parseInt(resolvedValue) || 16;

  const decrease = () => {
    const newSize = Math.max(8, currentSize - 2);
    onChange(`${newSize}px`);
  };
  const increase = () => {
    const newSize = Math.min(72, currentSize + 2);
    onChange(`${newSize}px`);
  };

  return (
    <div>
      <Label className="text-xs">Taille de police</Label>
      <div className="flex items-center gap-1 mt-1">
        <button onClick={decrease} className="w-9 h-9 rounded-xl border border-border flex items-center justify-center hover:bg-accent hover:border-ring text-sm font-medium shadow-sm transition-all">−</button>
        <select
          value={resolvedValue}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 h-9 rounded-xl border border-border bg-background text-xs px-2 text-center shadow-sm hover:border-ring focus:border-ring focus:ring-1 focus:ring-ring/20 outline-none transition-all appearance-none cursor-pointer"
        >
          {FONT_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
          {/* Show current size if not in preset list */}
          {!FONT_SIZES.includes(resolvedValue) && (
            <option value={resolvedValue}>{resolvedValue}</option>
          )}
        </select>
        <button onClick={increase} className="w-9 h-9 rounded-xl border border-border flex items-center justify-center hover:bg-accent hover:border-ring text-sm font-medium shadow-sm transition-all">+</button>
      </div>
    </div>
  );
}

// ─── Font Family Selector (block-level, with inherit option) ───
export function FontFamilySelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const allFonts = [{ name: 'Hérité (du corps)', value: 'inherit' }, ...FONT_GROUPS.flatMap(g => g.fonts)];
  const currentFont = allFonts.find(f => f.value === value) || allFonts[0];

  return (
    <div>
      <Label className="text-xs">Police</Label>
      <div className="relative mt-1">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full h-9 rounded-xl border border-border bg-background text-xs px-3 text-left flex items-center justify-between shadow-sm hover:border-ring transition-all"
          style={{ fontFamily: value !== 'inherit' ? value : undefined }}
        >
          <span className="truncate">{currentFont.name}</span>
          <span className="text-muted-foreground ml-1">▾</span>
        </button>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <div className="absolute top-10 left-0 z-50 w-full max-h-64 overflow-y-auto rounded-xl border border-border bg-popover shadow-[0_8px_24px_rgba(0,0,0,0.12)] py-1">
              <button
                onClick={() => { onChange('inherit'); setIsOpen(false); }}
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors ${value === 'inherit' ? 'bg-accent' : ''}`}
              >
                Hérité (du corps)
              </button>
              {FONT_GROUPS.map((group) => (
                <div key={group.label}>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider px-3 pt-2 pb-1">{group.label}</p>
                  {group.fonts.map((font) => (
                    <button
                      key={font.value}
                      onClick={() => { onChange(font.value); setIsOpen(false); }}
                      className={`w-full text-left px-3 py-1.5 text-sm hover:bg-accent transition-colors ${value === font.value ? 'bg-accent' : ''}`}
                      style={{ fontFamily: font.value }}
                    >
                      {font.name}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Font Weight Selector ───
export function FontWeightSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-xs">Graisse</Label>
      <div className="flex gap-1 mt-1">
        {[
          { v: 'lighter', l: 'Léger' },
          { v: 'normal', l: 'Normal' },
          { v: 'bold', l: 'Gras' },
        ].map((opt) => (
          <button
            key={opt.v}
            onClick={() => onChange(opt.v)}
            className={`flex-1 h-8 text-xs rounded-md border transition-colors ${
              (value || 'normal') === opt.v
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'border-border hover:bg-accent hover:border-ring'
            }`}
            style={{ fontWeight: opt.v }}
          >
            {opt.l}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Alignment Selector ───
export function AlignmentSelector({ value, onChange, label = 'Alignement' }: { value: string; onChange: (v: string) => void; label?: string }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="flex gap-1 mt-1">
        {['left', 'center', 'right'].map((align) => (
          <button
            key={align}
            onClick={() => onChange(align)}
            className={`flex-1 h-8 text-xs rounded-md border transition-colors capitalize ${
              (value || 'left') === align
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'border-border hover:bg-accent hover:border-ring'
            }`}
          >
            {align}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Styled Select (custom dropdown, replaces native <select>) ───
export function StyledSelect({ value, onChange, options, label, placeholder }: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  label?: string;
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const current = options.find(o => o.value === value);

  return (
    <div>
      {label && <Label className="text-xs">{label}</Label>}
      <div className="relative mt-1">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full h-9 rounded-xl border border-border bg-background text-xs px-3 text-left flex items-center justify-between shadow-sm hover:border-ring transition-all"
        >
          <span className="truncate">{current?.label || placeholder || value}</span>
          <span className="text-muted-foreground ml-1 text-[10px]">▾</span>
        </button>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <div className="absolute top-10 left-0 z-50 w-full max-h-52 overflow-y-auto rounded-xl border border-border bg-popover shadow-[0_8px_24px_rgba(0,0,0,0.12)] py-1">
              {options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { onChange(opt.value); setIsOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors ${
                    value === opt.value ? 'bg-accent font-medium' : ''
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Line Height Selector ───
export function LineHeightSelector({ value, onChange, label = 'Interlignage' }: { value: string; onChange: (v: string) => void; label?: string }) {
  return (
    <StyledSelect
      label={label}
      value={value || '1.5'}
      onChange={onChange}
      options={[
        { value: '1', label: '1 (serré)' },
        { value: '1.25', label: '1.25' },
        { value: '1.5', label: '1.5 (normal)' },
        { value: '1.75', label: '1.75' },
        { value: '2', label: '2 (aéré)' },
        { value: '2.5', label: '2.5' },
      ]}
    />
  );
}

// ─── Letter Spacing Selector ───
export function LetterSpacingSelector({ value, onChange, label = 'Espacement des lettres' }: { value: string; onChange: (v: string) => void; label?: string }) {
  return (
    <StyledSelect
      label={label}
      value={value || '0px'}
      onChange={onChange}
      options={[
        { value: '-1px', label: '-1px (serré)' },
        { value: '-0.5px', label: '-0.5px' },
        { value: '0px', label: '0px (normal)' },
        { value: '0.5px', label: '0.5px' },
        { value: '1px', label: '1px' },
        { value: '2px', label: '2px' },
        { value: '3px', label: '3px (large)' },
        { value: '5px', label: '5px' },
      ]}
    />
  );
}

// ─── Text Style Fields (shared by heading, text, button) ───
export function TextStyleFields({
  block,
  updateStyle,
}: {
  block: BlockData;
  updateStyle: (key: string, value: string) => void;
}) {
  return (
    <>
      <FontSizeSelector value={block.styles.fontSize} onChange={(v) => updateStyle('fontSize', v)} />
      <FontFamilySelector value={block.styles.fontFamily} onChange={(v) => updateStyle('fontFamily', v)} />
      <FontWeightSelector value={block.styles.fontWeight} onChange={(v) => updateStyle('fontWeight', v)} />
      <ColorPicker label="Couleur du texte" value={block.styles.color || '#000000'} onChange={(c) => updateStyle('color', c)} />
      <AlignmentSelector value={block.styles.textAlign} onChange={(v) => updateStyle('textAlign', v)} />
      <LineHeightSelector value={block.styles.lineHeight} onChange={(v) => updateStyle('lineHeight', v)} />
      <LetterSpacingSelector value={block.styles.letterSpacing} onChange={(v) => updateStyle('letterSpacing', v)} />
    </>
  );
}
