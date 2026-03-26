'use client';

import { useState } from 'react';
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
      <div className="h-full bg-white border-l border-slate-200 overflow-y-auto">
        <div className="p-4">
          <button
            onClick={onDeselectBlock}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-4"
          >
            <ArrowLeft size={14} />
            Back
          </button>

          <h3 className="text-sm font-semibold text-slate-900 mb-4 capitalize">
            {selectedBlock.type} Properties
          </h3>

          <BlockProperties
            block={selectedBlock}
            onUpdate={(updates) => onUpdateBlock(selectedBlock.id, updates)}
          />

          <div className="mt-6 pt-4 border-t border-slate-200">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onRemoveBlock(selectedBlock.id)}
              className="w-full gap-1.5"
            >
              <Trash2 size={14} />
              Delete Block
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Default: 80/20 split
  return (
    <div className="h-full flex border-l border-slate-200">
      {/* 80% - Panel Content */}
      <div className="flex-1 bg-white overflow-y-auto">
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
      <div className="w-12 bg-slate-50 border-l border-slate-200 flex flex-col items-center py-2 gap-1">
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
                ? 'bg-slate-900 text-white'
                : 'text-slate-500 hover:bg-slate-200 hover:text-slate-700'
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
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Content</h3>
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
            className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-all text-center cursor-grab active:cursor-grabbing"
          >
            <span className="text-lg">{item.icon}</span>
            <span className="text-xs font-medium text-slate-600">{item.label}</span>
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
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Row Layouts</h3>
      <div className="space-y-2">
        {LAYOUT_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => onAddRow(option.value)}
            className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-all"
          >
            <div className="flex gap-0.5 flex-1">
              {option.widths.map((width, i) => (
                <div
                  key={i}
                  className="h-8 bg-slate-200 rounded-sm"
                  style={{ width }}
                />
              ))}
            </div>
            <span className="text-xs text-slate-500 whitespace-nowrap">{option.label}</span>
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
          className="w-8 h-8 rounded-md border border-slate-200 cursor-pointer shadow-sm hover:shadow transition-shadow flex-shrink-0"
          style={{ backgroundColor: value }}
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 text-xs"
        />
        {isOpen && (
          <div className="absolute top-10 left-0 z-50 bg-white rounded-lg shadow-xl border border-slate-200 p-3 w-56">
            <div className="grid grid-cols-7 gap-1.5 mb-3">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => { onChange(color); setIsOpen(false); }}
                  className={`w-6 h-6 rounded-md border transition-transform hover:scale-110 ${
                    value === color ? 'ring-2 ring-blue-500 ring-offset-1' : 'border-slate-200'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <div className="flex gap-2 items-center border-t border-slate-100 pt-2">
              <input
                type="color"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-6 h-6 rounded cursor-pointer border-0 p-0"
              />
              <span className="text-[10px] text-slate-400">Custom color</span>
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
  return <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pt-3 pb-1 border-t border-slate-100 first:border-0 first:pt-0">{children}</h4>;
}

// ─── Numeric Input with suffix ───
function NumericInput({ value, onChange, suffix = 'px' }: { value: string; onChange: (v: string) => void; suffix?: string }) {
  const num = parseInt(value) || 0;
  return (
    <div className="flex items-center h-8 rounded-md border border-slate-200 overflow-hidden">
      <input
        type="number"
        value={num}
        onChange={(e) => onChange(`${e.target.value}${suffix}`)}
        className="flex-1 h-full text-xs px-2 border-0 outline-none w-16"
      />
      <span className="text-[10px] text-slate-400 px-2 bg-slate-50 h-full flex items-center border-l border-slate-200">{suffix}</span>
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
        className={`w-9 h-5 rounded-full transition-colors relative ${value ? 'bg-slate-900' : 'bg-slate-200'}`}
      >
        <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-[3px] transition-all ${value ? 'left-[19px]' : 'left-[3px]'}`} />
      </button>
    </div>
  );
}

// ─── Font Select ───
function FontSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full h-8 rounded-md border border-slate-200 text-xs px-2">
      <option value="Verdana, sans-serif">Verdana</option>
      <option value="Arial, sans-serif">Arial</option>
      <option value="Inter, sans-serif">Inter</option>
      <option value="Georgia, serif">Georgia</option>
      <option value="'Courier New', monospace">Courier New</option>
      <option value="'Times New Roman', serif">Times New Roman</option>
      <option value="Helvetica, sans-serif">Helvetica</option>
      <option value="'Trebuchet MS', sans-serif">Trebuchet MS</option>
      <option value="Tahoma, sans-serif">Tahoma</option>
    </select>
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
    <div className="border-b border-slate-100 last:border-0">
      <button
        onClick={() => setOpenSection(isOpen ? null : id)}
        className="w-full flex items-center justify-between py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
      >
        {title}
        <span className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}>▾</span>
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
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Template Body</h3>

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
                <Label className="text-[10px] text-slate-400">Haut</Label>
                <NumericInput value={globalStyles.paddingTop} onChange={(v) => onUpdateGlobalStyles({ paddingTop: v })} />
              </div>
              <div>
                <Label className="text-[10px] text-slate-400">Droite</Label>
                <NumericInput value={globalStyles.paddingRight} onChange={(v) => onUpdateGlobalStyles({ paddingRight: v })} />
              </div>
              <div>
                <Label className="text-[10px] text-slate-400">Bas</Label>
                <NumericInput value={globalStyles.paddingBottom} onChange={(v) => onUpdateGlobalStyles({ paddingBottom: v })} />
              </div>
              <div>
                <Label className="text-[10px] text-slate-400">Gauche</Label>
                <NumericInput value={globalStyles.paddingLeft} onChange={(v) => onUpdateGlobalStyles({ paddingLeft: v })} />
              </div>
            </div>
          )}
        </div>
      </AccordionSection>

      {/* ─── 2. Fond ─── */}
      <AccordionSection openSection={openSection} setOpenSection={setOpenSection} id="background" title="Fond">
        <ColorPicker label="Couleur de fond" value={globalStyles.backgroundColor} onChange={(c) => onUpdateGlobalStyles({ backgroundColor: c })} />
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
                    globalStyles.backgroundSize === size ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 hover:bg-slate-50'
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
            className="w-full h-8 mt-1 rounded-md border border-slate-200 text-xs px-2"
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
                  globalStyles.textDirection === opt.v ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 hover:bg-slate-50'
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
                  globalStyles.linkDecoration === opt.v ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 hover:bg-slate-50'
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
                  globalStyles.btnWidth === opt.v ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 hover:bg-slate-50'
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
  return (
    <div>
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Photos</h3>
      <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg">
        <ImageIcon size={24} className="mx-auto text-slate-300 mb-2" />
        <p className="text-xs text-slate-500">Upload images</p>
        <p className="text-xs text-slate-400 mt-1">MinIO integration coming soon</p>
      </div>
    </div>
  );
}

// ─── Font Size Selector (consistent across all blocks) ───
const FONT_SIZES = ['10px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px', '40px', '48px', '56px', '64px'];

function FontSizeSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const currentSize = parseInt(value) || 16;
  const decrease = () => onChange(`${Math.max(8, currentSize - 2)}px`);
  const increase = () => onChange(`${Math.min(72, currentSize + 2)}px`);

  return (
    <div>
      <Label className="text-xs">Font Size</Label>
      <div className="flex items-center gap-1 mt-1">
        <button onClick={decrease} className="w-8 h-8 rounded-md border border-slate-200 flex items-center justify-center hover:bg-slate-50 text-sm font-medium">−</button>
        <select
          value={value || '16px'}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 h-8 rounded-md border border-slate-200 text-xs px-2 text-center"
        >
          {FONT_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={increase} className="w-8 h-8 rounded-md border border-slate-200 flex items-center justify-center hover:bg-slate-50 text-sm font-medium">+</button>
      </div>
    </div>
  );
}

// ─── Font Family Selector ───
function FontFamilySelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-xs">Font Family</Label>
      <select
        value={value || 'inherit'}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-8 mt-1 rounded-md border border-slate-200 text-xs px-2"
      >
        <option value="inherit">Inherit (from body)</option>
        <option value="Inter, sans-serif">Inter</option>
        <option value="Arial, sans-serif">Arial</option>
        <option value="Georgia, serif">Georgia</option>
        <option value="Verdana, sans-serif">Verdana</option>
        <option value="'Courier New', monospace">Courier New</option>
        <option value="'Times New Roman', serif">Times New Roman</option>
      </select>
    </div>
  );
}

// ─── Font Weight Selector ───
function FontWeightSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-xs">Font Weight</Label>
      <div className="flex gap-1 mt-1">
        {[
          { v: 'lighter', l: 'Light' },
          { v: 'normal', l: 'Normal' },
          { v: 'bold', l: 'Bold' },
        ].map((opt) => (
          <button
            key={opt.v}
            onClick={() => onChange(opt.v)}
            className={`flex-1 h-8 text-xs rounded-md border transition-colors ${
              (value || 'normal') === opt.v
                ? 'bg-slate-900 text-white border-slate-900'
                : 'border-slate-200 hover:bg-slate-50'
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
function AlignmentSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-xs">Alignment</Label>
      <div className="flex gap-1 mt-1">
        {['left', 'center', 'right'].map((align) => (
          <button
            key={align}
            onClick={() => onChange(align)}
            className={`flex-1 h-8 text-xs rounded-md border transition-colors capitalize ${
              (value || 'left') === align
                ? 'bg-slate-900 text-white border-slate-900'
                : 'border-slate-200 hover:bg-slate-50'
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
function LineHeightSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-xs">Line Height</Label>
      <select
        value={value || '1.5'}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-8 mt-1 rounded-md border border-slate-200 text-xs px-2"
      >
        <option value="1">1 (tight)</option>
        <option value="1.25">1.25</option>
        <option value="1.5">1.5 (normal)</option>
        <option value="1.75">1.75</option>
        <option value="2">2 (loose)</option>
        <option value="2.5">2.5</option>
      </select>
    </div>
  );
}

// ─── Letter Spacing Selector ───
function LetterSpacingSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-xs">Letter Spacing</Label>
      <select
        value={value || '0px'}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-8 mt-1 rounded-md border border-slate-200 text-xs px-2"
      >
        <option value="-1px">-1px (tight)</option>
        <option value="-0.5px">-0.5px</option>
        <option value="0px">0px (normal)</option>
        <option value="0.5px">0.5px</option>
        <option value="1px">1px</option>
        <option value="2px">2px</option>
        <option value="3px">3px (wide)</option>
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
      <ColorPicker label="Text Color" value={block.styles.color || '#000000'} onChange={(c) => updateStyle('color', c)} />
      <AlignmentSelector value={block.styles.textAlign} onChange={(v) => updateStyle('textAlign', v)} />
      <LineHeightSelector value={block.styles.lineHeight} onChange={(v) => updateStyle('lineHeight', v)} />
      <LetterSpacingSelector value={block.styles.letterSpacing} onChange={(v) => updateStyle('letterSpacing', v)} />
    </>
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
  const updateContent = (key: string, value: string) => {
    onUpdate({ content: { ...block.content, [key]: value } });
  };

  const updateStyle = (key: string, value: string) => {
    onUpdate({ styles: { ...block.styles, [key]: value } });
  };

  const isTextLike = block.type === 'heading' || block.type === 'text' || block.type === 'button';

  return (
    <div className="space-y-4">
      {/* Content fields */}
      {(block.type === 'heading' || block.type === 'text') && (
        <div>
          <Label className="text-xs">Content</Label>
          <textarea
            value={block.content.text as string}
            onChange={(e) => updateContent('text', e.target.value)}
            className="w-full mt-1 rounded-md border border-slate-200 text-sm p-2 min-h-[80px] resize-y"
          />
        </div>
      )}

      {block.type === 'button' && (
        <>
          <div>
            <Label className="text-xs">Button Text</Label>
            <Input
              value={block.content.text as string}
              onChange={(e) => updateContent('text', e.target.value)}
              className="h-8 text-xs mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Link URL</Label>
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
        <>
          <div>
            <Label className="text-xs">Image URL</Label>
            <Input
              value={block.content.src as string}
              onChange={(e) => updateContent('src', e.target.value)}
              className="h-8 text-xs mt-1"
              placeholder="https://..."
            />
          </div>
          <div>
            <Label className="text-xs">Alt Text</Label>
            <Input
              value={block.content.alt as string}
              onChange={(e) => updateContent('alt', e.target.value)}
              className="h-8 text-xs mt-1"
            />
          </div>
        </>
      )}

      {/* Typography (consistent for heading, text, button) */}
      {isTextLike && (
        <div className="pt-2 border-t border-slate-200 space-y-3">
          <h4 className="text-xs font-semibold text-slate-400 uppercase">Typography</h4>
          <TextStyleFields block={block} updateStyle={updateStyle} />
        </div>
      )}

      {/* Button specific styles */}
      {block.type === 'button' && (
        <div className="pt-2 border-t border-slate-200 space-y-3">
          <h4 className="text-xs font-semibold text-slate-400 uppercase">Button Style</h4>
          <ColorPicker label="Background" value={block.styles.backgroundColor || '#0f172a'} onChange={(c) => updateStyle('backgroundColor', c)} />
          <div>
            <Label className="text-xs">Border Radius</Label>
            <select
              value={block.styles.borderRadius || '6px'}
              onChange={(e) => updateStyle('borderRadius', e.target.value)}
              className="w-full h-8 mt-1 rounded-md border border-slate-200 text-xs px-2"
            >
              <option value="0px">Square</option>
              <option value="4px">Slight (4px)</option>
              <option value="6px">Rounded (6px)</option>
              <option value="12px">More (12px)</option>
              <option value="24px">Pill (24px)</option>
              <option value="9999px">Full pill</option>
            </select>
          </div>
        </div>
      )}

      {/* Spacing (all blocks) */}
      <div className="pt-2 border-t border-slate-200 space-y-3">
        <h4 className="text-xs font-semibold text-slate-400 uppercase">Spacing</h4>
        <div>
          <Label className="text-xs">Padding</Label>
          <Input
            value={block.styles.padding}
            onChange={(e) => updateStyle('padding', e.target.value)}
            className="h-8 text-xs mt-1"
          />
        </div>
      </div>
    </div>
  );
}
