'use client';

import { useState, useRef, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { TemplateData, BlockData, RowLayout, LAYOUT_OPTIONS } from '@/lib/editor-types';
import CollabCursors from './CollabCursors';
import { CollabUser } from '@/hooks/use-collaboration';
import { CanvasRow } from './canvas/CanvasRow';

interface CanvasProps {
  template: TemplateData;
  editDevice: 'desktop' | 'tablet' | 'mobile';
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
  onDropSection: (sectionId: string) => void;
  onDropStockImage: (url: string) => void;
  // Collaboration
  collaborators?: CollabUser[];
  onCursorMove?: (x: number, y: number) => void;
}

export default function Canvas({
  template,
  editDevice,
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
  onDropSection,
  onDropStockImage,
  collaborators,
  onCursorMove,
}: CanvasProps) {
  const scrollableRef = useRef<HTMLDivElement>(null);
  // Ref to the fixed-width inner template box — cursor coords are relative to this,
  // so the same % maps to the same visual position regardless of monitor size.
  const innerRef = useRef<HTMLDivElement>(null);
  const cursorThrottle = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onCursorMove || cursorThrottle.current) return;
    cursorThrottle.current = setTimeout(() => { cursorThrottle.current = null; }, 30);
    const inner = innerRef.current;
    if (!inner) return;
    const rect = inner.getBoundingClientRect();
    // Both axes are % of the inner template box dimensions.
    // clientX/Y minus the box's current viewport rect accounts for scroll automatically
    // (scrolling moves the box up/left, changing rect.top/left).
    const x = (e.clientX - rect.left) / rect.width * 100;
    const y = (e.clientY - rect.top)  / rect.height * 100;
    onCursorMove(Math.max(0, Math.min(100, x)), Math.max(0, Math.min(100, y)));
  };

  return (
    <div
      ref={scrollableRef}
      className="overflow-y-auto p-8"
      onMouseMove={handleMouseMove}
      style={{
        height: '100%',
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
        ref={innerRef}
        className={`mx-auto min-h-[500px] shadow-lg rounded-sm relative transition-all duration-300 ${
          canvasDragOver ? 'ring-2 ring-dashed ring-blue-400 ring-offset-4' : ''
        }`}
        style={{
          width: editDevice === 'mobile' ? '320px' : editDevice === 'tablet' ? '480px' : template.globalStyles.width,
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
          if (e.dataTransfer.types.includes('blocktype') || e.dataTransfer.types.includes('sectionid') || e.dataTransfer.types.includes('stockimageurl')) {
            e.preventDefault();
            setCanvasDragOver(true);
          }
        }}
        onDragLeave={(e) => {
          if (e.currentTarget === e.target) setCanvasDragOver(false);
        }}
        onDrop={(e) => {
          const blockType = e.dataTransfer.getData('blockType');
          const sectionId = e.dataTransfer.getData('sectionId');
          const stockImageUrl = e.dataTransfer.getData('stockImageUrl');
          if (blockType) {
            e.preventDefault();
            e.stopPropagation();
            onDropBlockToCanvas(blockType);
          } else if (sectionId) {
            e.preventDefault();
            e.stopPropagation();
            onDropSection(sectionId);
          } else if (stockImageUrl) {
            e.preventDefault();
            e.stopPropagation();
            onDropStockImage(stockImageUrl);
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
          template.rows.map((row, index) => {
            // If the currently-edited text/heading/button block lives in THIS row,
            // the row must not be draggable — otherwise mouse-drag text selection
            // starts a native row drag instead of selecting text.
            const editingTextInRow =
              selectedBlockId !== null &&
              row.columns.some((c) =>
                c.blocks.some(
                  (b) =>
                    b.id === selectedBlockId &&
                    (b.type === 'text' || b.type === 'heading' || b.type === 'button'),
                ),
              );
            return (
            <div key={row.id}>
              {/* Drop indicator line — above this row */}
              {isExternalDrag && dropIndicatorIndex === index && (
                <div className="h-0.5 bg-blue-500 mx-2 rounded-full" />
              )}
              <div
                draggable={!editingTextInRow}
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
            );
          })
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

        {/* Cursors inside the inner box so left/top % are relative to the fixed-width
            template area — identical on all screen sizes */}
        {collaborators && collaborators.length > 0 && (
          <CollabCursors users={collaborators} />
        )}
      </div>
    </div>
  );
}
