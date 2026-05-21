'use client';

import React, { useState } from 'react';
import { Type, LayoutGrid, ImageIcon, ArrowLeft, Trash2, LayoutTemplate, Sparkles, ChevronLeft, ChevronRight, Heading, AlignLeft, Video, MousePointerClick, Minus, Table2, PenLine, Share2, Menu as MenuIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  BlockType,
  BlockData,
  LAYOUT_OPTIONS,
  RowLayout,
  GlobalStyles,
} from '@/lib/editor-types';

import { Row } from '@/lib/editor-types';

// ─── Panel imports ───
import { ColorPicker, SectionHeader, NumericInput, Toggle, AccordionSection, resolveBlockPadding, resolveBlockMargin } from './panels/shared';
import { FontWeightSelector, AlignmentSelector, StyledSelect, LineHeightSelector, LetterSpacingSelector, TextStyleFields } from './panels/FontSelectors';
import { PhotosPanel } from './panels/PhotosPanel';
import { AiPanel } from './panels/AiPanel';
import { SectionsPanel } from './panels/SectionsPanel';
import { CorpsPanel } from './panels/CorpsPanel';
import { SectionProperties } from './panels/SectionProperties';
import { ImageBlockProperties } from './panels/ImageProperties';
import { VideoBlockProperties } from './panels/VideoProperties';
import { TableBlockProperties } from './panels/TableProperties';
import { SignatureBlockProperties } from './panels/SignatureProperties';
import { SocialBlockProperties } from './panels/SocialProperties';
import { DividerBlockProperties } from './panels/DividerProperties';
import { MenuBlockProperties } from './panels/MenuProperties';

type PanelTab = 'contenu' | 'blocs' | 'photos' | 'sections' | 'ai';

interface LeftPanelProps {
  onAddRow: (layout: RowLayout) => void;
  onAddBlock: (columnId: string, type: BlockType) => void;
  onAddBlockToNewRow: (type: BlockType) => void;
  onAddSection: (rows: Row[]) => void;
  onAiGenerate: (mjml: string) => void;
  activeColumnId: string | null;
}

interface PropertiesPanelProps {
  selectedBlock: BlockData | null;
  selectedRow: Row | null;
  globalStyles: GlobalStyles;
  onUpdateBlock: (blockId: string, updates: Partial<BlockData>) => void;
  onRemoveBlock: (blockId: string) => void;
  onUpdateGlobalStyles: (styles: Partial<GlobalStyles>) => void;
  onUpdateRowStyles: (rowId: string, styles: Record<string, string>) => void;
  onDeselectBlock: () => void;
}

const BLOCK_ITEMS: { type: BlockType; label: string; icon: React.ElementType }[] = [
  { type: 'heading',   label: 'Titre',      icon: Heading           },
  { type: 'text',      label: 'Paragraphe', icon: AlignLeft         },
  { type: 'image',     label: 'Image',      icon: ImageIcon         },
  { type: 'video',     label: 'Vidéo',      icon: Video             },
  { type: 'button',    label: 'Bouton',     icon: MousePointerClick },
  { type: 'divider',   label: 'Séparateur', icon: Minus             },
  { type: 'table',     label: 'Tableau',    icon: Table2            },
  { type: 'signature', label: 'Signature',  icon: PenLine           },
  { type: 'social',    label: 'Réseaux',    icon: Share2            },
  { type: 'menu',      label: 'Menu',       icon: MenuIcon          },
];

// ─── Left Panel (content tabs — sits on the LEFT of the canvas) ───────────────

export function LeftPanel({
  onAddRow,
  onAddBlock,
  onAddBlockToNewRow,
  onAddSection,
  onAiGenerate,
  activeColumnId,
}: LeftPanelProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>('contenu');
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`h-full flex border-r border-border transition-all duration-200 ${collapsed ? 'w-12' : 'w-[340px]'}`}>
      {/* Tab strip — left edge */}
      <div className="w-12 bg-muted/50 border-r border-border flex flex-col items-center py-2 gap-1 shrink-0">
        {/* Collapse toggle — top */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="w-10 h-10 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground/80 transition-colors"
          title={collapsed ? 'Ouvrir le panneau' : 'Fermer le panneau'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        <div className="w-8 border-b border-border mb-1" />

        {([
          { key: 'contenu'  , icon: Type,           title: 'Contenu'      },
          { key: 'blocs'    , icon: LayoutGrid,     title: 'Dispositions' },
          { key: 'photos'   , icon: ImageIcon,      title: 'Photos'       },
          { key: 'sections' , icon: LayoutTemplate, title: 'Sections'     },
          { key: 'ai'       , icon: Sparkles,       title: 'IA'           },
        ] as { key: PanelTab; icon: React.ElementType; title: string }[]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setCollapsed(false); }}
            className={`w-10 h-10 rounded-md flex items-center justify-center transition-colors ${
              activeTab === tab.key && !collapsed
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground/80'
            }`}
            title={tab.title}
          >
            <tab.icon size={16} />
          </button>
        ))}
      </div>

      {/* Panel content — hidden when collapsed */}
      {!collapsed && (
        <div className="flex-1 bg-background overflow-y-auto min-w-0">
          <div className="p-4">
            {activeTab === 'contenu' && (
              <ContenuPanel
                onAddBlock={onAddBlock}
                onAddBlockToNewRow={onAddBlockToNewRow}
                activeColumnId={activeColumnId}
              />
            )}
            {activeTab === 'blocs' && (
              <BlocsPanel onAddRow={onAddRow} />
            )}
            {activeTab === 'photos' && (
              <PhotosPanel />
            )}
            {activeTab === 'sections' && (
              <SectionsPanel onAddSection={onAddSection} />
            )}
            {activeTab === 'ai' && (
              <AiPanel onGenerate={onAiGenerate} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Properties Panel (sits on the RIGHT of the canvas) ──────────────────────

export function PropertiesPanel({
  selectedBlock,
  selectedRow,
  globalStyles,
  onUpdateBlock,
  onRemoveBlock,
  onUpdateGlobalStyles,
  onUpdateRowStyles,
  onDeselectBlock,
}: PropertiesPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`h-full flex border-l border-border transition-all duration-200 ${collapsed ? 'w-8' : 'w-[280px]'}`}>
      {/* Thin toggle strip — always visible on the left edge of this panel */}
      <div className="w-8 shrink-0 bg-muted/50 border-r border-border flex flex-col items-center justify-start pt-2">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground/80 transition-colors"
          title={collapsed ? 'Ouvrir les propriétés' : 'Fermer les propriétés'}
        >
          {collapsed ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
        </button>
      </div>

      {/* Content — disappears when collapsed */}
      {!collapsed && (
        <div className="flex-1 overflow-y-auto bg-background min-w-0">
          <div className="p-4">
            {selectedBlock ? (
              <>
                <button
                  onClick={onDeselectBlock}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
                >
                  <ArrowLeft size={14} />
                  Retour
                </button>
                <h3 className="text-sm font-semibold text-foreground mb-4 capitalize">
                  {selectedBlock.type} — Propriétés
                </h3>
                <BlockProperties
                  block={selectedBlock}
                  onUpdate={(updates) => onUpdateBlock(selectedBlock.id, updates)}
                />
                <div className="mt-6 pt-4 border-t border-border">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onRemoveBlock(selectedBlock.id)}
                    className="w-full gap-1.5"
                  >
                    <Trash2 size={14} />
                    Supprimer le bloc
                  </Button>
                </div>
              </>
            ) : selectedRow ? (
              <SectionProperties
                row={selectedRow}
                onUpdateStyles={(styles) => onUpdateRowStyles(selectedRow.id, styles)}
              />
            ) : (
              <CorpsPanel
                globalStyles={globalStyles}
                onUpdateGlobalStyles={onUpdateGlobalStyles}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Keep default export for any other imports
export default LeftPanel;

// ─── Contenu Panel ───
function ContenuPanel({
  onAddBlock,
  onAddBlockToNewRow,
  activeColumnId,
}: {
  onAddBlock: (columnId: string, type: BlockType) => void;
  onAddBlockToNewRow: (type: BlockType) => void;
  activeColumnId: string | null;
}) {
  const handleAdd = (type: BlockType) => {
    if (activeColumnId) {
      onAddBlock(activeColumnId, type);
    } else {
      onAddBlockToNewRow(type);
    }
  };

  return (
    <div>
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Contenu</h3>
      <div className="grid grid-cols-2 gap-2">
        {BLOCK_ITEMS.map((item) => (
          <div
            key={item.type}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('blockType', item.type);
              e.dataTransfer.effectAllowed = 'copy';
            }}
            onClick={() => handleAdd(item.type)}
            className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-border hover:border-border hover:bg-muted/50 transition-all text-center cursor-grab active:cursor-grabbing"
          >
            <item.icon size={18} className="text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Blocs Panel ───
function BlocsPanel({ onAddRow }: { onAddRow: (layout: RowLayout) => void }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Dispositions</h3>
      <div className="flex flex-col gap-2">
        {LAYOUT_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => onAddRow(option.value)}
            title={option.label}
            className="group flex gap-1 w-full h-12 p-2 rounded-xl border border-border bg-background hover:border-primary/50 hover:bg-primary/5 hover:shadow-sm transition-all cursor-pointer"
          >
            {option.widths.map((width, i) => (
              <div
                key={i}
                className="h-full rounded bg-muted group-hover:bg-primary/20 transition-colors flex items-center justify-center"
                style={{ flex: parseFloat(width) }}
              >
                <span className="text-[9px] font-medium text-muted-foreground group-hover:text-primary/70 transition-colors leading-none">
                  {Math.round(parseFloat(width))}
                </span>
              </div>
            ))}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Block Properties ───
function BlockProperties({
  block,
  onUpdate,
}: {
  block: BlockData;
  onUpdate: (updates: Partial<BlockData>) => void;
}) {
  const [openSection, setOpenSection] = useState<string | null>('layout');

  const updateContent = (key: string, value: string) => {
    onUpdate({ content: { ...block.content, [key]: value } });
  };

  const updateStyle = (key: string, value: string) => {
    onUpdate({ styles: { ...block.styles, [key]: value } });
  };

  const updateStyles = (updates: Record<string, string>) => {
    onUpdate({ styles: { ...block.styles, ...updates } });
  };

  const isHeadingOrText = block.type === 'heading' || block.type === 'text';
  const isTextLike = block.type === 'heading' || block.type === 'text' || block.type === 'button';
  const padding = resolveBlockPadding(block.styles);
  const margin = resolveBlockMargin(block.styles);
  const paddingGrouped = block.styles.paddingGroup === 'true'
    || (!block.styles.paddingGroup && padding.top === padding.right && padding.top === padding.bottom && padding.top === padding.left);

  return (
    <div className="space-y-4">
      {/* Content fields */}
      {(block.type === 'heading' || block.type === 'text') && (
        <div>
          <Label className="text-xs">Contenu</Label>
          <textarea
            value={block.content.text as string}
            onChange={(e) => updateContent('text', e.target.value)}
            className="w-full mt-1 rounded-md border border-border text-sm p-2 min-h-[80px] resize-y"
          />
        </div>
      )}

      {block.type === 'button' && (
        <>
          <div>
            <Label className="text-xs">Texte du bouton</Label>
            <Input
              value={block.content.text as string}
              onChange={(e) => updateContent('text', e.target.value)}
              className="h-8 text-xs mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Lien URL</Label>
            <Input
              value={block.content.href as string}
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
        </>
      )}

      {block.type === 'image' && (
        <ImageBlockProperties block={block} updateContent={updateContent} updateStyle={updateStyle} updateStyles={updateStyles} />
      )}

      {block.type === 'video' && (
        <VideoBlockProperties block={block} updateContent={updateContent} updateStyle={updateStyle} onUpdate={onUpdate} />
      )}

      {block.type === 'divider' && (
        <DividerBlockProperties block={block} updateStyle={updateStyle} updateStyles={updateStyles} />
      )}

      {block.type === 'table' && (
        <TableBlockProperties block={block} onUpdate={onUpdate} updateStyle={updateStyle} />
      )}

      {block.type === 'signature' && (
        <SignatureBlockProperties block={block} updateContent={updateContent} updateStyle={updateStyle} />
      )}

      {block.type === 'social' && (
        <SocialBlockProperties block={block} onUpdate={onUpdate} />
      )}

      {block.type === 'menu' && (
        <MenuBlockProperties block={block} onUpdate={onUpdate} />
      )}

      {isHeadingOrText && (
        <div className="pt-2 border-t border-border space-y-3">
          <AccordionSection openSection={openSection} setOpenSection={setOpenSection} id="layout" title="Mise en page">
            <AlignmentSelector
              label="Alignement du bloc"
              value={block.styles.blockAlign || 'left'}
              onChange={(v) => updateStyle('blockAlign', v)}
            />
            <AlignmentSelector
              label="Alignement du texte"
              value={block.styles.textAlign || 'left'}
              onChange={(v) => updateStyle('textAlign', v)}
            />
            <LineHeightSelector
              label="Interlignage"
              value={block.styles.lineHeight || '1.5'}
              onChange={(v) => updateStyle('lineHeight', v)}
            />
            <LetterSpacingSelector
              label="Espacement"
              value={block.styles.letterSpacing || '0px'}
              onChange={(v) => updateStyle('letterSpacing', v)}
            />
            <div>
              <Toggle
                label="Grouper les côtés"
                value={paddingGrouped}
                onChange={(v) => {
                  if (v) {
                    updateStyles({
                      paddingGroup: 'true',
                      paddingTop: padding.top,
                      paddingRight: padding.top,
                      paddingBottom: padding.top,
                      paddingLeft: padding.top,
                      padding: padding.top,
                    });
                  } else {
                    updateStyles({ paddingGroup: 'false' });
                  }
                }}
              />
              {paddingGrouped ? (
                <div className="mt-2">
                  <Label className="text-xs">Marge intérieure</Label>
                  <NumericInput
                    value={padding.top}
                    onChange={(v) => updateStyles({ paddingTop: v, paddingRight: v, paddingBottom: v, paddingLeft: v, padding: v })}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Haut</Label>
                    <NumericInput value={padding.top} onChange={(v) => updateStyles({ paddingTop: v, padding: `${v} ${padding.right} ${padding.bottom} ${padding.left}` })} />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Droite</Label>
                    <NumericInput value={padding.right} onChange={(v) => updateStyles({ paddingRight: v, padding: `${padding.top} ${v} ${padding.bottom} ${padding.left}` })} />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Bas</Label>
                    <NumericInput value={padding.bottom} onChange={(v) => updateStyles({ paddingBottom: v, padding: `${padding.top} ${padding.right} ${v} ${padding.left}` })} />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Gauche</Label>
                    <NumericInput value={padding.left} onChange={(v) => updateStyles({ paddingLeft: v, padding: `${padding.top} ${padding.right} ${padding.bottom} ${v}` })} />
                  </div>
                </div>
              )}
            </div>
          </AccordionSection>

          <AccordionSection openSection={openSection} setOpenSection={setOpenSection} id="text" title="Styles du texte">
            <FontWeightSelector value={block.styles.fontWeight || 'normal'} onChange={(v) => updateStyle('fontWeight', v)} />
          </AccordionSection>

          <AccordionSection openSection={openSection} setOpenSection={setOpenSection} id="margin" title="Marge">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Verticale</Label>
                <NumericInput
                  value={block.styles.marginY || margin.top}
                  onChange={(v) => updateStyles({ marginY: v, margin: `${v} ${block.styles.marginX || margin.right}` })}
                />
              </div>
              <div>
                <Label className="text-xs">Horizontale</Label>
                <NumericInput
                  value={block.styles.marginX || margin.right}
                  onChange={(v) => updateStyles({ marginX: v, margin: `${block.styles.marginY || margin.top} ${v}` })}
                />
              </div>
            </div>
          </AccordionSection>

          <AccordionSection openSection={openSection} setOpenSection={setOpenSection} id="background" title="Fond">
            <ColorPicker label="Couleur" value={block.styles.backgroundColor || '#ffffff'} onChange={(c) => updateStyle('backgroundColor', c)} />
            <SectionHeader>Image</SectionHeader>
            <div>
              <Label className="text-xs">URL de l&apos;image</Label>
              <Input
                value={block.styles.backgroundImage || ''}
                onChange={(e) => updateStyle('backgroundImage', e.target.value)}
                className="h-8 text-xs mt-1"
                placeholder="https://..."
              />
            </div>
          </AccordionSection>

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
                { value: 'double', label: 'Double' },
              ]}
            />
            <ColorPicker label="Couleur" value={block.styles.borderColor || '#e2e8f0'} onChange={(c) => updateStyle('borderColor', c)} />
            <StyledSelect
              label="Angles arrondis"
              value={block.styles.borderRadius || '0px'}
              onChange={(v) => updateStyle('borderRadius', v)}
              options={[
                { value: '0px', label: 'Carré' },
                { value: '4px', label: 'Léger (4px)' },
                { value: '6px', label: 'Arrondi (6px)' },
                { value: '12px', label: 'Plus (12px)' },
                { value: '16px', label: 'Grand (16px)' },
                { value: '24px', label: 'Pilule (24px)' },
                { value: '9999px', label: 'Pilule complète' },
              ]}
            />
          </AccordionSection>
        </div>
      )}

      {/* Typography (consistent for heading, text, button) */}
      {isTextLike && !isHeadingOrText && (
        <div className="pt-2 border-t border-border space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase">Typographie</h4>
          <TextStyleFields block={block} updateStyle={updateStyle} />
        </div>
      )}

      {/* Button specific styles */}
      {block.type === 'button' && (
        <div className="pt-2 border-t border-border space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase">Style du bouton</h4>
          <ColorPicker label="Background" value={block.styles.backgroundColor || '#0f172a'} onChange={(c) => updateStyle('backgroundColor', c)} />
          <StyledSelect
            label="Rayon de bordure"
            value={block.styles.borderRadius || '6px'}
            onChange={(v) => updateStyle('borderRadius', v)}
            options={[
              { value: '0px', label: 'Carré' },
              { value: '4px', label: 'Léger (4px)' },
              { value: '6px', label: 'Arrondi (6px)' },
              { value: '12px', label: 'Plus (12px)' },
              { value: '24px', label: 'Pilule (24px)' },
              { value: '9999px', label: 'Pilule complète' },
            ]}
          />
        </div>
      )}

      {/* Spacing — only for blocks without dedicated spacing (button) */}
      {block.type === 'button' && (
      <div className="pt-2 border-t border-border space-y-3">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase">Espacement</h4>
        <StyledSelect
          label="Marge intérieure"
          value={block.styles.padding || '10px'}
          onChange={(v) => updateStyle('padding', v)}
          options={[
            { value: '0px', label: 'Aucun (0px)' },
            { value: '4px', label: 'Très petit (4px)' },
            { value: '8px', label: 'Petit (8px)' },
            { value: '10px', label: 'Normal (10px)' },
            { value: '12px 24px', label: 'Moyen (12px 24px)' },
            { value: '16px', label: 'Grand (16px)' },
            { value: '20px', label: 'Très grand (20px)' },
            { value: '24px', label: 'Extra (24px)' },
            { value: '32px', label: 'XXL (32px)' },
            { value: '10px 20px', label: 'Horizontal (10px 20px)' },
            { value: '20px 10px', label: 'Vertical (20px 10px)' },
          ]}
        />
      </div>
      )}
    </div>
  );
}
