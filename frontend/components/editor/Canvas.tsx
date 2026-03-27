'use client';

import { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, GripVertical, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Link2, Smile, Copy } from 'lucide-react';
import { TemplateData, BlockData, Row, Column, RowLayout, LAYOUT_OPTIONS, GlobalStyles } from '@/lib/editor-types';

interface CanvasProps {
  template: TemplateData;
  selectedBlockId: string | null;
  selectedRowId: string | null;
  onSelectBlock: (blockId: string | null) => void;
  onSelectRow: (rowId: string | null) => void;
  onSelectColumn: (columnId: string | null) => void;
  onRemoveRow: (rowId: string) => void;
  onRemoveBlock: (blockId: string) => void;
  onDuplicateBlock: (blockId: string) => void;
  onUpdateBlock: (blockId: string, updates: Partial<BlockData>) => void;
  onAddRow: (layout: RowLayout) => void;
  onReorderRows: (fromIndex: number, toIndex: number) => void;
  onReorderBlocks: (columnId: string, fromIndex: number, toIndex: number) => void;
  onDropBlock: (columnId: string, blockType: string) => void;
  onDropBlockToCanvas: (blockType: string) => void;
  activeColumnId: string | null;
}

const EMOJI_CATEGORIES: { name: string; emojis: string[] }[] = [
  {
    name: 'Smileys',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤗', '🤭', '🫢', '🤫', '🤔', '😐', '😑', '😶', '🫡', '😏', '😒', '🙄', '😬', '😮‍💨', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐'],
  },
  {
    name: 'Gestures',
    emojis: ['👋', '🤚', '🖐️', '✋', '🖖', '🫱', '🫲', '🫳', '🫴', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '🫵', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '🫶', '👐', '🤲', '🤝', '🙏', '💪'],
  },
  {
    name: 'Hearts',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟'],
  },
  {
    name: 'Objects',
    emojis: ['📧', '📨', '📩', '📤', '📥', '📦', '📫', '📪', '📬', '📭', '📮', '📝', '📄', '📃', '📑', '📊', '📈', '📉', '📆', '📅', '📁', '📂', '🗂️', '🗃️', '🗄️', '📋', '📌', '📍', '📎', '🖇️', '📐', '📏', '✂️', '🖊️', '🖋️', '✒️', '🖌️', '🖍️', '📒', '📓', '📔', '📕', '📗', '📘', '📙'],
  },
  {
    name: 'Business',
    emojis: ['💼', '💰', '💵', '💴', '💶', '💷', '🪙', '💳', '💎', '⚖️', '🏦', '🏢', '🏬', '🏭', '🏗️', '📞', '☎️', '📱', '💻', '🖥️', '🖨️', '⌨️', '🖱️', '🔒', '🔓', '🔑', '🗝️'],
  },
  {
    name: 'Symbols',
    emojis: ['✅', '❌', '⭐', '🌟', '💡', '🔥', '✨', '🎉', '🎊', '🎯', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '⚡', '💥', '🌈', '☀️', '🌙', '⭕', '❗', '❓', '‼️', '⁉️', '💯', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🟤', '▶️', '⏸️', '⏹️', '⏺️', '⏏️', '🔀', '🔁', '🔂', '⏩', '⏪'],
  },
];

function resolvePadding(styles: Record<string, string>) {
  if (styles.padding) return styles.padding;
  if (styles.paddingTop || styles.paddingRight || styles.paddingBottom || styles.paddingLeft) {
    const top = styles.paddingTop || '0px';
    const right = styles.paddingRight || top;
    const bottom = styles.paddingBottom || top;
    const left = styles.paddingLeft || right;
    return `${top} ${right} ${bottom} ${left}`;
  }
  return undefined;
}

function resolveMargin(styles: Record<string, string>) {
  if (styles.margin) return styles.margin;
  if (styles.marginY || styles.marginX) {
    const y = styles.marginY || '0px';
    const x = styles.marginX || '0px';
    return `${y} ${x}`;
  }
  if (styles.marginTop || styles.marginRight || styles.marginBottom || styles.marginLeft) {
    const top = styles.marginTop || '0px';
    const right = styles.marginRight || top;
    const bottom = styles.marginBottom || top;
    const left = styles.marginLeft || right;
    return `${top} ${right} ${bottom} ${left}`;
  }
  return undefined;
}

function resolveBlockAlign(styles: Record<string, string>) {
  const align = styles.blockAlign || 'left';
  if (align === 'center') return { marginLeft: 'auto', marginRight: 'auto' };
  if (align === 'right') return { marginLeft: 'auto', marginRight: '0' };
  return { marginLeft: '0', marginRight: 'auto' };
}

export default function Canvas({
  template,
  selectedBlockId,
  selectedRowId,
  onSelectBlock,
  onSelectRow,
  onSelectColumn,
  onRemoveRow,
  onRemoveBlock,
  onDuplicateBlock,
  onUpdateBlock,
  onAddRow,
  onReorderRows,
  onReorderBlocks,
  onDropBlock,
  onDropBlockToCanvas,
  activeColumnId,
}: CanvasProps) {
  const [showAddRow, setShowAddRow] = useState(false);
  const [dragRowIndex, setDragRowIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [canvasDragOver, setCanvasDragOver] = useState(false);

  return (
    <div
      className="overflow-y-auto p-8 bg-background"
      style={{
        height: 'calc(100vh - 7rem)',
        backgroundImage: `
          linear-gradient(45deg, var(--border) 25%, transparent 25%),
          linear-gradient(-45deg, var(--border) 25%, transparent 25%),
          linear-gradient(45deg, transparent 75%, var(--border) 75%),
          linear-gradient(-45deg, transparent 75%, var(--border) 75%)
        `,
        backgroundSize: '20px 20px',
        backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
      }}
      onClick={() => {
        onSelectBlock(null);
        onSelectRow(null);
        onSelectColumn(null);
        setShowAddRow(false);
      }}
    >
      <div
        className={`mx-auto min-h-[500px] shadow-lg rounded-sm relative transition-all ${
          canvasDragOver ? 'ring-2 ring-dashed ring-blue-400 ring-offset-4' : ''
        }`}
        style={{
          width: template.globalStyles.width,
          backgroundColor: template.globalStyles.bodyColor,
          fontFamily: template.globalStyles.fontFamily,
          color: template.globalStyles.textColor,
          fontWeight: template.globalStyles.fontWeight,
          fontSize: template.globalStyles.fontSize,
          lineHeight: template.globalStyles.lineHeight,
          direction: template.globalStyles.textDirection as 'ltr' | 'rtl',
          padding: template.globalStyles.paddingGroup
            ? template.globalStyles.paddingTop
            : `${template.globalStyles.paddingTop} ${template.globalStyles.paddingRight} ${template.globalStyles.paddingBottom} ${template.globalStyles.paddingLeft}`,
          backgroundImage: template.globalStyles.backgroundImage ? `url(${template.globalStyles.backgroundImage})` : 'none',
          backgroundSize: template.globalStyles.backgroundSize === 'repeat' ? 'auto' : template.globalStyles.backgroundSize,
          backgroundRepeat: template.globalStyles.backgroundSize === 'repeat' ? 'repeat' : 'no-repeat',
          backgroundPosition: 'center',
        }}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes('blocktype')) {
            e.preventDefault();
            setCanvasDragOver(true);
          }
        }}
        onDragLeave={(e) => {
          if (e.currentTarget === e.target) setCanvasDragOver(false);
        }}
        onDrop={(e) => {
          const blockType = e.dataTransfer.getData('blockType');
          if (blockType) {
            e.preventDefault();
            e.stopPropagation();
            onDropBlockToCanvas(blockType);
          }
          setCanvasDragOver(false);
        }}
      >
        {template.rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Plus size={20} className="text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-1">Drag content here to start</p>
            <p className="text-xs text-muted-foreground">Or add a custom layout below</p>
          </div>
        ) : (
          template.rows.map((row, index) => (
            <div
              key={row.id}
              draggable
              onDragStart={(e) => {
                if (e.dataTransfer.types.includes('blocktype')) return;
                setDragRowIndex(index);
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragOver={(e) => { e.preventDefault(); setDragOverIndex(index); }}
              onDragEnd={() => {
                if (dragRowIndex !== null && dragOverIndex !== null && dragRowIndex !== dragOverIndex) {
                  onReorderRows(dragRowIndex, dragOverIndex);
                }
                setDragRowIndex(null);
                setDragOverIndex(null);
              }}
              className={dragOverIndex === index && dragRowIndex !== index ? 'border-t-2 border-blue-500' : ''}
            >
              <CanvasRow
                row={row}
                isSelected={selectedRowId === row.id}
                selectedBlockId={selectedBlockId}
                activeColumnId={activeColumnId}
                onSelectRow={(e) => { e.stopPropagation(); onSelectRow(row.id); onSelectBlock(null); }}
                onSelectBlock={onSelectBlock}
                onSelectColumn={onSelectColumn}
                onRemoveRow={() => onRemoveRow(row.id)}
                onRemoveBlock={onRemoveBlock}
                onDuplicateBlock={onDuplicateBlock}
                onUpdateBlock={onUpdateBlock}
                onReorderBlocks={onReorderBlocks}
                onDropBlock={onDropBlock}
                globalStyles={template.globalStyles}
              />
            </div>
          ))
        )}

        {/* Add row button — subtle, at the bottom */}
        <div
          className="flex items-center justify-center py-3 cursor-pointer group"
          onClick={(e) => { e.stopPropagation(); setShowAddRow(!showAddRow); }}
        >
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-dashed border-border/60 group-hover:border-border transition-all opacity-40 group-hover:opacity-100">
            <Plus size={12} className="text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground group-hover:text-muted-foreground">Layout</span>
          </div>
        </div>

        {showAddRow && (
          <div className="absolute left-1/2 -translate-x-1/2 bottom-12 z-50" onClick={(e) => e.stopPropagation()}>
            <div className="bg-background rounded-xl shadow-xl border border-border p-3 w-56">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Column layout</p>
              <div className="grid grid-cols-2 gap-1.5">
                {LAYOUT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => { onAddRow(option.value); setShowAddRow(false); }}
                    className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-muted/50 border border-transparent hover:border-border transition-all"
                  >
                    <div className="flex gap-0.5 w-full">
                      {option.widths.map((width, i) => (
                        <div key={i} className="h-5 bg-muted rounded-sm" style={{ width }} />
                      ))}
                    </div>
                    <span className="text-[10px] text-muted-foreground">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Floating Toolbar ───
function FloatingToolbar({
  block,
  onUpdate,
}: {
  block: BlockData;
  onUpdate: (updates: Partial<BlockData>) => void;
}) {
  const [showEmoji, setShowEmoji] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const isBold = block.styles.fontWeight === 'bold';
  const isItalic = block.styles.fontStyle === 'italic';
  const isUnderline = block.styles.textDecoration === 'underline';

  const toggleStyle = (key: string, onValue: string, offValue: string) => {
    const current = block.styles[key];
    onUpdate({ styles: { ...block.styles, [key]: current === onValue ? offValue : onValue } });
  };

  const insertEmoji = (emoji: string) => {
    const text = (block.content.text as string) || '';
    onUpdate({ content: { ...block.content, text: text + emoji } });
    setShowEmoji(false);
  };

  const applyLink = () => {
    if (linkUrl) {
      const text = (block.content.text as string) || '';
      onUpdate({ content: { ...block.content, text: text, href: linkUrl } });
      onUpdate({ styles: { ...block.styles, textDecoration: 'underline', color: '#2563eb' } });
    }
    setShowLink(false);
    setLinkUrl('');
  };

  return (
    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-0.5 bg-slate-900 rounded-lg px-1.5 py-1 shadow-lg">
        <button
          onClick={() => toggleStyle('fontWeight', 'bold', 'normal')}
          className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${isBold ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'}`}
        >
          <Bold size={13} />
        </button>
        <button
          onClick={() => toggleStyle('fontStyle', 'italic', 'normal')}
          className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${isItalic ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'}`}
        >
          <Italic size={13} />
        </button>
        <button
          onClick={() => toggleStyle('textDecoration', 'underline', 'none')}
          className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${isUnderline ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'}`}
        >
          <Underline size={13} />
        </button>
        <div className="w-px h-4 bg-white/20 mx-0.5" />
        <button
          onClick={() => onUpdate({ styles: { ...block.styles, textAlign: 'left' } })}
          className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${block.styles.textAlign === 'left' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'}`}
        >
          <AlignLeft size={13} />
        </button>
        <button
          onClick={() => onUpdate({ styles: { ...block.styles, textAlign: 'center' } })}
          className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${block.styles.textAlign === 'center' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'}`}
        >
          <AlignCenter size={13} />
        </button>
        <button
          onClick={() => onUpdate({ styles: { ...block.styles, textAlign: 'right' } })}
          className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${block.styles.textAlign === 'right' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'}`}
        >
          <AlignRight size={13} />
        </button>
        <div className="w-px h-4 bg-white/20 mx-0.5" />
        <button
          onClick={() => { setShowLink(!showLink); setShowEmoji(false); }}
          className="w-7 h-7 rounded flex items-center justify-center text-white/60 hover:text-white transition-colors"
        >
          <Link2 size={13} />
        </button>
        <button
          onClick={() => { setShowEmoji(!showEmoji); setShowLink(false); }}
          className="w-7 h-7 rounded flex items-center justify-center text-white/60 hover:text-white transition-colors"
        >
          <Smile size={13} />
        </button>
      </div>

      {/* Emoji Picker */}
      {showEmoji && (
        <div className="absolute top-full left-0 mt-1 bg-background rounded-xl shadow-xl border border-border p-3 z-50 w-80 max-h-72 overflow-y-auto">
          {EMOJI_CATEGORIES.map((category) => (
            <div key={category.name} className="mb-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{category.name}</p>
              <div className="grid grid-cols-10 gap-0.5">
                {category.emojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => insertEmoji(emoji)}
                    className="w-7 h-7 rounded hover:bg-muted flex items-center justify-center text-base transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Link Input */}
      {showLink && (
        <div className="absolute top-full left-0 mt-1 bg-background rounded-lg shadow-xl border border-border p-2 z-50 flex gap-1">
          <input
            type="text"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://..."
            className="text-xs border border-border rounded px-2 py-1 w-48 focus:outline-none focus:ring-1 focus:ring-ring"
            onKeyDown={(e) => { if (e.key === 'Enter') applyLink(); }}
          />
          <button
            onClick={applyLink}
            className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded hover:bg-primary/90"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Canvas Row ───
function CanvasRow({
  row, isSelected, selectedBlockId, activeColumnId,
  onSelectRow, onSelectBlock, onSelectColumn, onRemoveRow,
  onRemoveBlock, onDuplicateBlock, onUpdateBlock, onReorderBlocks, onDropBlock, globalStyles,
}: {
  row: Row;
  isSelected: boolean;
  selectedBlockId: string | null;
  activeColumnId: string | null;
  onSelectRow: (e: React.MouseEvent) => void;
  onSelectBlock: (id: string | null) => void;
  onSelectColumn: (id: string | null) => void;
  onRemoveRow: () => void;
  onRemoveBlock: (id: string) => void;
  onDuplicateBlock: (id: string) => void;
  onUpdateBlock: (id: string, updates: Partial<BlockData>) => void;
  onReorderBlocks: (columnId: string, fromIndex: number, toIndex: number) => void;
  onDropBlock: (columnId: string, blockType: string) => void;
  globalStyles: GlobalStyles;
}) {
  return (
    <div
      className={`group relative transition-all ${
        isSelected ? 'ring-2 ring-blue-500 ring-offset-1' : 'hover:ring-1 hover:ring-border'
      }`}
      style={{ backgroundColor: row.styles.backgroundColor === 'transparent' ? 'transparent' : row.styles.backgroundColor, padding: row.styles.padding }}
      onClick={onSelectRow}
    >
      <div className={`absolute -left-10 top-1/2 -translate-y-1/2 flex flex-col gap-1 transition-opacity ${
        isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
      }`}>
        <div className="w-7 h-7 rounded bg-background shadow border border-border flex items-center justify-center hover:bg-muted/50 cursor-grab active:cursor-grabbing">
          <GripVertical size={12} className="text-muted-foreground" />
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onRemoveRow(); }}
          className="w-7 h-7 rounded bg-background shadow border border-border flex items-center justify-center hover:bg-red-50 hover:text-red-500"
        >
          <Trash2 size={12} />
        </button>
      </div>

      <div className="flex gap-0">
        {row.columns.map((col) => (
          <CanvasColumn
            key={col.id}
            column={col}
            isActive={activeColumnId === col.id}
            selectedBlockId={selectedBlockId}
            onSelectColumn={(e) => { e.stopPropagation(); onSelectColumn(col.id); onSelectBlock(null); }}
            onSelectBlock={onSelectBlock}
            onRemoveBlock={onRemoveBlock}
            onDuplicateBlock={onDuplicateBlock}
            onUpdateBlock={onUpdateBlock}
            onReorderBlocks={onReorderBlocks}
            onDropBlock={onDropBlock}
            globalStyles={globalStyles}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Canvas Column ───
function CanvasColumn({
  column, isActive, selectedBlockId,
  onSelectColumn, onSelectBlock, onRemoveBlock, onDuplicateBlock, onUpdateBlock, onReorderBlocks, onDropBlock, globalStyles,
}: {
  column: Column;
  isActive: boolean;
  selectedBlockId: string | null;
  onSelectColumn: (e: React.MouseEvent) => void;
  onSelectBlock: (id: string | null) => void;
  onRemoveBlock: (id: string) => void;
  onDuplicateBlock: (id: string) => void;
  onUpdateBlock: (id: string, updates: Partial<BlockData>) => void;
  onReorderBlocks: (columnId: string, fromIndex: number, toIndex: number) => void;
  onDropBlock: (columnId: string, blockType: string) => void;
  globalStyles: GlobalStyles;
}) {
  const [dragBlockIndex, setDragBlockIndex] = useState<number | null>(null);
  const [dragOverBlockIndex, setDragOverBlockIndex] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <div
      className={`min-h-[60px] transition-all ${
        isDragOver
          ? 'ring-2 ring-dashed ring-blue-400'
          : isActive
          ? 'ring-1 ring-dashed ring-blue-300'
          : column.blocks.length === 0
          ? 'ring-1 ring-dashed ring-border/60'
          : ''
      }`}
      style={{ width: column.width, backgroundColor: 'transparent' }}
      onClick={onSelectColumn}
      onDragOver={(e) => {
        const hasBlockType = e.dataTransfer.types.includes('blocktype');
        if (hasBlockType) {
          e.preventDefault();
          setIsDragOver(true);
        }
      }}
      onDragEnter={(e) => {
        if (e.dataTransfer.types.includes('blocktype')) {
          setIsDragOver(true);
        }
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        const blockType = e.dataTransfer.getData('blockType');
        if (blockType) {
          e.preventDefault();
          e.stopPropagation();
          onDropBlock(column.id, blockType);
        }
        setIsDragOver(false);
      }}
    >
      {column.blocks.length === 0 ? (
        <div className="flex items-center justify-center h-full min-h-[60px]">
          <p className="text-xs text-muted-foreground">Drop content here</p>
        </div>
      ) : (
        column.blocks.map((block, index) => (
          <div
            key={block.id}
            draggable
            onDragStart={(e) => {
              e.stopPropagation();
              setDragBlockIndex(index);
              e.dataTransfer.effectAllowed = 'move';
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDragOverBlockIndex(index);
            }}
            onDragEnd={() => {
              if (dragBlockIndex !== null && dragOverBlockIndex !== null && dragBlockIndex !== dragOverBlockIndex) {
                onReorderBlocks(column.id, dragBlockIndex, dragOverBlockIndex);
              }
              setDragBlockIndex(null);
              setDragOverBlockIndex(null);
            }}
            className={dragOverBlockIndex === index && dragBlockIndex !== index ? 'border-t-2 border-blue-400' : ''}
          >
            <CanvasBlock
              block={block}
              isSelected={selectedBlockId === block.id}
              onSelect={(e) => { e.stopPropagation(); onSelectBlock(block.id); }}
              onRemove={() => onRemoveBlock(block.id)}
              onDuplicate={() => onDuplicateBlock(block.id)}
              onUpdate={(updates) => onUpdateBlock(block.id, updates)}
              globalStyles={globalStyles}
            />
          </div>
        ))
      )}
    </div>
  );
}

// ─── Canvas Block ───
function CanvasBlock({
  block, isSelected, onSelect, onRemove, onDuplicate, onUpdate, globalStyles,
}: {
  block: BlockData;
  isSelected: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onUpdate: (updates: Partial<BlockData>) => void;
  globalStyles: GlobalStyles;
}) {
  const isTextBlock = block.type === 'heading' || block.type === 'text' || block.type === 'button';
  const isLayoutBlock = block.type === 'heading' || block.type === 'text';
  const editRef = useRef<HTMLDivElement>(null);
  const btnEditRef = useRef<HTMLSpanElement>(null);
  const padding = resolvePadding(block.styles);
  const margin = resolveMargin(block.styles);
  const alignMargins = isLayoutBlock ? resolveBlockAlign(block.styles) : {};
  const hasBorder = isLayoutBlock && block.styles.borderSize && block.styles.borderSize !== '0px';

  // Move cursor to end when block becomes selected
  useEffect(() => {
    if (isSelected && isTextBlock) {
      const el = block.type === 'button' ? btnEditRef.current : editRef.current;
      if (el) {
        el.focus();
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(el);
        range.collapse(false);
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
  }, [isSelected, isTextBlock, block.type]);

  return (
    <div
      className={`relative cursor-pointer transition-all group/block ${
        isSelected ? 'ring-2 ring-blue-500' : 'hover:ring-1 hover:ring-blue-300'
      }`}
      style={{
        padding,
        margin,
        width: isLayoutBlock ? block.styles.width || undefined : undefined,
        maxWidth: isLayoutBlock ? '100%' : undefined,
        backgroundColor: isLayoutBlock ? (block.styles.backgroundColor || 'transparent') : undefined,
        backgroundImage: isLayoutBlock && block.styles.backgroundImage ? `url(${block.styles.backgroundImage})` : undefined,
        backgroundSize: isLayoutBlock && block.styles.backgroundImage ? 'cover' : undefined,
        backgroundPosition: isLayoutBlock && block.styles.backgroundImage ? 'center' : undefined,
        backgroundRepeat: isLayoutBlock && block.styles.backgroundImage ? 'no-repeat' : undefined,
        borderRadius: isLayoutBlock ? block.styles.borderRadius : undefined,
        border: hasBorder ? `${block.styles.borderSize} solid ${block.styles.borderColor || 'transparent'}` : undefined,
        ...alignMargins,
      }}
      onClick={onSelect}
    >
      {/* Block action buttons */}
      <div className={`absolute -top-2 -right-2 flex gap-1 z-20 transition-opacity ${
        isSelected ? 'opacity-100' : 'opacity-0 group-hover/block:opacity-100'
      }`}>
        <button
          onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
          className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-sm hover:bg-blue-600"
          title="Duplicate"
        >
          <Copy size={10} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow-sm hover:bg-red-600"
          title="Delete"
        >
          <Trash2 size={10} />
        </button>
      </div>

      {/* Block content */}
      {isSelected && isTextBlock ? (
        <>
          {block.type === 'button' ? (
            <div style={{ textAlign: block.styles.textAlign as React.CSSProperties['textAlign'] }}>
              <span
                style={{
                  display: 'inline-block',
                  backgroundColor: block.styles.backgroundColor || globalStyles.btnBackgroundColor,
                  color: block.styles.color || globalStyles.btnFontColor,
                  fontSize: block.styles.fontSize || globalStyles.btnFontSize,
                  fontWeight: block.styles.fontWeight || globalStyles.btnFontWeight,
                  fontFamily: block.styles.fontFamily || globalStyles.btnFontFamily,
                  padding: block.styles.padding,
                  borderRadius: block.styles.borderRadius || globalStyles.btnBorderRadius,
                  border: `${block.styles.borderSize || globalStyles.btnBorderSize} solid ${block.styles.borderColor || globalStyles.btnBorderColor}`,
                  lineHeight: block.styles.lineHeight || 'inherit',
                  letterSpacing: block.styles.letterSpacing || 'inherit',
                }}
              >
                <span
                  ref={btnEditRef}
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => onUpdate({ content: { ...block.content, text: e.currentTarget.textContent || '' } })}
                  style={{ outline: 'none', minWidth: '20px', display: 'inline-block' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {block.content.text as string}
                </span>
              </span>
            </div>
          ) : (
            <div
              ref={editRef}
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => onUpdate({ content: { ...block.content, text: e.currentTarget.textContent || '' } })}
              style={{
                fontSize: block.styles.fontSize || 'inherit',
                fontWeight: block.styles.fontWeight || 'inherit',
                fontFamily: block.styles.fontFamily || 'inherit',
                fontStyle: block.styles.fontStyle || 'normal',
                textDecoration: block.styles.textDecoration || 'none',
                color: block.styles.color || 'inherit',
                textAlign: block.styles.textAlign as React.CSSProperties['textAlign'],
                lineHeight: block.styles.lineHeight || 'inherit',
                letterSpacing: block.styles.letterSpacing || 'inherit',
                outline: 'none',
                minHeight: '1em',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {block.content.text as string}
            </div>
          )}
          <FloatingToolbar block={block} onUpdate={onUpdate} />
        </>
      ) : (
        renderBlock(block, globalStyles)
      )}
    </div>
  );
}

// ─── Block Renderers ───
function renderBlock(block: BlockData, globalStyles: GlobalStyles) {
  // Use inherit to let global styles cascade, unless block has a specific override
  const resolveColor = (blockColor: string) => blockColor || 'inherit';
  const resolveFontSize = (blockSize: string) => blockSize || 'inherit';
  const resolveFontWeight = (blockWeight: string) => blockWeight || 'inherit';

  switch (block.type) {
    case 'heading':
      return (
        <div style={{
          fontSize: resolveFontSize(block.styles.fontSize),
          fontWeight: resolveFontWeight(block.styles.fontWeight),
          fontFamily: block.styles.fontFamily || 'inherit',
          fontStyle: block.styles.fontStyle || 'normal', textDecoration: block.styles.textDecoration || 'none',
          color: resolveColor(block.styles.color),
          textAlign: block.styles.textAlign as React.CSSProperties['textAlign'],
          lineHeight: block.styles.lineHeight || 'inherit',
          letterSpacing: block.styles.letterSpacing || 'inherit',
        }}>
          {block.content.text as string || 'Heading'}
        </div>
      );
    case 'text':
      return (
        <div style={{
          fontSize: resolveFontSize(block.styles.fontSize),
          fontWeight: resolveFontWeight(block.styles.fontWeight),
          fontFamily: block.styles.fontFamily || 'inherit',
          fontStyle: block.styles.fontStyle || 'normal', textDecoration: block.styles.textDecoration || 'none',
          color: resolveColor(block.styles.color),
          textAlign: block.styles.textAlign as React.CSSProperties['textAlign'],
          lineHeight: block.styles.lineHeight || 'inherit',
          letterSpacing: block.styles.letterSpacing || 'inherit',
        }}>
          {block.content.text as string || 'Enter text...'}
        </div>
      );
    case 'image':
      return (
        <div style={{ textAlign: block.styles.textAlign as React.CSSProperties['textAlign'] }}>
          {block.content.src ? (
            <img src={block.content.src as string} alt={block.content.alt as string} style={{ width: block.styles.width, maxWidth: '100%' }} />
          ) : (
            <div className="bg-muted rounded-md flex items-center justify-center py-8">
              <p className="text-xs text-muted-foreground">No image — set URL in properties</p>
            </div>
          )}
        </div>
      );
    case 'button':
      return (
        <div style={{ textAlign: block.styles.textAlign as React.CSSProperties['textAlign'] }}>
          <span style={{
            display: 'inline-block',
            backgroundColor: block.styles.backgroundColor || globalStyles.btnBackgroundColor,
            color: block.styles.color || globalStyles.btnFontColor,
            fontSize: block.styles.fontSize || globalStyles.btnFontSize,
            fontFamily: block.styles.fontFamily || globalStyles.btnFontFamily,
            fontWeight: block.styles.fontWeight || globalStyles.btnFontWeight,
            padding: block.styles.padding,
            borderRadius: block.styles.borderRadius || globalStyles.btnBorderRadius,
            border: `${block.styles.borderSize || globalStyles.btnBorderSize} solid ${block.styles.borderColor || globalStyles.btnBorderColor}`,
            cursor: 'pointer',
          }}>
            {block.content.text as string || 'Button'}
          </span>
        </div>
      );
    case 'divider':
      return <hr style={{ borderColor: block.styles.borderColor, borderWidth: block.styles.borderWidth }} />;
    case 'table': {
      const headers = (block.content.headers || []) as string[];
      const rows = (block.content.rows || []) as string[][];
      return (
        <table className="w-full border-collapse" style={{ fontSize: block.styles.fontSize || 'inherit', color: block.styles.color || 'inherit' }}>
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th key={i} className="border border-border bg-muted px-3 py-2 text-left text-xs font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td key={ci} className="border border-border px-3 py-2 text-xs">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
    case 'signature':
      return (
        <div style={{ fontSize: block.styles.fontSize || 'inherit', color: block.styles.color || 'inherit' }}>
          <div className="border-t border-border w-48 mb-2" />
          <p className="font-medium">{block.content.name as string || 'Name'}</p>
          <p className="text-muted-foreground text-xs">{block.content.title as string || 'Title'}</p>
        </div>
      );
    default:
      return <div className="text-xs text-muted-foreground">Unknown block</div>;
  }
}




