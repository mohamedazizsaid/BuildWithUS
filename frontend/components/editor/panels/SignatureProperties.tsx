'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BlockData } from '@/lib/editor-types';
import { ColorPicker, AccordionSection } from './shared';
import { FontSizeSelector, AlignmentSelector, StyledSelect } from './FontSelectors';

// ─── Signature Properties ───
export function SignatureBlockProperties({
  block, updateContent, updateStyle,
}: {
  block: BlockData;
  updateContent: (key: string, value: string) => void;
  updateStyle: (key: string, value: string) => void;
}) {
  const [openSection, setOpenSection] = useState<string | null>('content');

  return (
    <div className="space-y-1">
      <AccordionSection openSection={openSection} setOpenSection={setOpenSection} id="content" title="Contenu">
        <div>
          <Label className="text-xs">Nom</Label>
          <Input value={block.content.name as string || ''} onChange={(e) => updateContent('name', e.target.value)} className="h-8 text-xs mt-1" placeholder="Prénom Nom" />
        </div>
        <div>
          <Label className="text-xs">Titre / Fonction</Label>
          <Input value={block.content.title as string || ''} onChange={(e) => updateContent('title', e.target.value)} className="h-8 text-xs mt-1" placeholder="Directeur, Développeur..." />
        </div>
        <div>
          <Label className="text-xs">Email</Label>
          <Input value={block.content.email as string || ''} onChange={(e) => updateContent('email', e.target.value)} className="h-8 text-xs mt-1" placeholder="nom@entreprise.com" />
        </div>
        <div>
          <Label className="text-xs">Téléphone</Label>
          <Input value={block.content.phone as string || ''} onChange={(e) => updateContent('phone', e.target.value)} className="h-8 text-xs mt-1" placeholder="+33 6 12 34 56 78" />
        </div>
      </AccordionSection>

      <AccordionSection openSection={openSection} setOpenSection={setOpenSection} id="style" title="Style">
        <FontSizeSelector value={block.styles.fontSize || '14px'} onChange={(v) => updateStyle('fontSize', v)} />
        <ColorPicker label="Couleur du texte" value={block.styles.color || '#333333'} onChange={(c) => updateStyle('color', c)} />
        <ColorPicker label="Couleur de la ligne" value={block.styles.lineColor || '#000000'} onChange={(c) => updateStyle('lineColor', c)} />
        <StyledSelect
          label="Largeur de la ligne"
          value={block.styles.lineWidth || '200px'}
          onChange={(v) => updateStyle('lineWidth', v)}
          options={[
            { value: '100px', label: 'Courte (100px)' },
            { value: '150px', label: 'Moyenne (150px)' },
            { value: '200px', label: 'Normale (200px)' },
            { value: '300px', label: 'Large (300px)' },
            { value: '100%', label: 'Pleine largeur' },
          ]}
        />
        <AlignmentSelector label="Placement" value={block.styles.textAlign || 'left'} onChange={(v) => updateStyle('textAlign', v)} />
      </AccordionSection>

      <AccordionSection openSection={openSection} setOpenSection={setOpenSection} id="spacing" title="Espacement">
        <StyledSelect
          label="Marge intérieure"
          value={block.styles.padding || '20px 10px'}
          onChange={(v) => updateStyle('padding', v)}
          options={[
            { value: '10px', label: 'Petit (10px)' },
            { value: '20px 10px', label: 'Normal (20px 10px)' },
            { value: '24px', label: 'Grand (24px)' },
            { value: '32px', label: 'Extra (32px)' },
          ]}
        />
      </AccordionSection>
    </div>
  );
}
