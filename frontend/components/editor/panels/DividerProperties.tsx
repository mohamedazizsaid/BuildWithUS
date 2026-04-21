'use client';

import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { BlockData } from '@/lib/editor-types';
import { ColorPicker, SectionHeader, NumericInput, Toggle, AccordionSection, resolveBlockPadding, resolveBlockMargin } from './shared';
import { StyledSelect, AlignmentSelector } from './FontSelectors';

// ─── Divider (Séparateur) Properties ───
export function DividerBlockProperties({
  block, updateStyle, updateStyles,
}: {
  block: BlockData;
  updateStyle: (key: string, value: string) => void;
  updateStyles: (updates: Record<string, string>) => void;
}) {
  const [openSection, setOpenSection] = useState<string | null>('appearance');
  const pad = resolveBlockPadding(block.styles);
  const mar = resolveBlockMargin(block.styles);
  const paddingGrouped = block.styles.paddingGroup !== 'false';

  return (
    <div className="space-y-1">
      <AccordionSection openSection={openSection} setOpenSection={setOpenSection} id="appearance" title="Apparence">
        <div>
          <Label className="text-xs">Épaisseur</Label>
          <NumericInput value={block.styles.borderWidth || '1px'} onChange={(v) => updateStyle('borderWidth', v)} />
        </div>
        <ColorPicker label="Couleur" value={block.styles.borderColor || '#e2e8f0'} onChange={(c) => updateStyle('borderColor', c)} />
        <StyledSelect
          label="Style"
          value={block.styles.borderStyle || 'solid'}
          onChange={(v) => updateStyle('borderStyle', v)}
          options={[
            { value: 'solid', label: 'Plein' },
            { value: 'dashed', label: 'Tirets' },
            { value: 'dotted', label: 'Pointillés' },
            { value: 'double', label: 'Double' },
          ]}
        />
      </AccordionSection>

      <AccordionSection openSection={openSection} setOpenSection={setOpenSection} id="layout" title="Mise en page">
        <StyledSelect
          label="Largeur"
          value={block.styles.width || '100%'}
          onChange={(v) => updateStyle('width', v)}
          options={[
            { value: '25%', label: '25%' },
            { value: '50%', label: '50%' },
            { value: '75%', label: '75%' },
            { value: '100%', label: '100%' },
          ]}
        />
        <AlignmentSelector label="Alignement du bloc" value={block.styles.textAlign || 'center'} onChange={(v) => updateStyle('textAlign', v)} />
      </AccordionSection>

      <AccordionSection openSection={openSection} setOpenSection={setOpenSection} id="spacing" title="Espacement">
        <SectionHeader>Marge intérieure</SectionHeader>
        <Toggle
          label="Grouper les côtés"
          value={paddingGrouped}
          onChange={(v) => {
            if (v) updateStyles({ paddingGroup: 'true', paddingTop: pad.top, paddingRight: pad.top, paddingBottom: pad.top, paddingLeft: pad.top, padding: pad.top });
            else updateStyles({ paddingGroup: 'false' });
          }}
        />
        {paddingGrouped ? (
          <NumericInput value={pad.top} onChange={(v) => updateStyles({ paddingTop: v, paddingRight: v, paddingBottom: v, paddingLeft: v, padding: v })} />
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-[10px] text-muted-foreground">Haut</Label><NumericInput value={pad.top} onChange={(v) => updateStyles({ paddingTop: v })} /></div>
            <div><Label className="text-[10px] text-muted-foreground">Droite</Label><NumericInput value={pad.right} onChange={(v) => updateStyles({ paddingRight: v })} /></div>
            <div><Label className="text-[10px] text-muted-foreground">Bas</Label><NumericInput value={pad.bottom} onChange={(v) => updateStyles({ paddingBottom: v })} /></div>
            <div><Label className="text-[10px] text-muted-foreground">Gauche</Label><NumericInput value={pad.left} onChange={(v) => updateStyles({ paddingLeft: v })} /></div>
          </div>
        )}
        <SectionHeader>Marge</SectionHeader>
        <div className="grid grid-cols-2 gap-2">
          <div><Label className="text-xs">Verticale</Label><NumericInput value={mar.top} onChange={(v) => updateStyles({ marginY: v, margin: `${v} ${mar.right}` })} /></div>
          <div><Label className="text-xs">Horizontale</Label><NumericInput value={mar.right} onChange={(v) => updateStyles({ marginX: v, margin: `${mar.top} ${v}` })} /></div>
        </div>
      </AccordionSection>
    </div>
  );
}
