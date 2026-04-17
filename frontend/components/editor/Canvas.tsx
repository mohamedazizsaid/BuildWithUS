'use client';

import { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, GripVertical, Copy } from 'lucide-react';
import { TemplateData, BlockData, Row, Column, RowLayout, LAYOUT_OPTIONS, GlobalStyles } from '@/lib/editor-types';
import CollabCursors from './CollabCursors';
import { CollabUser } from '@/hooks/use-collaboration';

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

        {/* Cursors inside the inner box so left/top % are relative to the fixed-width
            template area — identical on all screen sizes */}
        {collaborators && collaborators.length > 0 && (
          <CollabCursors users={collaborators} />
        )}
      </div>
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
      className={`group relative outline outline-2 outline-offset-[-2px] transition-[outline-color] cursor-pointer ${
        isSelected
          ? 'outline-blue-500'
          : 'outline-transparent hover:outline-blue-300 hover:outline-dashed'
      }`}
      style={{ backgroundColor: row.styles.backgroundColor === 'transparent' ? 'transparent' : row.styles.backgroundColor, padding: row.styles.padding }}
      onClick={onSelectRow}
    >
      {/* Section label tab — visible on hover or when selected */}
      <div className={`absolute -top-5 left-0 h-5 px-2 flex items-center gap-1 text-[10px] font-medium rounded-t transition-opacity select-none pointer-events-none ${
        isSelected ? 'bg-blue-500 text-white opacity-100' : 'bg-blue-300 text-white opacity-0 group-hover:opacity-100'
      }`}>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><rect x="0" y="0" width="10" height="3" rx="1"/><rect x="0" y="5" width="10" height="3" rx="1"/></svg>
        Section
      </div>

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

// ─── Resizable Image ───
function ResizableImage({ block, onUpdate, globalStyles }: { block: BlockData; onUpdate: (updates: Partial<BlockData>) => void; globalStyles: GlobalStyles }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<'right' | 'bottom' | 'corner' | null>(null);
  const startPos = useRef({ x: 0, y: 0, w: 0, h: 0 });

  const imgBorderSize = block.styles.borderSize || '0px';
  const imgBorderStyle = block.styles.borderStyle || 'solid';
  const imgBorderColor = block.styles.borderColor || 'transparent';
  const imgHasBorder = imgBorderSize !== '0px' && imgBorderSize !== '0';
  const isCircle = block.styles.borderRadius === '50%';

  const onMouseDown = (e: React.MouseEvent, handle: 'right' | 'bottom' | 'corner') => {
    e.preventDefault();
    e.stopPropagation();
    const img = containerRef.current?.querySelector('img');
    if (!img) return;
    startPos.current = { x: e.clientX, y: e.clientY, w: img.offsetWidth, h: img.offsetHeight };
    setDragging(handle);

    const onMouseMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startPos.current.x;
      const dy = ev.clientY - startPos.current.y;
      const parent = containerRef.current?.parentElement;
      const maxW = parent ? parent.offsetWidth : 600;

      if (handle === 'right' || handle === 'corner') {
        const newW = Math.max(30, Math.min(maxW, startPos.current.w + dx));
        const pct = Math.round((newW / maxW) * 100);
        onUpdate({ styles: { ...block.styles, width: `${pct}%` } });
      }
      if (handle === 'bottom' || handle === 'corner') {
        const newH = Math.max(30, startPos.current.h + dy);
        onUpdate({ styles: { ...block.styles, height: `${newH}px` } });
      }
    };

    const onMouseUp = () => {
      setDragging(null);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div ref={containerRef} style={{ textAlign: block.styles.textAlign as React.CSSProperties['textAlign'], position: 'relative', display: 'inline-block', width: '100%' }} onClick={(e) => e.stopPropagation()}>
      <div style={{ position: 'relative', display: 'inline-block', width: block.styles.width, maxWidth: '100%' }}>
        <img
          src={block.content.src as string}
          alt={block.content.alt as string}
          style={{
            width: '100%',
            height: block.styles.height || 'auto',
            objectFit: block.styles.height ? 'cover' as const : undefined,
            borderRadius: block.styles.borderRadius || '0px',
            border: imgHasBorder ? `${imgBorderSize} ${imgBorderStyle} ${imgBorderColor}` : 'none',
            display: 'block',
            ...(isCircle ? { aspectRatio: '1/1', objectFit: 'cover' as const } : {}),
          }}
          draggable={false}
        />
        {/* Right handle */}
        <div
          onMouseDown={(e) => onMouseDown(e, 'right')}
          className={`absolute top-1/2 -right-1 -translate-y-1/2 w-2.5 h-10 rounded-full cursor-ew-resize transition-colors ${dragging === 'right' ? 'bg-blue-500' : 'bg-blue-400/70 hover:bg-blue-500'}`}
        />
        {/* Bottom handle */}
        <div
          onMouseDown={(e) => onMouseDown(e, 'bottom')}
          className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-10 h-2.5 rounded-full cursor-ns-resize transition-colors ${dragging === 'bottom' ? 'bg-blue-500' : 'bg-blue-400/70 hover:bg-blue-500'}`}
        />
        {/* Corner handle */}
        <div
          onMouseDown={(e) => onMouseDown(e, 'corner')}
          className={`absolute -bottom-1.5 -right-1.5 w-4 h-4 rounded-full cursor-nwse-resize border-2 border-white transition-colors ${dragging === 'corner' ? 'bg-blue-500' : 'bg-blue-400/70 hover:bg-blue-500'}`}
        />
        {/* Size indicator */}
        {dragging && (
          <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px]">
            {block.styles.width}{block.styles.height ? ` × ${block.styles.height}` : ''}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Editable Table (Word-style) ───
function EditableTable({ block, onUpdate }: { block: BlockData; onUpdate: (updates: Partial<BlockData>) => void }) {
  const tableRef = useRef<HTMLTableElement>(null);
  const borderColor = block.styles.tableBorderColor || '#dddddd';
  const headerBg = block.styles.headerBg || '#f1f5f9';

  // Use refs to always have latest data without stale closures
  const dataRef = useRef({
    headers: (block.content.headers || []) as string[],
    rows: (block.content.rows || []) as string[][],
  });

  // Sync from props
  useEffect(() => {
    dataRef.current = {
      headers: (block.content.headers || []) as string[],
      rows: (block.content.rows || []) as string[][],
    };
  }, [block.content.headers, block.content.rows]);

  // Read all cell values from DOM and save to state
  const saveAll = () => {
    if (!tableRef.current) return;
    const newHeaders: string[] = [];
    const newRows: string[][] = [];

    const thCells = tableRef.current.querySelectorAll('thead th [contenteditable]');
    thCells.forEach((el) => newHeaders.push(el.textContent || ''));

    const bodyRows = tableRef.current.querySelectorAll('tbody tr');
    bodyRows.forEach((tr) => {
      const cells: string[] = [];
      tr.querySelectorAll('td [contenteditable]').forEach((el) => cells.push(el.textContent || ''));
      if (cells.length > 0) newRows.push(cells);
    });

    if (newHeaders.length > 0) {
      dataRef.current = { headers: newHeaders, rows: newRows };
      onUpdate({ content: { ...block.content, headers: newHeaders, rows: newRows } });
    }
  };

  const addColumn = () => {
    saveAll();
    const d = dataRef.current;
    const newHeaders = [...d.headers, `Col ${d.headers.length + 1}`];
    const newRows = d.rows.map(r => [...r, '']);
    onUpdate({ content: { ...block.content, headers: newHeaders, rows: newRows } });
  };

  const addRow = () => {
    saveAll();
    const d = dataRef.current;
    const newRows = [...d.rows, d.headers.map(() => '')];
    onUpdate({ content: { ...block.content, rows: newRows } });
  };

  const removeColumn = (idx: number) => {
    saveAll();
    const d = dataRef.current;
    if (d.headers.length <= 1) return;
    const newHeaders = d.headers.filter((_, i) => i !== idx);
    const newRows = d.rows.map(r => r.filter((_, i) => i !== idx));
    onUpdate({ content: { ...block.content, headers: newHeaders, rows: newRows } });
  };

  const removeRow = (idx: number) => {
    saveAll();
    const d = dataRef.current;
    const newRows = d.rows.filter((_, i) => i !== idx);
    onUpdate({ content: { ...block.content, rows: newRows } });
  };

  // Save on any cell blur
  const onCellBlur = () => saveAll();

  const headers = (block.content.headers || []) as string[];
  const rows = (block.content.rows || []) as string[][];

  const cellStyle: React.CSSProperties = {
    border: `1px solid ${borderColor}`,
    padding: '6px 10px',
    minWidth: '50px',
    position: 'relative' as const,
  };

  const editableStyle: React.CSSProperties = {
    outline: 'none',
    minHeight: '1.2em',
    fontSize: block.styles.fontSize || '13px',
    color: block.styles.color || 'inherit',
    fontFamily: block.styles.fontFamily || 'inherit',
  };

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <table ref={tableRef} style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={`h-${i}-${headers.length}`} style={{ ...cellStyle, backgroundColor: headerBg, fontWeight: 600 }}>
                <div
                  contentEditable
                  suppressContentEditableWarning
                  spellCheck={false}
                  onBlur={onCellBlur}
                  style={editableStyle}
                  onKeyDown={(e) => { if (e.key === 'Tab') { e.preventDefault(); document.execCommand('insertText', false, '\u00a0\u00a0'); } }}
                  dangerouslySetInnerHTML={{ __html: h }}
                />
                {headers.length > 1 && (
                  <button
                    onClick={() => removeColumn(i)}
                    className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-red-500 text-white text-[8px] flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity z-10"
                  >×</button>
                )}
              </th>
            ))}
            <th style={{ border: 'none', padding: 0, width: '30px', verticalAlign: 'middle' }}>
              <button
                onClick={addColumn}
                className="w-6 h-6 rounded-md bg-blue-500 text-white text-sm flex items-center justify-center hover:bg-blue-600 transition-colors ml-1"
                title="Ajouter une colonne"
              >+</button>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={`r-${ri}-${rows.length}`} className="group/row">
              {row.map((cell, ci) => (
                <td key={`c-${ri}-${ci}-${row.length}`} style={cellStyle}>
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    spellCheck={false}
                    onBlur={onCellBlur}
                    style={editableStyle}
                    onKeyDown={(e) => { if (e.key === 'Tab') { e.preventDefault(); document.execCommand('insertText', false, '\u00a0\u00a0'); } }}
                    dangerouslySetInnerHTML={{ __html: cell }}
                  />
                </td>
              ))}
              <td style={{ border: 'none', padding: 0, width: '30px', verticalAlign: 'middle' }}>
                {rows.length > 1 && (
                  <button
                    onClick={() => removeRow(ri)}
                    className="w-5 h-5 rounded-full bg-red-500 text-white text-[8px] flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity ml-1"
                  >×</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Add row button */}
      <div className="flex justify-center mt-1.5">
        <button
          onClick={addRow}
          className="h-5 px-4 rounded-md bg-blue-500 text-white text-[10px] flex items-center justify-center hover:bg-blue-600 transition-colors"
        >+ Ligne</button>
      </div>
    </div>
  );
}

// ─── Resizable Button ───
function ResizableButton({ block, onUpdate, globalStyles, btnEditRef, onSelect, placeCaretEndRef, pendingText }: {
  block: BlockData;
  onUpdate: (updates: Partial<BlockData>) => void;
  globalStyles: GlobalStyles;
  btnEditRef: React.RefObject<HTMLSpanElement | null>;
  onSelect: (e: React.MouseEvent) => void;
  placeCaretEndRef: React.MutableRefObject<boolean>;
  pendingText: React.MutableRefObject<string | null>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const startPos = useRef({ x: 0, w: 0 });

  const btnWidth = block.styles.btnWidth || 'auto';

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const btn = containerRef.current?.querySelector('.btn-shape') as HTMLElement;
    if (!btn) return;
    startPos.current = { x: e.clientX, w: btn.offsetWidth };
    setDragging(true);

    const onMouseMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startPos.current.x;
      const parent = containerRef.current?.parentElement;
      const maxW = parent ? parent.offsetWidth : 600;
      const newW = Math.max(60, Math.min(maxW, startPos.current.w + dx));
      const pct = Math.round((newW / maxW) * 100);
      onUpdate({ styles: { ...block.styles, btnWidth: `${pct}%` } });
    };

    const onMouseUp = () => {
      setDragging(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div ref={containerRef} style={{ textAlign: block.styles.textAlign as React.CSSProperties['textAlign'] }} onClick={(e) => e.stopPropagation()}>
      <div style={{ position: 'relative', display: 'inline-block', width: btnWidth !== 'auto' ? btnWidth : undefined }}>
        <span
          className="btn-shape"
          style={{
            display: 'block',
            width: '100%',
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
            textAlign: 'center',
          }}
        >
          <span
            ref={btnEditRef}
            contentEditable
            suppressContentEditableWarning
            spellCheck={false}
            onInput={(e) => { pendingText.current = e.currentTarget.innerHTML || ''; }}
            onBlur={(e) => {
              pendingText.current = null;
              onUpdate({ content: { text: e.currentTarget.innerHTML || '' } });
            }}
            style={{ outline: 'none', minWidth: '20px', display: 'inline-block' }}
            onKeyDown={(e) => {
              if (e.key === 'Tab') {
                e.preventDefault();
                document.execCommand('insertText', false, '\u00a0\u00a0\u00a0\u00a0');
              }
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              placeCaretEndRef.current = false;
              onSelect(e as unknown as React.MouseEvent);
            }}
          />
        </span>
        {/* Right resize handle */}
        <div
          onMouseDown={onMouseDown}
          className={`absolute top-1/2 -right-1.5 -translate-y-1/2 w-2.5 h-8 rounded-full cursor-ew-resize transition-colors ${dragging ? 'bg-blue-500' : 'bg-blue-400/70 hover:bg-blue-500'}`}
        />
        {/* Left resize handle */}
        <div
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const btn = containerRef.current?.querySelector('.btn-shape') as HTMLElement;
            if (!btn) return;
            startPos.current = { x: e.clientX, w: btn.offsetWidth };
            setDragging(true);

            const onMouseMove = (ev: MouseEvent) => {
              const dx = startPos.current.x - ev.clientX;
              const parent = containerRef.current?.parentElement;
              const maxW = parent ? parent.offsetWidth : 600;
              const newW = Math.max(60, Math.min(maxW, startPos.current.w + dx));
              const pct = Math.round((newW / maxW) * 100);
              onUpdate({ styles: { ...block.styles, btnWidth: `${pct}%` } });
            };

            const onMouseUp = () => {
              setDragging(false);
              document.removeEventListener('mousemove', onMouseMove);
              document.removeEventListener('mouseup', onMouseUp);
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
          }}
          className={`absolute top-1/2 -left-1.5 -translate-y-1/2 w-2.5 h-8 rounded-full cursor-ew-resize transition-colors ${dragging ? 'bg-blue-500' : 'bg-blue-400/70 hover:bg-blue-500'}`}
        />
        {dragging && (
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px]">
            {btnWidth}
          </div>
        )}
      </div>
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
  const placeCaretEndRef = useRef(false);
  const padding = resolvePadding(block.styles);
  const margin = resolveMargin(block.styles);
  const alignMargins = isLayoutBlock ? resolveBlockAlign(block.styles) : {};
  const hasBorder = isLayoutBlock && block.styles.borderSize && block.styles.borderSize !== '0px';

  // Typed-but-not-yet-committed text — onInput writes here, interval flushes to state.
  // This keeps React out of the hot path while typing (zero re-renders per keystroke).
  const pendingText = useRef<string | null>(null);

  // Set innerHTML only on initial selection (not on style changes)
  const initializedRef = useRef(false);

  useEffect(() => {
    if (isSelected && isTextBlock) {
      const el = block.type === 'button' ? btnEditRef.current : editRef.current;
      if (el) {
        // Only set innerHTML when first entering edit mode
        if (!initializedRef.current) {
          el.innerHTML = (block.content.text as string) || '';
          initializedRef.current = true;
        }
        el.focus();
        if (placeCaretEndRef.current) {
          const sel = window.getSelection();
          if (sel) {
            const range = document.createRange();
            range.selectNodeContents(el);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
          }
          placeCaretEndRef.current = false;
        }
      }
    } else {
      initializedRef.current = false;
      pendingText.current = null;
    }
  }, [isSelected, isTextBlock, block.type]);

  // Flush pending text to template state at most once every 100ms.
  // Decouples keystrokes from React renders → no caret jumps, no lag.
  useEffect(() => {
    if (!isSelected || !isTextBlock) return;
    const id = setInterval(() => {
      if (pendingText.current !== null) {
        onUpdate({ content: { text: pendingText.current } });
        pendingText.current = null;
      }
    }, 100);
    return () => clearInterval(id);
  // onUpdate identity changes each render but we intentionally keep the interval
  // alive across those renders — the ref always carries the latest text.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSelected, isTextBlock]);

  return (
    <div
      className={`relative transition-all group/block ${isTextBlock ? 'cursor-text' : 'cursor-pointer'} ${
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
      onClick={(e) => {
        const target = e.target as HTMLElement;
        const insideEditable = !!target.closest('[contenteditable="true"]');
        // selecting block by clicking outside editable text should put caret at end
        placeCaretEndRef.current = !insideEditable;
        onSelect(e);
      }}
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
      {isSelected && block.type === 'table' ? (
        <EditableTable block={block} onUpdate={onUpdate} />
      ) : isSelected && block.type === 'image' && block.content.src ? (
        <ResizableImage block={block} onUpdate={onUpdate} globalStyles={globalStyles} />
      ) : isSelected && isTextBlock ? (
        <>
          {block.type === 'button' ? (
            <ResizableButton block={block} onUpdate={onUpdate} globalStyles={globalStyles} btnEditRef={btnEditRef} onSelect={onSelect} placeCaretEndRef={placeCaretEndRef} pendingText={pendingText} />
          ) : (
            <div
              ref={editRef}
              contentEditable
              suppressContentEditableWarning
              onInput={(e) => { pendingText.current = e.currentTarget.innerHTML || ''; }}
              onBlur={(e) => {
                pendingText.current = null;
                onUpdate({ content: { text: e.currentTarget.innerHTML || '' } });
              }}
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
              onKeyDown={(e) => {
                if (e.key === 'Tab') {
                  e.preventDefault();
                  document.execCommand('insertText', false, '\u00a0\u00a0\u00a0\u00a0');
                }
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                placeCaretEndRef.current = false;
                onSelect(e as unknown as React.MouseEvent);
              }}
            />
          )}
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
        }}
        dangerouslySetInnerHTML={{ __html: (block.content.text as string) || 'Titre' }}
        />
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
        }}
        dangerouslySetInnerHTML={{ __html: (block.content.text as string) || 'Texte' }}
        />
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
                height: block.styles.height || 'auto',
                objectFit: block.styles.height ? 'cover' as const : undefined,
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
      const src = (block.content.src as string) || '';
      const youtubeMatch = src.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
      const youtubeId = youtubeMatch ? youtubeMatch[1] : null;
      const isYoutube = youtubeId !== null;
      return (
        <div style={{ textAlign: block.styles.textAlign as React.CSSProperties['textAlign'], padding: block.styles.padding }}>
          {isYoutube ? (
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
    case 'button': {
      const bWidth = block.styles.btnWidth || 'auto';
      return (
        <div style={{ textAlign: block.styles.textAlign as React.CSSProperties['textAlign'] }}>
          <span style={{
            display: bWidth !== 'auto' ? 'block' : 'inline-block',
            width: bWidth !== 'auto' ? bWidth : undefined,
            backgroundColor: block.styles.backgroundColor || globalStyles.btnBackgroundColor,
            color: block.styles.color || globalStyles.btnFontColor,
            fontSize: block.styles.fontSize || globalStyles.btnFontSize,
            fontFamily: block.styles.fontFamily || globalStyles.btnFontFamily,
            fontWeight: block.styles.fontWeight || globalStyles.btnFontWeight,
            padding: block.styles.padding,
            borderRadius: block.styles.borderRadius || globalStyles.btnBorderRadius,
            border: `${block.styles.borderSize || globalStyles.btnBorderSize} solid ${block.styles.borderColor || globalStyles.btnBorderColor}`,
            cursor: 'pointer',
            textAlign: 'center',
            margin: block.styles.textAlign === 'center' ? '0 auto' : block.styles.textAlign === 'right' ? '0 0 0 auto' : undefined,
          }}>
            <span dangerouslySetInnerHTML={{ __html: (block.content.text as string) || 'Bouton' }} />
          </span>
        </div>
      );
    }
    case 'divider': {
      const dW = block.styles.width || '100%';
      const dAlign = block.styles.textAlign || 'center';
      const dMargin = dAlign === 'center' ? '0 auto' : dAlign === 'right' ? '0 0 0 auto' : '0';
      return (
        <div style={{ padding: block.styles.padding || '10px 0' }}>
          <hr style={{
            border: 'none',
            borderTop: `${block.styles.borderWidth || '1px'} ${block.styles.borderStyle || 'solid'} ${block.styles.borderColor || '#e2e8f0'}`,
            width: dW,
            margin: dMargin,
          }} />
        </div>
      );
    }
    case 'table': {
      const tHeaders = (block.content.headers || []) as string[];
      const tRows = (block.content.rows || []) as string[][];
      const tBorderColor = block.styles.tableBorderColor || '#dddddd';
      const tHeaderBg = block.styles.headerBg || '#f1f5f9';
      const tFontSize = block.styles.fontSize || '13px';
      const tColor = block.styles.color || 'inherit';
      const tFontFamily = block.styles.fontFamily || 'inherit';
      return (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {tHeaders.map((h, i) => (
                <th key={i} style={{ border: `1px solid ${tBorderColor}`, backgroundColor: tHeaderBg, padding: '8px 12px', textAlign: 'left', fontSize: tFontSize, fontWeight: 600, color: tColor, fontFamily: tFontFamily }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tRows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td key={ci} style={{ border: `1px solid ${tBorderColor}`, padding: '8px 12px', fontSize: tFontSize, color: tColor, fontFamily: tFontFamily }}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
    case 'signature': {
      const sLineColor = block.styles.lineColor || '#000000';
      const sLineWidth = block.styles.lineWidth || '200px';
      const sAlign = block.styles.textAlign || 'left';
      return (
        <div style={{ fontSize: block.styles.fontSize || 'inherit', color: block.styles.color || 'inherit', textAlign: sAlign as React.CSSProperties['textAlign'] }}>
          <div style={{ borderTop: `1px solid ${sLineColor}`, width: sLineWidth, marginBottom: '8px', display: 'inline-block' }} />
          <p style={{ margin: 0, fontWeight: 600 }}>{block.content.name as string || 'Nom'}</p>
          {block.content.title && <p style={{ margin: '2px 0 0', opacity: 0.7, fontSize: '0.85em' }}>{block.content.title as string}</p>}
          {block.content.email && <p style={{ margin: '2px 0 0', opacity: 0.6, fontSize: '0.8em' }}>{block.content.email as string}</p>}
          {block.content.phone && <p style={{ margin: '2px 0 0', opacity: 0.6, fontSize: '0.8em' }}>{block.content.phone as string}</p>}
        </div>
      );
    }
    default:
      return <div className="text-xs text-muted-foreground">Bloc inconnu</div>;
  }
}
