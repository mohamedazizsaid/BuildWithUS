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
}

const EMOJI_CATEGORIES: { icon: string; name: string; emojis: string[] }[] = [
  { icon: '😀', name: 'Smileys', emojis: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','🥲','😋','😛','😜','🤪','😝','🤗','🤭','🤫','🤔','😏','🥳'] },
  { icon: '👋', name: 'People', emojis: ['👋','🤚','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','💪'] },
  { icon: '🐶', name: 'Nature', emojis: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🐧','🐦','🐤','🦆','🦅','🦉','🐺','🐗','🐴','🦋','🐛','🐝','🐞','🌸'] },
  { icon: '🍕', name: 'Food', emojis: ['🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🥑','🍕','🍔','🍟','🌭','🍿','🥤','☕','🍩','🍰','🧁','🍫','🍪','🍬'] },
  { icon: '✈️', name: 'Travel', emojis: ['✈️','🚀','🚗','🚕','🚌','🚎','🏎️','🚓','🚑','🚒','🛸','🚁','⛵','🚢','🏠','🏢','🏰','🗼','🗽','⛪','🕌','🕍','⛩️','🌍','🌎','🌏','🗺️','🧭','🏔️','🌋'] },
  { icon: '⚽', name: 'Sports', emojis: ['⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🏓','🏸','🏒','🥊','🥋','🎯','⛳','🥅','🎿','🛷','🏂','🏋️','🤸','🤼','🤽','🚴','🏇','🧗','🤺','🏊'] },
  { icon: '💡', name: 'Objets', emojis: ['💡','🔦','🕯️','📱','💻','⌨️','🖥️','🖨️','📷','📹','🎥','📺','📻','🎙️','🎧','🔔','📣','📢','🔑','🗝️','🔒','🔓','📦','📫','📬','📮','📝','📄','📋','📌'] },
  { icon: '💬', name: 'Symboles', emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','❣️','💕','💞','💓','💗','💖','💘','💝','✅','❌','⭐','💯','❗','❓','⁉️','‼️','⚡','♻️','🔴'] },
  { icon: '🎉', name: 'Fêtes', emojis: ['🎉','🎊','🎈','🎂','🎁','🎀','🪅','🎆','🎇','✨','🎍','🎎','🎏','🎐','🎑','🧨','🎄','🎋','🎃','👻','🎅','🤶','🧑‍🎄','🦌','🍾','🥂','🥳','🪩','🎭','🎪'] },
  { icon: '🔥', name: 'Tendance', emojis: ['🔥','💯','✨','🚀','💎','👑','🏆','🥇','⚡','💥','🌟','🎯','💪','🙌','👏','🤝','💰','📈','🧠','💡','🎉','❤️‍🔥','🦄','🌈','☀️','🌙','⭐','🔥','✅','💫'] },
  { icon: '❤️', name: 'Coeurs', emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','❤️‍🩹','❣️','💕','💞','💓','💗','💖','💘','💝','💟','💌','💑','💏','👩‍❤️‍👨','💒','🫶','🥰','😍','😘'] },
  { icon: '🌙', name: 'Ciel', emojis: ['🌙','⭐','🌟','✨','💫','☀️','🌤️','⛅','🌥️','☁️','🌦️','🌧️','⛈️','🌩️','🌪️','🌈','❄️','☃️','⛄','🌊','💧','💦','🌬️','🔥','🌠','🌌','🪐','🌑','🌒','🌕'] },
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
}: CanvasProps) {
  const [showAddRow, setShowAddRow] = useState(false);
  const [dragRowIndex, setDragRowIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [canvasDragOver, setCanvasDragOver] = useState(false);
  // Drop indicator: which row index to show the blue line above (-1 = after last row)
  const [dropIndicatorIndex, setDropIndicatorIndex] = useState<number | null>(null);
  const [isExternalDrag, setIsExternalDrag] = useState(false);

  // Global cleanup: clear ALL drag state when any drag ends
  useEffect(() => {
    const cleanup = () => {
      setTimeout(() => {
        setCanvasDragOver(false);
        setDragOverIndex(null);
        setDragRowIndex(null);
        setDropIndicatorIndex(null);
        setIsExternalDrag(false);
      }, 0);
    };
    document.addEventListener('dragend', cleanup, true);
    document.addEventListener('drop', cleanup, true);
    return () => {
      document.removeEventListener('dragend', cleanup, true);
      document.removeEventListener('drop', cleanup, true);
    };
  }, []);

  return (
    <div
      className="overflow-y-auto p-8"
      style={{
        height: 'calc(100vh - 7rem)',
        backgroundImage: `
          linear-gradient(45deg, #e2e8f0 25%, transparent 25%),
          linear-gradient(-45deg, #e2e8f0 25%, transparent 25%),
          linear-gradient(45deg, transparent 75%, #e2e8f0 75%),
          linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)
        `,
        backgroundSize: '20px 20px',
        backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
        backgroundColor: '#e2e8f0',
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
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onSelectBlock(null);
            onSelectRow(null);
            onSelectColumn(null);
          }
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
          setDropIndicatorIndex(null);
          setIsExternalDrag(false);
        }}
      >
        {template.rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Plus size={20} className="text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-1">Glissez du contenu ici pour commencer</p>
            <p className="text-xs text-muted-foreground">Ou ajoutez une disposition ci-dessous</p>
          </div>
        ) : (
          template.rows.map((row, index) => (
            <div key={row.id}>
              {/* Drop indicator line — above this row */}
              {isExternalDrag && dropIndicatorIndex === index && (
                <div className="h-0.5 bg-blue-500 mx-2 rounded-full" />
              )}
              <div
                draggable
                onDragStart={(e) => {
                  if (e.dataTransfer.types.includes('blocktype')) return;
                  setDragRowIndex(index);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dragRowIndex !== null) {
                    setDragOverIndex(index);
                  } else if (e.dataTransfer.types.includes('blocktype')) {
                    // External drag from panel — calculate if cursor is in top or bottom half
                    const rect = e.currentTarget.getBoundingClientRect();
                    const midY = rect.top + rect.height / 2;
                    setIsExternalDrag(true);
                    setDropIndicatorIndex(e.clientY < midY ? index : index + 1);
                  }
                }}
                onDragEnd={() => {
                  if (dragRowIndex !== null && dragOverIndex !== null && dragRowIndex !== dragOverIndex) {
                    onReorderRows(dragRowIndex, dragOverIndex);
                  }
                  setDragRowIndex(null);
                  setDragOverIndex(null);
                  setDropIndicatorIndex(null);
                  setIsExternalDrag(false);
                }}
                className={dragOverIndex === index && dragRowIndex !== null && dragRowIndex !== index ? 'border-t-2 border-blue-500' : ''}
              >
                <CanvasRow
                  row={row}
                  isSelected={selectedRowId === row.id}
                  selectedBlockId={selectedBlockId}
                  onSelectRow={(e) => { e.stopPropagation(); onSelectRow(row.id); onSelectBlock(null); onSelectColumn(null); }}
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
              {/* Drop indicator line — after last row */}
              {isExternalDrag && dropIndicatorIndex === index + 1 && index === template.rows.length - 1 && (
                <div className="h-0.5 bg-blue-500 mx-2 rounded-full" />
              )}
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
            <span className="text-[11px] text-muted-foreground group-hover:text-muted-foreground">Disposition</span>
          </div>
        </div>

        {showAddRow && (
          <div className="absolute left-1/2 -translate-x-1/2 bottom-12 z-50" onClick={(e) => e.stopPropagation()}>
            <div className="bg-background rounded-xl shadow-xl border border-border p-3 w-56">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Disposition en colonnes</p>
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
// ─── Swipeable Emoji Picker ───
function EmojiPicker({ onSelect }: { onSelect: (emoji: string) => void }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [touchStartX, setTouchStartX] = useState(0);
  const cat = EMOJI_CATEGORIES[activeIdx];

  const prev = () => setActiveIdx((i) => Math.max(0, i - 1));
  const next = () => setActiveIdx((i) => Math.min(EMOJI_CATEGORIES.length - 1, i + 1));

  return (
    <div
      className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 w-[320px] h-[290px] rounded-2xl border border-white/10 bg-slate-900 shadow-[0_8px_32px_rgba(0,0,0,0.3)] overflow-hidden select-none"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Category tabs */}
      <div className="flex gap-0.5 px-2 pt-2 pb-1 overflow-x-auto no-scrollbar">
        {EMOJI_CATEGORIES.map((c, i) => (
          <button
            key={c.name}
            onClick={() => setActiveIdx(i)}
            className={`flex-shrink-0 w-7 h-7 rounded-lg text-sm flex items-center justify-center transition-all ${
              i === activeIdx ? 'bg-white/20 scale-110' : 'hover:bg-white/10'
            }`}
            title={c.name}
          >
            {c.icon}
          </button>
        ))}
      </div>

      {/* Category name */}
      <div className="px-3 py-1">
        <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">{cat.name}</p>
      </div>

      {/* Emoji grid — swipeable */}
      <div
        className="px-3 pb-2"
        onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
        onTouchEnd={(e) => {
          const diff = touchStartX - e.changedTouches[0].clientX;
          if (diff > 50) next();
          else if (diff < -50) prev();
        }}
      >
        <div className="grid grid-cols-6 gap-1">
          {cat.emojis.map((emoji, i) => (
            <button
              key={`${emoji}-${i}`}
              onClick={() => onSelect(emoji)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[22px] hover:bg-white/10 hover:scale-125 transition-all cursor-pointer"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation arrows + dots */}
      <div className="flex items-center justify-between px-3 pb-2">
        <button onClick={prev} className={`text-white/40 hover:text-white text-xs transition-colors ${activeIdx === 0 ? 'invisible' : ''}`}>←</button>
        <div className="flex gap-1">
          {EMOJI_CATEGORIES.map((_, i) => (
            <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === activeIdx ? 'bg-white w-3' : 'bg-white/20'}`} />
          ))}
        </div>
        <button onClick={next} className={`text-white/40 hover:text-white text-xs transition-colors ${activeIdx === EMOJI_CATEGORIES.length - 1 ? 'invisible' : ''}`}>→</button>
      </div>
    </div>
  );
}

// ─── Toolbar Button ───
function ToolBtn({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
        active ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white hover:bg-white/10'
      }`}
    >
      {children}
    </button>
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
      onUpdate({ content: { ...block.content, href: linkUrl } });
      onUpdate({ styles: { ...block.styles, textDecoration: 'underline', color: '#2563eb' } });
    }
    setShowLink(false);
    setLinkUrl('');
  };

  return (
    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-0.5 bg-slate-900/95 backdrop-blur-sm rounded-xl px-1.5 py-1 shadow-[0_8px_24px_rgba(0,0,0,0.25)] border border-white/10">
        <ToolBtn active={isBold} onClick={() => toggleStyle('fontWeight', 'bold', 'normal')}><Bold size={14} /></ToolBtn>
        <ToolBtn active={isItalic} onClick={() => toggleStyle('fontStyle', 'italic', 'normal')}><Italic size={14} /></ToolBtn>
        <ToolBtn active={isUnderline} onClick={() => toggleStyle('textDecoration', 'underline', 'none')}><Underline size={14} /></ToolBtn>
        <div className="w-px h-5 bg-white/10 mx-1" />
        <ToolBtn active={block.styles.textAlign === 'left'} onClick={() => onUpdate({ styles: { ...block.styles, textAlign: 'left' } })}><AlignLeft size={14} /></ToolBtn>
        <ToolBtn active={block.styles.textAlign === 'center'} onClick={() => onUpdate({ styles: { ...block.styles, textAlign: 'center' } })}><AlignCenter size={14} /></ToolBtn>
        <ToolBtn active={block.styles.textAlign === 'right'} onClick={() => onUpdate({ styles: { ...block.styles, textAlign: 'right' } })}><AlignRight size={14} /></ToolBtn>
        <div className="w-px h-5 bg-white/10 mx-1" />
        <ToolBtn active={showLink} onClick={() => { setShowLink(!showLink); setShowEmoji(false); }}><Link2 size={14} /></ToolBtn>
        <ToolBtn active={showEmoji} onClick={() => { setShowEmoji(!showEmoji); setShowLink(false); }}><Smile size={14} /></ToolBtn>
      </div>

      {showEmoji && <EmojiPicker onSelect={insertEmoji} />}

      {showLink && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-slate-900/95 backdrop-blur-sm rounded-xl border border-white/10 shadow-[0_8px_24px_rgba(0,0,0,0.25)] p-3 z-50 flex gap-2">
          <input
            type="text"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://..."
            className="text-xs bg-white/10 text-white border border-white/10 rounded-lg px-3 py-1.5 w-52 focus:outline-none focus:ring-1 focus:ring-white/30 placeholder:text-white/30"
            onKeyDown={(e) => { if (e.key === 'Enter') applyLink(); }}
          />
          <button onClick={applyLink} className="text-xs bg-white/20 text-white px-3 py-1.5 rounded-lg hover:bg-white/30 transition-colors">
            OK
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Canvas Row ───
function CanvasRow({
  row, isSelected, selectedBlockId,
  onSelectRow, onSelectBlock, onSelectColumn, onRemoveRow,
  onRemoveBlock, onDuplicateBlock, onUpdateBlock, onReorderBlocks, onDropBlock, globalStyles,
}: {
  row: Row;
  isSelected: boolean;
  selectedBlockId: string | null;
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
      className={`group relative ${
        isSelected ? 'ring-1 ring-blue-400' : ''
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
  column, selectedBlockId,
  onSelectColumn, onSelectBlock, onRemoveBlock, onDuplicateBlock, onUpdateBlock, onReorderBlocks, onDropBlock, globalStyles,
}: {
  column: Column;
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

  return (
    <div
      className="min-h-[60px]"
      style={{ width: column.width, backgroundColor: 'transparent', minWidth: 0 }}
      onClick={onSelectColumn}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('blocktype')) {
          e.preventDefault();
        }
      }}
      onDrop={(e) => {
        const blockType = e.dataTransfer.getData('blockType');
        if (blockType) {
          e.preventDefault();
          e.stopPropagation();
          onDropBlock(column.id, blockType);
        }
      }}
    >
      {column.blocks.length === 0 ? (
        <div className="flex items-center justify-center h-full min-h-[60px]">
          <p className="text-xs text-muted-foreground">Déposez du contenu ici</p>
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
              if (dragBlockIndex !== null) setDragOverBlockIndex(index);
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
        height: 'auto',
        overflow: 'visible',
        width: isLayoutBlock ? block.styles.width || undefined : undefined,
        maxWidth: isLayoutBlock ? '100%' : undefined,
        backgroundColor: isLayoutBlock ? (block.styles.backgroundColor || 'transparent') : undefined,
        backgroundImage: isLayoutBlock && block.styles.backgroundImage ? `url(${block.styles.backgroundImage})` : undefined,
        backgroundSize: isLayoutBlock && block.styles.backgroundImage ? 'cover' : undefined,
        backgroundPosition: isLayoutBlock && block.styles.backgroundImage ? 'center' : undefined,
        backgroundRepeat: isLayoutBlock && block.styles.backgroundImage ? 'no-repeat' : undefined,
        borderRadius: isLayoutBlock ? block.styles.borderRadius : undefined,
        border: hasBorder ? `${block.styles.borderSize} ${block.styles.borderStyle || 'solid'} ${block.styles.borderColor || 'transparent'}` : undefined,
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
          title="Dupliquer"
        >
          <Copy size={10} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow-sm hover:bg-red-600"
          title="Supprimer"
        >
          <Trash2 size={10} />
        </button>
      </div>

      {/* Block content */}
      <div style={{ overflow: 'hidden', wordBreak: 'break-word' as const }}>
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
                minHeight: '1.2em',
                wordBreak: 'break-word' as const,
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
          {block.content.text as string || 'Titre'}
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
          {block.content.text as string || 'Texte'}
        </div>
      );
    case 'image': {
      const imgBorderSize = block.styles.borderSize || '0px';
      const imgBorderStyle = block.styles.borderStyle || 'solid';
      const imgBorderColor = block.styles.borderColor || 'transparent';
      const imgHasBorder = imgBorderSize !== '0px' && imgBorderSize !== '0';
      return (
        <div style={{ textAlign: block.styles.textAlign as React.CSSProperties['textAlign'] }}>
          {block.content.src ? (
            <img
              src={block.content.src as string}
              alt={block.content.alt as string}
              style={{
                width: block.styles.width,
                maxWidth: '100%',
                borderRadius: block.styles.borderRadius || '0px',
                border: imgHasBorder ? `${imgBorderSize} ${imgBorderStyle} ${imgBorderColor}` : 'none',
                display: 'inline-block',
                ...(block.styles.borderRadius === '50%' ? { aspectRatio: '1/1', objectFit: 'cover' as const } : {}),
              }}
            />
          ) : (
            <div className="bg-muted rounded-md flex items-center justify-center py-8">
              <p className="text-xs text-muted-foreground">Pas d&apos;image — définir l&apos;URL dans les propriétés</p>
            </div>
          )}
        </div>
      );
    }
    case 'video': {
      const videoType = (block.content.type as string) || 'upload';
      const youtubeMatch = (block.content.src as string || '').match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
      const youtubeId = youtubeMatch ? youtubeMatch[1] : null;
      return (
        <div style={{ textAlign: block.styles.textAlign as React.CSSProperties['textAlign'], padding: block.styles.padding }}>
          {videoType === 'youtube' && youtubeId ? (
            <div style={{ width: block.styles.width, maxWidth: '100%', margin: block.styles.textAlign === 'center' ? '0 auto' : undefined, borderRadius: block.styles.borderRadius, overflow: 'hidden' }}>
              <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
                <iframe
                  src={`https://www.youtube.com/embed/${youtubeId}`}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          ) : block.content.src ? (
            <div style={{ position: 'relative', width: block.styles.width, maxWidth: '100%', margin: block.styles.textAlign === 'center' ? '0 auto' : undefined, borderRadius: block.styles.borderRadius, overflow: 'hidden' }}>
              {block.content.cover ? (
                <div style={{ position: 'relative' }}>
                  <img src={block.content.cover as string} alt="Cover" style={{ width: '100%', display: 'block' }} />
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: 0, height: 0, borderLeft: '14px solid #0f172a', borderTop: '9px solid transparent', borderBottom: '9px solid transparent', marginLeft: 3 }} />
                    </div>
                  </div>
                </div>
              ) : (
                <video src={block.content.src as string} style={{ width: '100%', display: 'block' }} controls />
              )}
            </div>
          ) : (
            <div className="bg-muted rounded-md flex flex-col items-center justify-center py-10 gap-2">
              <div className="w-10 h-10 rounded-full bg-muted-foreground/10 flex items-center justify-center">
                <div style={{ width: 0, height: 0, borderLeft: '10px solid currentColor', borderTop: '6px solid transparent', borderBottom: '6px solid transparent', marginLeft: 2 }} className="text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">Aucune vidéo</p>
            </div>
          )}
        </div>
      );
    }
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
            {block.content.text as string || 'Bouton'}
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
      return <div className="text-xs text-muted-foreground">Bloc inconnu</div>;
  }
}




