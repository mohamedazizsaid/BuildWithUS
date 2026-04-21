'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GlobalStyles } from '@/lib/editor-types';
import { ColorPicker, SectionHeader, NumericInput, Toggle, AccordionSection } from './shared';
import { FontSelect, FontSizeSelector, FontWeightSelector, StyledSelect } from './FontSelectors';

// ─── Corps Panel ───
export function CorpsPanel({
  globalStyles,
  onUpdateGlobalStyles,
}: {
  globalStyles: GlobalStyles;
  onUpdateGlobalStyles: (styles: Partial<GlobalStyles>) => void;
}) {
  const [openSection, setOpenSection] = useState<string | null>('layout');

  return (
    <div>
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Corps du modèle</h3>

      {/* ─── 1. Mise en page ─── */}
      <AccordionSection openSection={openSection} setOpenSection={setOpenSection} id="layout" title="Mise en page">
        <div>
          <Label className="text-xs">Largeur du corps</Label>
          <NumericInput value={globalStyles.width} onChange={(v) => onUpdateGlobalStyles({ width: v })} />
        </div>
        <ColorPicker label="Couleur du corps" value={globalStyles.bodyColor} onChange={(c) => onUpdateGlobalStyles({ bodyColor: c })} />
        <div>
          <Toggle
            label="Grouper les côtés"
            value={globalStyles.paddingGroup}
            onChange={(v) => {
              if (v) {
                onUpdateGlobalStyles({ paddingGroup: true, paddingRight: globalStyles.paddingTop, paddingBottom: globalStyles.paddingTop, paddingLeft: globalStyles.paddingTop });
              } else {
                onUpdateGlobalStyles({ paddingGroup: false });
              }
            }}
          />
          {globalStyles.paddingGroup ? (
            <div className="mt-2">
              <Label className="text-xs">Marge intérieure</Label>
              <NumericInput
                value={globalStyles.paddingTop}
                onChange={(v) => onUpdateGlobalStyles({ paddingTop: v, paddingRight: v, paddingBottom: v, paddingLeft: v })}
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <Label className="text-[10px] text-muted-foreground">Haut</Label>
                <NumericInput value={globalStyles.paddingTop} onChange={(v) => onUpdateGlobalStyles({ paddingTop: v })} />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Droite</Label>
                <NumericInput value={globalStyles.paddingRight} onChange={(v) => onUpdateGlobalStyles({ paddingRight: v })} />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Bas</Label>
                <NumericInput value={globalStyles.paddingBottom} onChange={(v) => onUpdateGlobalStyles({ paddingBottom: v })} />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Gauche</Label>
                <NumericInput value={globalStyles.paddingLeft} onChange={(v) => onUpdateGlobalStyles({ paddingLeft: v })} />
              </div>
            </div>
          )}
        </div>
      </AccordionSection>

      {/* ─── 2. Fond ─── */}
      <AccordionSection openSection={openSection} setOpenSection={setOpenSection} id="background" title="Fond">
        <div>
          <Label className="text-xs">Image de fond</Label>
          <Input
            value={globalStyles.backgroundImage}
            onChange={(e) => onUpdateGlobalStyles({ backgroundImage: e.target.value })}
            placeholder="https://..."
            className="h-8 text-xs mt-1"
          />
        </div>
        {globalStyles.backgroundImage && (
          <div>
            <Label className="text-xs">Taille de l&apos;image</Label>
            <div className="flex gap-1 mt-1">
              {['cover', 'contain', 'repeat'].map((size) => (
                <button
                  key={size}
                  onClick={() => onUpdateGlobalStyles({ backgroundSize: size })}
                  className={`flex-1 h-7 text-[10px] rounded-md border transition-colors capitalize ${
                    globalStyles.backgroundSize === size ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'border-border hover:bg-accent hover:border-ring'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        )}
      </AccordionSection>

      {/* ─── 3. En-tête ─── */}
      <AccordionSection openSection={openSection} setOpenSection={setOpenSection} id="header" title="En-tête">
        <Toggle
          label="Afficher dans le navigateur"
          value={globalStyles.showBrowserLink}
          onChange={(v) => onUpdateGlobalStyles({ showBrowserLink: v })}
        />
      </AccordionSection>

      {/* ─── 4. Styles de texte ─── */}
      <AccordionSection openSection={openSection} setOpenSection={setOpenSection} id="text" title="Styles de texte">
        <SectionHeader>Paragraphe</SectionHeader>
        <div>
          <Label className="text-xs">Police</Label>
          <FontSelect value={globalStyles.fontFamily} onChange={(v) => onUpdateGlobalStyles({ fontFamily: v })} />
        </div>
        <FontSizeSelector value={globalStyles.fontSize} onChange={(v) => onUpdateGlobalStyles({ fontSize: v })} />
        <ColorPicker label="Couleur du texte" value={globalStyles.textColor} onChange={(c) => onUpdateGlobalStyles({ textColor: c })} />

        <SectionHeader>Paramètres du texte</SectionHeader>
        <StyledSelect
          label="Interlignage"
          value={globalStyles.lineHeight}
          onChange={(v) => onUpdateGlobalStyles({ lineHeight: v })}
          options={[
            { value: '1', label: '1 (serré)' },
            { value: '1.25', label: '1.25' },
            { value: '1.5', label: '1.5 (normal)' },
            { value: '1.75', label: '1.75' },
            { value: '2', label: '2 (aéré)' },
          ]}
        />
        <div>
          <Label className="text-xs">Sens de l&apos;écriture</Label>
          <div className="flex gap-1 mt-1">
            {[{ v: 'ltr', l: 'LTR ←→' }, { v: 'rtl', l: 'RTL →←' }].map((opt) => (
              <button
                key={opt.v}
                onClick={() => onUpdateGlobalStyles({ textDirection: opt.v })}
                className={`flex-1 h-8 text-xs rounded-md border transition-colors ${
                  globalStyles.textDirection === opt.v ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'border-border hover:bg-accent hover:border-ring'
                }`}
              >
                {opt.l}
              </button>
            ))}
          </div>
        </div>

        <SectionHeader>Liens</SectionHeader>
        <ColorPicker label="Couleur des liens" value={globalStyles.linkColor} onChange={(c) => onUpdateGlobalStyles({ linkColor: c })} />
        <div>
          <Label className="text-xs">Style des liens</Label>
          <div className="flex gap-1 mt-1">
            {[{ v: 'underline', l: 'Souligné' }, { v: 'none', l: 'Aucun' }].map((opt) => (
              <button
                key={opt.v}
                onClick={() => onUpdateGlobalStyles({ linkDecoration: opt.v })}
                className={`flex-1 h-8 text-xs rounded-md border transition-colors ${
                  globalStyles.linkDecoration === opt.v ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'border-border hover:bg-accent hover:border-ring'
                }`}
              >
                {opt.l}
              </button>
            ))}
          </div>
        </div>
      </AccordionSection>

      {/* ─── 5. Boutons ─── */}
      <AccordionSection openSection={openSection} setOpenSection={setOpenSection} id="buttons" title="Boutons">
        <SectionHeader>Typographie</SectionHeader>
        <div>
          <Label className="text-xs">Police</Label>
          <FontSelect value={globalStyles.btnFontFamily} onChange={(v) => onUpdateGlobalStyles({ btnFontFamily: v })} />
        </div>
        <FontSizeSelector value={globalStyles.btnFontSize} onChange={(v) => onUpdateGlobalStyles({ btnFontSize: v })} />
        <ColorPicker label="Couleur du texte" value={globalStyles.btnFontColor} onChange={(c) => onUpdateGlobalStyles({ btnFontColor: c })} />
        <FontWeightSelector value={globalStyles.btnFontWeight} onChange={(v) => onUpdateGlobalStyles({ btnFontWeight: v })} />

        <SectionHeader>Forme</SectionHeader>
        <div>
          <Label className="text-xs">Largeur</Label>
          <div className="flex gap-1 mt-1">
            {[{ v: 'auto', l: 'Auto' }, { v: '100%', l: 'Pleine' }].map((opt) => (
              <button
                key={opt.v}
                onClick={() => onUpdateGlobalStyles({ btnWidth: opt.v })}
                className={`flex-1 h-8 text-xs rounded-md border transition-colors ${
                  globalStyles.btnWidth === opt.v ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'border-border hover:bg-accent hover:border-ring'
                }`}
              >
                {opt.l}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-xs">Angles arrondis</Label>
          <NumericInput value={globalStyles.btnBorderRadius} onChange={(v) => onUpdateGlobalStyles({ btnBorderRadius: v })} />
        </div>

        <SectionHeader>Style visuel</SectionHeader>
        <ColorPicker label="Couleur de fond" value={globalStyles.btnBackgroundColor} onChange={(c) => onUpdateGlobalStyles({ btnBackgroundColor: c })} />
        <div>
          <Label className="text-xs">Bordure</Label>
          <NumericInput value={globalStyles.btnBorderSize} onChange={(v) => onUpdateGlobalStyles({ btnBorderSize: v })} />
        </div>
        <ColorPicker label="Couleur bordure" value={globalStyles.btnBorderColor} onChange={(c) => onUpdateGlobalStyles({ btnBorderColor: c })} />
      </AccordionSection>
    </div>
  );
}
