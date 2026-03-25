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
  TemplateData,
} from '@/lib/editor-types';

type PanelTab = 'contenu' | 'blocs' | 'corps' | 'photos';

interface RightPanelProps {
  selectedBlock: BlockData | null;
  globalStyles: TemplateData['globalStyles'];
  onAddRow: (layout: RowLayout) => void;
  onAddBlock: (columnId: string, type: BlockType) => void;
  onUpdateBlock: (blockId: string, updates: Partial<BlockData>) => void;
  onRemoveBlock: (blockId: string) => void;
  onUpdateGlobalStyles: (styles: Partial<TemplateData['globalStyles']>) => void;
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
  activeColumnId,
}: {
  onAddBlock: (columnId: string, type: BlockType) => void;
  activeColumnId: string | null;
}) {
  if (!activeColumnId) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-slate-500">Select a column on the canvas to add content</p>
        <p className="text-xs text-slate-400 mt-1">Click on an empty area inside a row</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Content</h3>
      <div className="grid grid-cols-2 gap-2">
        {BLOCK_ITEMS.map((item) => (
          <button
            key={item.type}
            onClick={() => onAddBlock(activeColumnId, item.type)}
            className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-all text-center"
          >
            <span className="text-lg">{item.icon}</span>
            <span className="text-xs font-medium text-slate-600">{item.label}</span>
          </button>
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

// ─── Corps Panel ───
function CorpsPanel({
  globalStyles,
  onUpdateGlobalStyles,
}: {
  globalStyles: TemplateData['globalStyles'];
  onUpdateGlobalStyles: (styles: Partial<TemplateData['globalStyles']>) => void;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Template Body</h3>

      <div className="space-y-3">
        <div>
          <Label className="text-xs">Background Color</Label>
          <div className="flex gap-2 mt-1">
            <input
              type="color"
              value={globalStyles.backgroundColor}
              onChange={(e) => onUpdateGlobalStyles({ backgroundColor: e.target.value })}
              className="w-8 h-8 rounded border border-slate-200 cursor-pointer"
            />
            <Input
              value={globalStyles.backgroundColor}
              onChange={(e) => onUpdateGlobalStyles({ backgroundColor: e.target.value })}
              className="h-8 text-xs"
            />
          </div>
        </div>

        <div>
          <Label className="text-xs">Text Color</Label>
          <div className="flex gap-2 mt-1">
            <input
              type="color"
              value={globalStyles.textColor}
              onChange={(e) => onUpdateGlobalStyles({ textColor: e.target.value })}
              className="w-8 h-8 rounded border border-slate-200 cursor-pointer"
            />
            <Input
              value={globalStyles.textColor}
              onChange={(e) => onUpdateGlobalStyles({ textColor: e.target.value })}
              className="h-8 text-xs"
            />
          </div>
        </div>

        <div>
          <Label className="text-xs">Font Family</Label>
          <select
            value={globalStyles.fontFamily}
            onChange={(e) => onUpdateGlobalStyles({ fontFamily: e.target.value })}
            className="w-full h-8 mt-1 rounded-md border border-slate-200 text-xs px-2"
          >
            <option value="Inter, sans-serif">Inter</option>
            <option value="Arial, sans-serif">Arial</option>
            <option value="Georgia, serif">Georgia</option>
            <option value="Verdana, sans-serif">Verdana</option>
            <option value="'Courier New', monospace">Courier New</option>
            <option value="'Times New Roman', serif">Times New Roman</option>
          </select>
        </div>

        <div>
          <Label className="text-xs">Font Weight</Label>
          <select
            value={globalStyles.fontWeight}
            onChange={(e) => onUpdateGlobalStyles({ fontWeight: e.target.value })}
            className="w-full h-8 mt-1 rounded-md border border-slate-200 text-xs px-2"
          >
            <option value="normal">Normal</option>
            <option value="bold">Bold</option>
            <option value="lighter">Light</option>
          </select>
        </div>

        <div>
          <Label className="text-xs">Text Alignment</Label>
          <div className="flex gap-1 mt-1">
            {['left', 'center', 'right'].map((align) => (
              <button
                key={align}
                onClick={() => onUpdateGlobalStyles({ textAlign: align })}
                className={`flex-1 h-8 text-xs rounded-md border transition-colors capitalize ${
                  globalStyles.textAlign === align
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                {align}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-xs">Width</Label>
          <Input
            value={globalStyles.width}
            onChange={(e) => onUpdateGlobalStyles({ width: e.target.value })}
            className="h-8 text-xs mt-1"
          />
        </div>
      </div>
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

  return (
    <div className="space-y-4">
      {/* Content fields based on block type */}
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

      {/* Common style fields */}
      <div className="pt-2 border-t border-slate-200 space-y-3">
        <h4 className="text-xs font-semibold text-slate-400 uppercase">Styles</h4>

        {block.styles.fontSize && (
          <div>
            <Label className="text-xs">Font Size</Label>
            <Input
              value={block.styles.fontSize}
              onChange={(e) => updateStyle('fontSize', e.target.value)}
              className="h-8 text-xs mt-1"
            />
          </div>
        )}

        {block.styles.color && (
          <div>
            <Label className="text-xs">Color</Label>
            <div className="flex gap-2 mt-1">
              <input
                type="color"
                value={block.styles.color}
                onChange={(e) => updateStyle('color', e.target.value)}
                className="w-8 h-8 rounded border border-slate-200 cursor-pointer"
              />
              <Input
                value={block.styles.color}
                onChange={(e) => updateStyle('color', e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>
        )}

        {block.styles.backgroundColor && (
          <div>
            <Label className="text-xs">Background</Label>
            <div className="flex gap-2 mt-1">
              <input
                type="color"
                value={block.styles.backgroundColor}
                onChange={(e) => updateStyle('backgroundColor', e.target.value)}
                className="w-8 h-8 rounded border border-slate-200 cursor-pointer"
              />
              <Input
                value={block.styles.backgroundColor}
                onChange={(e) => updateStyle('backgroundColor', e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>
        )}

        {block.styles.textAlign && (
          <div>
            <Label className="text-xs">Alignment</Label>
            <div className="flex gap-1 mt-1">
              {['left', 'center', 'right'].map((align) => (
                <button
                  key={align}
                  onClick={() => updateStyle('textAlign', align)}
                  className={`flex-1 h-8 text-xs rounded-md border transition-colors capitalize ${
                    block.styles.textAlign === align
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {align}
                </button>
              ))}
            </div>
          </div>
        )}

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
