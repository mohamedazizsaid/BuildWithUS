'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// ─── Preset Colors ───
export const PRESET_COLORS = [
  '#000000', '#333333', '#555555', '#777777', '#999999', '#cccccc', '#ffffff',
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6',
  '#ec4899', '#f43f5e', '#fb923c', '#fbbf24', '#4ade80', '#2dd4bf', '#60a5fa', '#a78bfa',
  '#fecdd3', '#fed7aa', '#fef08a', '#bbf7d0', '#a5f3fc', '#bfdbfe', '#ddd6fe', '#f1f5f9',
];

// ─── Color Picker ───
export function ColorPicker({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (color: string) => void;
  label: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="flex gap-2 mt-1 relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-9 h-9 rounded-xl border border-border cursor-pointer shadow-sm hover:shadow-md hover:border-ring transition-all flex-shrink-0"
          style={{ backgroundColor: value }}
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 text-xs rounded-xl"
        />
        {isOpen && (
          <div className="absolute top-11 left-0 z-50 bg-popover rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.12)] border border-border p-3 w-60">
            <div className="grid grid-cols-7 gap-1.5 mb-3">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => { onChange(color); setIsOpen(false); }}
                  className={`w-7 h-7 rounded-lg border transition-all hover:scale-110 ${
                    value === color ? 'ring-2 ring-primary ring-offset-1' : 'border-border/50'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <div className="flex gap-2 items-center border-t border-border/60 pt-2">
              <input
                type="color"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-7 h-7 rounded-lg cursor-pointer border-0 p-0"
              />
              <span className="text-[10px] text-muted-foreground">Custom color</span>
            </div>
          </div>
        )}
      </div>
      {isOpen && <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />}
    </div>
  );
}

// ─── Section Header ───
export function SectionHeader({ children }: { children: React.ReactNode }) {
  return <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pt-3 pb-1 border-t border-border/60 first:border-0 first:pt-0">{children}</h4>;
}

// ─── Parse Box Value ───
export function parseBoxValue(value: string | undefined) {
  if (!value) {
    return { top: '0px', right: '0px', bottom: '0px', left: '0px' };
  }
  const parts = value.trim().split(/\s+/);
  if (parts.length === 1) {
    return { top: parts[0], right: parts[0], bottom: parts[0], left: parts[0] };
  }
  if (parts.length === 2) {
    return { top: parts[0], right: parts[1], bottom: parts[0], left: parts[1] };
  }
  if (parts.length === 3) {
    return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[1] };
  }
  return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[3] };
}

// ─── Resolve Block Padding ───
export function resolveBlockPadding(styles: Record<string, string>) {
  if (styles.paddingTop || styles.paddingRight || styles.paddingBottom || styles.paddingLeft) {
    return {
      top: styles.paddingTop || '0px',
      right: styles.paddingRight || styles.paddingTop || '0px',
      bottom: styles.paddingBottom || styles.paddingTop || '0px',
      left: styles.paddingLeft || styles.paddingRight || styles.paddingTop || '0px',
    };
  }
  return parseBoxValue(styles.padding);
}

// ─── Resolve Block Margin ───
export function resolveBlockMargin(styles: Record<string, string>) {
  if (styles.marginTop || styles.marginRight || styles.marginBottom || styles.marginLeft) {
    return {
      top: styles.marginTop || '0px',
      right: styles.marginRight || styles.marginTop || '0px',
      bottom: styles.marginBottom || styles.marginTop || '0px',
      left: styles.marginLeft || styles.marginRight || styles.marginTop || '0px',
    };
  }
  if (styles.marginY || styles.marginX) {
    return {
      top: styles.marginY || '0px',
      right: styles.marginX || '0px',
      bottom: styles.marginY || '0px',
      left: styles.marginX || '0px',
    };
  }
  return parseBoxValue(styles.margin);
}

// ─── Numeric Input with suffix ───
export function NumericInput({ value, onChange, suffix = 'px' }: { value: string; onChange: (v: string) => void; suffix?: string }) {
  const num = parseInt(value) || 0;
  return (
    <div className="flex items-center h-9 rounded-xl border border-border overflow-hidden shadow-sm hover:border-ring transition-all">
      <input
        type="number"
        min={0}
        value={num}
        onChange={(e) => { const v = Math.max(0, parseInt(e.target.value) || 0); onChange(`${v}${suffix}`); }}
        className="flex-1 h-full text-xs px-3 border-0 outline-none w-16 bg-background"
      />
      <span className="text-[10px] text-muted-foreground px-2.5 bg-muted/30 h-full flex items-center border-l border-border">{suffix}</span>
    </div>
  );
}

// ─── Spacing Control ───
// Independent Haut/Bas/Gauche/Droite padding inputs (with a grouped shortcut).
// Always writes BOTH the individual paddingTop/Right/Bottom/Left AND the `padding`
// shorthand, because the MJML/HTML export reads the shorthand. Padding is email-safe
// (unlike margin, which most email clients ignore), so this is the reliable way to
// tighten or loosen the vertical gap around any block.
export function SpacingControl({
  styles,
  updateStyles,
  groupedLabel = 'Marge intérieure',
  defaultValue = '10px',
}: {
  styles: Record<string, string>;
  updateStyles: (updates: Record<string, string>) => void;
  groupedLabel?: string;
  defaultValue?: string;
}) {
  const hasPadding = styles.paddingTop || styles.paddingRight || styles.paddingBottom || styles.paddingLeft || styles.padding;
  const pad = resolveBlockPadding(hasPadding ? styles : { padding: defaultValue });
  const grouped = styles.paddingGroup === 'true'
    || (!styles.paddingGroup && pad.top === pad.right && pad.top === pad.bottom && pad.top === pad.left);
  return (
    <div>
      <Toggle
        label="Grouper les côtés"
        value={grouped}
        onChange={(v) => {
          if (v) updateStyles({ paddingGroup: 'true', paddingTop: pad.top, paddingRight: pad.top, paddingBottom: pad.top, paddingLeft: pad.top, padding: pad.top });
          else updateStyles({ paddingGroup: 'false' });
        }}
      />
      {grouped ? (
        <div className="mt-2">
          <Label className="text-xs">{groupedLabel}</Label>
          <NumericInput value={pad.top} onChange={(v) => updateStyles({ paddingTop: v, paddingRight: v, paddingBottom: v, paddingLeft: v, padding: v })} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div><Label className="text-[10px] text-muted-foreground">Haut</Label><NumericInput value={pad.top} onChange={(v) => updateStyles({ paddingTop: v, padding: `${v} ${pad.right} ${pad.bottom} ${pad.left}` })} /></div>
          <div><Label className="text-[10px] text-muted-foreground">Droite</Label><NumericInput value={pad.right} onChange={(v) => updateStyles({ paddingRight: v, padding: `${pad.top} ${v} ${pad.bottom} ${pad.left}` })} /></div>
          <div><Label className="text-[10px] text-muted-foreground">Bas</Label><NumericInput value={pad.bottom} onChange={(v) => updateStyles({ paddingBottom: v, padding: `${pad.top} ${pad.right} ${v} ${pad.left}` })} /></div>
          <div><Label className="text-[10px] text-muted-foreground">Gauche</Label><NumericInput value={pad.left} onChange={(v) => updateStyles({ paddingLeft: v, padding: `${pad.top} ${pad.right} ${pad.bottom} ${v}` })} /></div>
        </div>
      )}
    </div>
  );
}

// ─── Toggle Switch ───
export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="flex items-center justify-between">
      <Label className="text-xs">{label}</Label>
      <button
        onClick={() => onChange(!value)}
        className={`w-10 h-[22px] rounded-full transition-all relative shadow-inner ${value ? 'bg-primary' : 'bg-muted border border-border'}`}
      >
        <div className={`w-4 h-4 rounded-full bg-white shadow-sm absolute top-[3px] transition-all ${value ? 'left-[21px]' : 'left-[3px]'}`} />
      </button>
    </div>
  );
}

// ─── Collapsible Section ───
export function AccordionSection({
  id, title, openSection, setOpenSection, children,
}: {
  id: string; title: string; openSection: string | null; setOpenSection: (v: string | null) => void; children: React.ReactNode;
}) {
  const isOpen = openSection === id;
  return (
    <div className="border-b border-border/60 last:border-0">
      <button
        onClick={() => setOpenSection(isOpen ? null : id)}
        className="w-full flex items-center justify-between py-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
      >
        {title}
        <span className={`text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {isOpen && <div className="pb-3 space-y-3">{children}</div>}
    </div>
  );
}
