'use client';

import { useState, useRef } from 'react';
import { Type, LayoutGrid, Palette, ImageIcon, ArrowLeft, Trash2 } from 'lucide-react';
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

type PanelTab = 'contenu' | 'blocs' | 'corps' | 'photos';

interface RightPanelProps {
  selectedBlock: BlockData | null;
  globalStyles: GlobalStyles;
  onAddRow: (layout: RowLayout) => void;
  onAddBlock: (columnId: string, type: BlockType) => void;
  onAddBlockToNewRow: (type: BlockType) => void;
  onUpdateBlock: (blockId: string, updates: Partial<BlockData>) => void;
  onRemoveBlock: (blockId: string) => void;
  onUpdateGlobalStyles: (styles: Partial<GlobalStyles>) => void;
  onDeselectBlock: () => void;
  activeColumnId: string | null;
}

const BLOCK_ITEMS: { type: BlockType; label: string; icon: string }[] = [
  { type: 'heading', label: 'Titre', icon: '📄' },
  { type: 'text', label: 'Paragraphe', icon: '📝' },
  { type: 'image', label: 'Image', icon: '🖼️' },
  { type: 'video', label: 'Vidéo', icon: '🎬' },
  { type: 'button', label: 'Bouton', icon: '🔘' },
  { type: 'divider', label: 'Séparateur', icon: '➖' },
  { type: 'table', label: 'Tableau', icon: '📊' },
  { type: 'signature', label: 'Signature', icon: '✍️' },
];

export default function RightPanel({
  selectedBlock,
  globalStyles,
  onAddRow,
  onAddBlock,
  onAddBlockToNewRow,
  onUpdateBlock,
  onRemoveBlock,
  onUpdateGlobalStyles,
  onDeselectBlock,
  activeColumnId,
}: RightPanelProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>('contenu');

  // When a block is selected, show full-width properties
  if (selectedBlock) {
    return (
      <div className="h-full bg-background border-l border-border overflow-y-auto">
        <div className="p-4">
          <button
            onClick={onDeselectBlock}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft size={14} />
            Retour
          </button>

          <h3 className="text-sm font-semibold text-foreground mb-4 capitalize">
            {selectedBlock.type} Propriétés
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
        </div>
      </div>
    );
  }

  // Default: 80/20 split
  return (
    <div className="h-full flex border-l border-border">
      {/* 80% - Panel Content */}
      <div className="flex-1 bg-background overflow-y-auto">
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
          {activeTab === 'corps' && (
            <CorpsPanel
              globalStyles={globalStyles}
              onUpdateGlobalStyles={onUpdateGlobalStyles}
            />
          )}
          {activeTab === 'photos' && (
            <PhotosPanel />
          )}
        </div>
      </div>

      {/* 20% - Vertical Tabs */}
      <div className="w-12 bg-muted/50 border-l border-border flex flex-col items-center py-2 gap-1">
        {[
          { key: 'contenu' as PanelTab, icon: Type, label: 'C' },
          { key: 'blocs' as PanelTab, icon: LayoutGrid, label: 'B' },
          { key: 'corps' as PanelTab, icon: Palette, label: 'Co' },
          { key: 'photos' as PanelTab, icon: ImageIcon, label: 'P' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`w-10 h-10 rounded-md flex items-center justify-center transition-colors ${
              activeTab === tab.key
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground/80'
            }`}
            title={tab.key}
          >
            <tab.icon size={16} />
          </button>
        ))}
      </div>
    </div>
  );
}

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
            <span className="text-lg">{item.icon}</span>
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
      <div className="space-y-2">
        {LAYOUT_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => onAddRow(option.value)}
            className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-border hover:border-border hover:bg-muted/50 transition-all"
          >
            <div className="flex gap-0.5 flex-1">
              {option.widths.map((width, i) => (
                <div
                  key={i}
                  className="h-8 bg-muted rounded-sm"
                  style={{ width }}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Color Picker ───
const PRESET_COLORS = [
  '#000000', '#333333', '#555555', '#777777', '#999999', '#cccccc', '#ffffff',
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6',
  '#ec4899', '#f43f5e', '#fb923c', '#fbbf24', '#4ade80', '#2dd4bf', '#60a5fa', '#a78bfa',
  '#fecdd3', '#fed7aa', '#fef08a', '#bbf7d0', '#a5f3fc', '#bfdbfe', '#ddd6fe', '#f1f5f9',
];

function ColorPicker({
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
function SectionHeader({ children }: { children: React.ReactNode }) {
  return <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pt-3 pb-1 border-t border-border/60 first:border-0 first:pt-0">{children}</h4>;
}

function parseBoxValue(value: string | undefined) {
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

function resolveBlockPadding(styles: Record<string, string>) {
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

function resolveBlockMargin(styles: Record<string, string>) {
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
function NumericInput({ value, onChange, suffix = 'px' }: { value: string; onChange: (v: string) => void; suffix?: string }) {
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

// ─── Toggle Switch ───
function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
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

// ─── Font Groups ───
const FONT_GROUPS = [
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
function FontSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
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

// ─── Collapsible Section ───
function AccordionSection({
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

// ─── Corps Panel ───
function CorpsPanel({
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
        <div>
          <Label className="text-xs">Interlignage</Label>
          <select
            value={globalStyles.lineHeight}
            onChange={(e) => onUpdateGlobalStyles({ lineHeight: e.target.value })}
            className="w-full h-9 mt-1 rounded-xl border border-border bg-background text-xs px-3 shadow-sm hover:border-ring focus:border-ring focus:ring-1 focus:ring-ring/20 outline-none transition-all appearance-none cursor-pointer"
          >
            <option value="1">1 (serré)</option>
            <option value="1.25">1.25</option>
            <option value="1.5">1.5 (normal)</option>
            <option value="1.75">1.75</option>
            <option value="2">2 (aéré)</option>
          </select>
        </div>
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

// ─── Photos Panel ───
function PhotosPanel() {
  const [uploads, setUploads] = useState<{ url: string; name: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const { media } = await import('@/lib/api');
      const result = await media.upload(file);
      setUploads((prev) => [{ url: result.url, name: file.name }, ...prev]);
    } catch {
      console.error('Upload failed');
    } finally {
      setIsUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
  };

  return (
    <div>
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Photos</h3>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
        onChange={handleUpload}
        className="hidden"
      />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={isUploading}
        className="w-full py-6 border-2 border-dashed border-border rounded-xl text-center hover:bg-accent hover:border-ring transition-all disabled:opacity-50"
      >
        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-muted-foreground">Upload en cours...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <ImageIcon size={20} className="text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Cliquez pour importer</p>
            <p className="text-[10px] text-muted-foreground/60">JPG, PNG, GIF, WebP, SVG (max 5 Mo)</p>
          </div>
        )}
      </button>

      {uploads.length > 0 && (
        <div className="mt-3 space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Récemment importées</p>
          <div className="grid grid-cols-2 gap-2">
            {uploads.map((img, i) => (
              <div
                key={i}
                className="relative group rounded-lg overflow-hidden border border-border cursor-pointer hover:border-ring transition-all"
                onClick={() => copyUrl(img.url)}
                title="Cliquez pour copier l'URL"
              >
                <img src={img.url} alt={img.name} className="w-full h-20 object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                  <span className="text-white text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">Copier URL</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Font Size Selector (consistent across all blocks) ───
const FONT_SIZES = ['10px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px', '40px', '48px', '56px', '64px'];

function FontSizeSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
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
function FontFamilySelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
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
function FontWeightSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
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
function AlignmentSelector({ value, onChange, label = 'Alignement' }: { value: string; onChange: (v: string) => void; label?: string }) {
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

// ─── Line Height Selector ───
function LineHeightSelector({ value, onChange, label = 'Interlignage' }: { value: string; onChange: (v: string) => void; label?: string }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <select
        value={value || '1.5'}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-9 mt-1 rounded-xl border border-border bg-background text-xs px-3 shadow-sm hover:border-ring focus:border-ring focus:ring-1 focus:ring-ring/20 outline-none transition-all appearance-none cursor-pointer"
      >
        <option value="1">1 (serré)</option>
        <option value="1.25">1.25</option>
        <option value="1.5">1.5 (normal)</option>
        <option value="1.75">1.75</option>
        <option value="2">2 (aéré)</option>
        <option value="2.5">2.5</option>
      </select>
    </div>
  );
}

// ─── Letter Spacing Selector ───
function LetterSpacingSelector({ value, onChange, label = 'Espacement des lettres' }: { value: string; onChange: (v: string) => void; label?: string }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <select
        value={value || '0px'}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-9 mt-1 rounded-xl border border-border bg-background text-xs px-3 shadow-sm hover:border-ring focus:border-ring focus:ring-1 focus:ring-ring/20 outline-none transition-all appearance-none cursor-pointer"
      >
        <option value="-1px">-1px (serré)</option>
        <option value="-0.5px">-0.5px</option>
        <option value="0px">0px (normal)</option>
        <option value="0.5px">0.5px</option>
        <option value="1px">1px</option>
        <option value="2px">2px</option>
        <option value="3px">3px (large)</option>
        <option value="5px">5px</option>
      </select>
    </div>
  );
}

// ─── Text Style Fields (shared by heading, text, button) ───
function TextStyleFields({
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

// ─── Block Properties ───
// ─── Image Block Properties (with upload + full options) ───
function ImageBlockProperties({
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
          <Input value={block.content.href as string || ''} onChange={(e) => updateContent('href', e.target.value)} className="h-8 text-xs mt-1" placeholder="https://..." />
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
        <div>
          <Label className="text-xs">Marge intérieure</Label>
          <select
            value={block.styles.padding || '10px'}
            onChange={(e) => updateStyle('padding', e.target.value)}
            className="w-full h-9 mt-1 rounded-xl border border-border bg-background text-xs px-3 shadow-sm hover:border-ring focus:border-ring focus:ring-1 focus:ring-ring/20 outline-none transition-all appearance-none cursor-pointer"
          >
            <option value="0px">Aucun</option>
            <option value="4px">Très petit (4px)</option>
            <option value="8px">Petit (8px)</option>
            <option value="10px">Normal (10px)</option>
            <option value="16px">Grand (16px)</option>
            <option value="24px">Extra (24px)</option>
          </select>
        </div>
      </AccordionSection>

      {/* ─── Bordures ─── */}
      <AccordionSection openSection={openSection} setOpenSection={setOpenSection} id="borders" title="Bordures">
        <div>
          <Label className="text-xs">Taille</Label>
          <NumericInput value={block.styles.borderSize || '0px'} onChange={(v) => updateStyle('borderSize', v)} />
        </div>
        <div>
          <Label className="text-xs">Style</Label>
          <select
            value={block.styles.borderStyle || 'solid'}
            onChange={(e) => updateStyle('borderStyle', e.target.value)}
            className="w-full h-9 mt-1 rounded-xl border border-border bg-background text-xs px-3 shadow-sm hover:border-ring focus:border-ring focus:ring-1 focus:ring-ring/20 outline-none transition-all appearance-none cursor-pointer"
          >
            <option value="solid">Plein</option>
            <option value="dashed">Tirets</option>
            <option value="dotted">Pointillés</option>
          </select>
        </div>
        <ColorPicker label="Couleur" value={block.styles.borderColor || '#e2e8f0'} onChange={(c) => updateStyle('borderColor', c)} />
      </AccordionSection>
    </div>
  );
}

// ─── YouTube URL helpers ───
function extractYoutubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
  return match ? match[1] : null;
}

function getYoutubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

// ─── Video Block Properties ───
function VideoBlockProperties({
  block,
  updateContent,
  updateStyle,
  onUpdate,
}: {
  block: BlockData;
  updateContent: (key: string, value: string) => void;
  updateStyle: (key: string, value: string) => void;
  onUpdate: (updates: Partial<BlockData>) => void;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>('source');
  const fileRef = useRef<HTMLInputElement>(null);
  const videoType = (block.content.type as string) || 'upload';
  const youtubeId = videoType === 'youtube' ? extractYoutubeId(block.content.src as string || '') : null;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const { media } = await import('@/lib/api');
      const result = await media.upload(file);
      onUpdate({ content: { ...block.content, src: result.url, type: 'upload' } });
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setIsUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const [youtubeInput, setYoutubeInput] = useState((block.content.type === 'youtube' ? block.content.src as string : '') || '');

  const applyYoutubeUrl = (url?: string) => {
    const val = url ?? youtubeInput;
    if (!val) return;
    const id = extractYoutubeId(val);
    if (id) {
      onUpdate({ content: { ...block.content, src: val, type: 'youtube', cover: getYoutubeThumbnail(id) } });
    }
  };

  return (
    <div className="space-y-1">
      <AccordionSection openSection={openSection} setOpenSection={setOpenSection} id="source" title="Source">
        {/* Type toggle */}
        <div>
          <Label className="text-xs">Type de vidéo</Label>
          <div className="flex gap-1 mt-1">
            {[
              { v: 'upload', l: 'Fichier' },
              { v: 'youtube', l: 'YouTube' },
            ].map((opt) => (
              <button
                key={opt.v}
                onClick={() => updateContent('type', opt.v)}
                className={`flex-1 h-8 text-xs rounded-xl border transition-colors ${
                  videoType === opt.v ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'border-border hover:bg-accent hover:border-ring'
                }`}
              >
                {opt.l}
              </button>
            ))}
          </div>
        </div>

        {videoType === 'upload' ? (
          <>
            {block.content.src && (
              <div className="relative rounded-xl overflow-hidden border border-border bg-black">
                <video src={block.content.src as string} className="w-full h-32 object-contain" />
                <button
                  onClick={() => updateContent('src', '')}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs hover:bg-red-600 shadow"
                >×</button>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-10 h-10 rounded-full bg-white/80 flex items-center justify-center">
                    <div className="w-0 h-0 border-l-[10px] border-l-slate-900 border-y-[6px] border-y-transparent ml-1" />
                  </div>
                </div>
              </div>
            )}
            <input ref={fileRef} type="file" accept="video/mp4,video/webm,video/ogg" onChange={handleUpload} className="hidden" />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={isUploading}
              className="w-full h-9 rounded-xl border border-dashed border-border text-xs text-muted-foreground hover:bg-accent hover:border-ring transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isUploading ? (
                <><div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" /> Upload...</>
              ) : (
                <>{block.content.src ? 'Changer la vidéo' : 'Importer une vidéo'}</>
              )}
            </button>
          </>
        ) : (
          <>
            <div>
              <Label className="text-xs">URL YouTube</Label>
              <Input
                value={youtubeInput}
                onChange={(e) => {
                  setYoutubeInput(e.target.value);
                  // Auto-apply if valid YouTube URL detected (paste)
                  if (extractYoutubeId(e.target.value)) {
                    applyYoutubeUrl(e.target.value);
                  }
                }}
                onBlur={() => applyYoutubeUrl()}
                onKeyDown={(e) => { if (e.key === 'Enter') applyYoutubeUrl(); }}
                className="h-8 text-xs mt-1"
                placeholder="https://youtube.com/watch?v=..."
              />
              {youtubeInput && !extractYoutubeId(youtubeInput) && (
                <p className="text-[10px] text-red-500 mt-1">URL YouTube invalide</p>
              )}
            </div>
            {youtubeId && (
              <div className="relative rounded-xl overflow-hidden border border-border">
                <img src={getYoutubeThumbnail(youtubeId)} alt="YouTube thumbnail" className="w-full h-32 object-cover" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-8 rounded-lg bg-red-600 flex items-center justify-center">
                    <div className="w-0 h-0 border-l-[8px] border-l-white border-y-[5px] border-y-transparent ml-0.5" />
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Cover image */}
        {videoType === 'upload' && (
          <div>
            <Label className="text-xs">Image de couverture (URL)</Label>
            <Input value={block.content.cover as string || ''} onChange={(e) => updateContent('cover', e.target.value)} className="h-8 text-xs mt-1" placeholder="https://..." />
          </div>
        )}
      </AccordionSection>

      <AccordionSection openSection={openSection} setOpenSection={setOpenSection} id="layout" title="Mise en page">
        <div>
          <Label className="text-xs">Largeur</Label>
          <select
            value={block.styles.width || '100%'}
            onChange={(e) => updateStyle('width', e.target.value)}
            className="w-full h-9 mt-1 rounded-xl border border-border bg-background text-xs px-3 shadow-sm hover:border-ring focus:border-ring focus:ring-1 focus:ring-ring/20 outline-none transition-all appearance-none cursor-pointer"
          >
            <option value="50%">50%</option>
            <option value="75%">75%</option>
            <option value="100%">100%</option>
          </select>
        </div>
        <AlignmentSelector label="Alignement" value={block.styles.textAlign || 'center'} onChange={(v) => updateStyle('textAlign', v)} />
        <div>
          <Label className="text-xs">Angles arrondis</Label>
          <select
            value={block.styles.borderRadius || '0px'}
            onChange={(e) => updateStyle('borderRadius', e.target.value)}
            className="w-full h-9 mt-1 rounded-xl border border-border bg-background text-xs px-3 shadow-sm hover:border-ring focus:border-ring focus:ring-1 focus:ring-ring/20 outline-none transition-all appearance-none cursor-pointer"
          >
            <option value="0px">Carré</option>
            <option value="8px">Arrondi (8px)</option>
            <option value="16px">Grand (16px)</option>
          </select>
        </div>
      </AccordionSection>

      <AccordionSection openSection={openSection} setOpenSection={setOpenSection} id="spacing" title="Espacement">
        <div>
          <Label className="text-xs">Marge intérieure</Label>
          <select
            value={block.styles.padding || '10px'}
            onChange={(e) => updateStyle('padding', e.target.value)}
            className="w-full h-9 mt-1 rounded-xl border border-border bg-background text-xs px-3 shadow-sm hover:border-ring focus:border-ring focus:ring-1 focus:ring-ring/20 outline-none transition-all appearance-none cursor-pointer"
          >
            <option value="0px">Aucun</option>
            <option value="10px">Normal (10px)</option>
            <option value="16px">Grand (16px)</option>
            <option value="24px">Extra (24px)</option>
          </select>
        </div>
      </AccordionSection>
    </div>
  );
}

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

      {isHeadingOrText && (
        <div className="pt-2 border-t border-border space-y-3">
          <AccordionSection openSection={openSection} setOpenSection={setOpenSection} id="layout" title="Mise en page">
            <div>
              <Label className="text-xs">Police</Label>
              <div className="space-y-2 mt-1">
                <FontSelect value={block.styles.fontFamily || 'Verdana, sans-serif'} onChange={(v) => updateStyle('fontFamily', v)} />
                <FontSizeSelector value={block.styles.fontSize || '16px'} onChange={(v) => updateStyle('fontSize', v)} />
              </div>
            </div>
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
            <ColorPicker label="Couleur du texte" value={block.styles.color || '#000000'} onChange={(c) => updateStyle('color', c)} />
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
            <div>
              <Label className="text-xs">Style</Label>
              <select
                value={block.styles.borderStyle || 'solid'}
                onChange={(e) => updateStyle('borderStyle', e.target.value)}
                className="w-full h-9 mt-1 rounded-xl border border-border bg-background text-xs px-3 shadow-sm hover:border-ring focus:border-ring focus:ring-1 focus:ring-ring/20 outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="solid">Plein</option>
                <option value="dashed">Tirets</option>
                <option value="dotted">Pointillés</option>
                <option value="double">Double</option>
              </select>
            </div>
            <ColorPicker label="Couleur" value={block.styles.borderColor || '#e2e8f0'} onChange={(c) => updateStyle('borderColor', c)} />
            <div>
              <Label className="text-xs">Angles arrondis</Label>
              <select
                value={block.styles.borderRadius || '0px'}
                onChange={(e) => updateStyle('borderRadius', e.target.value)}
                className="w-full h-9 mt-1 rounded-xl border border-border bg-background text-xs px-3 shadow-sm hover:border-ring focus:border-ring focus:ring-1 focus:ring-ring/20 outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="0px">Carré</option>
                <option value="4px">Léger (4px)</option>
                <option value="6px">Arrondi (6px)</option>
                <option value="12px">Plus (12px)</option>
                <option value="16px">Grand (16px)</option>
                <option value="24px">Pilule (24px)</option>
                <option value="9999px">Pilule complète</option>
              </select>
            </div>
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
          <div>
            <Label className="text-xs">Rayon de bordure</Label>
            <select
              value={block.styles.borderRadius || '6px'}
              onChange={(e) => updateStyle('borderRadius', e.target.value)}
              className="w-full h-9 mt-1 rounded-xl border border-border bg-background text-xs px-3 shadow-sm hover:border-ring focus:border-ring focus:ring-1 focus:ring-ring/20 outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="0px">Carré</option>
              <option value="4px">Léger (4px)</option>
              <option value="6px">Arrondi (6px)</option>
              <option value="12px">Plus (12px)</option>
              <option value="24px">Pilule (24px)</option>
              <option value="9999px">Pilule complète</option>
            </select>
          </div>
        </div>
      )}

      {/* Spacing (all blocks) */}
      <div className="pt-2 border-t border-border space-y-3">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase">Espacement</h4>
        <div>
          <Label className="text-xs">Marge intérieure</Label>
          <select
            value={block.styles.padding || '10px'}
            onChange={(e) => updateStyle('padding', e.target.value)}
            className="w-full h-9 mt-1 rounded-xl border border-border bg-background text-xs px-3 shadow-sm hover:border-ring focus:border-ring focus:ring-1 focus:ring-ring/20 outline-none transition-all appearance-none cursor-pointer"
          >
            <option value="0px">Aucun (0px)</option>
            <option value="4px">Très petit (4px)</option>
            <option value="8px">Petit (8px)</option>
            <option value="10px">Normal (10px)</option>
            <option value="12px 24px">Moyen (12px 24px)</option>
            <option value="16px">Grand (16px)</option>
            <option value="20px">Très grand (20px)</option>
            <option value="24px">Extra (24px)</option>
            <option value="32px">XXL (32px)</option>
            <option value="10px 20px">Horizontal (10px 20px)</option>
            <option value="20px 10px">Vertical (20px 10px)</option>
          </select>
        </div>
      </div>
    </div>
  );
}



