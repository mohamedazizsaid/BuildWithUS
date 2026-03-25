'use client';

import { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, GripVertical, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { TemplateData, BlockData, Row, Column, RowLayout, LAYOUT_OPTIONS } from '@/lib/editor-types';

interface CanvasProps {
  template: TemplateData;
  selectedBlockId: string | null;
  selectedRowId: string | null;
  onSelectBlock: (blockId: string | null) => void;
  onSelectRow: (rowId: string | null) => void;
  onSelectColumn: (columnId: string | null) => void;
  onRemoveRow: (rowId: string) => void;
  onRemoveBlock: (blockId: string) => void;
  onUpdateBlock: (blockId: string, updates: Partial<BlockData>) => void;
  onAddRow: (layout: RowLayout) => void;
  onReorderRows: (fromIndex: number, toIndex: number) => void;
  activeColumnId: string | null;
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
  onUpdateBlock,
  onAddRow,
  onReorderRows,
  activeColumnId,
}: CanvasProps) {
  const [showAddRow, setShowAddRow] = useState(false);
  const [dragRowIndex, setDragRowIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  return (
    <div
      className="flex-1 overflow-y-auto p-8"
      style={{
        backgroundImage: `
          linear-gradient(45deg, #f1f5f9 25%, transparent 25%),
          linear-gradient(-45deg, #f1f5f9 25%, transparent 25%),
          linear-gradient(45deg, transparent 75%, #f1f5f9 75%),
          linear-gradient(-45deg, transparent 75%, #f1f5f9 75%)
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
      {/* Template Body */}
      <div
        className="mx-auto min-h-[500px] shadow-lg rounded-sm relative"
        style={{
          width: template.globalStyles.width,
          backgroundColor: template.globalStyles.backgroundColor,
          fontFamily: template.globalStyles.fontFamily,
          color: template.globalStyles.textColor,
        }}
      >
        {template.rows.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-24 text-center cursor-pointer hover:bg-slate-50/50 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setShowAddRow(!showAddRow);
            }}
          >
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4 hover:bg-slate-200 transition-colors">
              <Plus size={24} className="text-slate-400" />
            </div>
            <p className="text-sm text-slate-500 mb-1">Click to add a row</p>
            <p className="text-xs text-slate-400">Choose a column layout to get started</p>
          </div>
        ) : (
          <>
            {template.rows.map((row, index) => (
              <div
                key={row.id}
                draggable
                onDragStart={() => setDragRowIndex(index)}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverIndex(index);
                }}
                onDragEnd={() => {
                  if (dragRowIndex !== null && dragOverIndex !== null && dragRowIndex !== dragOverIndex) {
                    onReorderRows(dragRowIndex, dragOverIndex);
                  }
                  setDragRowIndex(null);
                  setDragOverIndex(null);
                }}
                className={`${dragOverIndex === index && dragRowIndex !== index ? 'border-t-2 border-blue-500' : ''}`}
              >
                <CanvasRow
                  row={row}
                  isSelected={selectedRowId === row.id}
                  selectedBlockId={selectedBlockId}
                  activeColumnId={activeColumnId}
                  onSelectRow={(e) => {
                    e.stopPropagation();
                    onSelectRow(row.id);
                    onSelectBlock(null);
                  }}
                  onSelectBlock={onSelectBlock}
                  onSelectColumn={onSelectColumn}
                  onRemoveRow={() => onRemoveRow(row.id)}
                  onRemoveBlock={onRemoveBlock}
                  onUpdateBlock={onUpdateBlock}
                  globalStyles={template.globalStyles}
                />
              </div>
            ))}

            {/* Add Row Button at bottom */}
            <div className="relative">
              <div
                className="flex items-center justify-center py-4 cursor-pointer group"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAddRow(!showAddRow);
                }}
              >
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-dashed border-slate-300 group-hover:border-slate-400 group-hover:bg-slate-50 transition-all">
                  <Plus size={14} className="text-slate-400" />
                  <span className="text-xs text-slate-500 group-hover:text-slate-700">Add row</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Add Row Popover */}
        {showAddRow && (
          <div
            className="absolute left-1/2 -translate-x-1/2 bottom-4 z-50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white rounded-lg shadow-xl border border-slate-200 p-3 w-64">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Choose layout</p>
              <div className="space-y-1.5">
                {LAYOUT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      onAddRow(option.value);
                      setShowAddRow(false);
                    }}
                    className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex gap-0.5 flex-1">
                      {option.widths.map((width, i) => (
                        <div
                          key={i}
                          className="h-6 bg-slate-200 rounded-sm"
                          style={{ width }}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-slate-400 whitespace-nowrap">{option.label}</span>
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
  position,
}: {
  block: BlockData;
  onUpdate: (updates: Partial<BlockData>) => void;
  position: { top: number; left: number };
}) {
  const isBold = block.styles.fontWeight === 'bold';
  const isItalic = block.styles.fontStyle === 'italic';
  const isUnderline = block.styles.textDecoration === 'underline';

  const toggleStyle = (key: string, onValue: string, offValue: string) => {
    const current = block.styles[key];
    onUpdate({ styles: { ...block.styles, [key]: current === onValue ? offValue : onValue } });
  };

  return (
    <div
      className="absolute z-40 flex items-center gap-0.5 bg-slate-900 rounded-lg px-1 py-0.5 shadow-lg"
      style={{ top: position.top + position.height + 6, left: position.left }}
      onClick={(e) => e.stopPropagation()}
    >
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
    </div>
  );
}

// ─── Canvas Row ───
function CanvasRow({
  row,
  isSelected,
  selectedBlockId,
  activeColumnId,
  onSelectRow,
  onSelectBlock,
  onSelectColumn,
  onRemoveRow,
  onRemoveBlock,
  onUpdateBlock,
  globalStyles,
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
  onUpdateBlock: (id: string, updates: Partial<BlockData>) => void;
  globalStyles: TemplateData['globalStyles'];
}) {
  return (
    <div
      className={`group relative transition-all ${
        isSelected ? 'ring-2 ring-blue-500 ring-offset-1' : 'hover:ring-1 hover:ring-slate-300'
      }`}
      style={{
        backgroundColor: row.styles.backgroundColor,
        padding: row.styles.padding,
      }}
      onClick={onSelectRow}
    >
      {/* Row Controls */}
      <div className={`absolute -left-10 top-1/2 -translate-y-1/2 flex flex-col gap-1 transition-opacity ${
        isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
      }`}>
        <div className="w-7 h-7 rounded bg-white shadow border border-slate-200 flex items-center justify-center hover:bg-slate-50 cursor-grab active:cursor-grabbing">
          <GripVertical size={12} className="text-slate-400" />
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemoveRow();
          }}
          className="w-7 h-7 rounded bg-white shadow border border-slate-200 flex items-center justify-center hover:bg-red-50 hover:text-red-500"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {/* Columns */}
      <div className="flex gap-0">
        {row.columns.map((col) => (
          <CanvasColumn
            key={col.id}
            column={col}
            isActive={activeColumnId === col.id}
            selectedBlockId={selectedBlockId}
            onSelectColumn={(e) => {
              e.stopPropagation();
              onSelectColumn(col.id);
              onSelectBlock(null);
            }}
            onSelectBlock={onSelectBlock}
            onRemoveBlock={onRemoveBlock}
            onUpdateBlock={onUpdateBlock}
            globalStyles={globalStyles}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Canvas Column ───
function CanvasColumn({
  column,
  isActive,
  selectedBlockId,
  onSelectColumn,
  onSelectBlock,
  onRemoveBlock,
  onUpdateBlock,
  globalStyles,
}: {
  column: Column;
  isActive: boolean;
  selectedBlockId: string | null;
  onSelectColumn: (e: React.MouseEvent) => void;
  onSelectBlock: (id: string | null) => void;
  onRemoveBlock: (id: string) => void;
  onUpdateBlock: (id: string, updates: Partial<BlockData>) => void;
  globalStyles: TemplateData['globalStyles'];
}) {
  return (
    <div
      className={`min-h-[60px] transition-all ${
        isActive
          ? 'bg-blue-50/50 ring-1 ring-dashed ring-blue-300'
          : column.blocks.length === 0
          ? 'bg-slate-50/50 ring-1 ring-dashed ring-slate-200'
          : ''
      }`}
      style={{ width: column.width }}
      onClick={onSelectColumn}
    >
      {column.blocks.length === 0 ? (
        <div className="flex items-center justify-center h-full min-h-[60px]">
          <p className="text-xs text-slate-400">Drop content here</p>
        </div>
      ) : (
        column.blocks.map((block) => (
          <CanvasBlock
            key={block.id}
            block={block}
            isSelected={selectedBlockId === block.id}
            onSelect={(e) => {
              e.stopPropagation();
              onSelectBlock(block.id);
            }}
            onRemove={() => onRemoveBlock(block.id)}
            onUpdate={(updates) => onUpdateBlock(block.id, updates)}
            globalStyles={globalStyles}
          />
        ))
      )}
    </div>
  );
}

// ─── Canvas Block ───
function CanvasBlock({
  block,
  isSelected,
  onSelect,
  onRemove,
  onUpdate,
  globalStyles,
}: {
  block: BlockData;
  isSelected: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onRemove: () => void;
  onUpdate: (updates: Partial<BlockData>) => void;
  globalStyles: TemplateData['globalStyles'];
}) {
  const blockRef = useRef<HTMLDivElement>(null);
  const [toolbarPos, setToolbarPos] = useState({ top: 0, left: 0 });
  const isTextBlock = block.type === 'heading' || block.type === 'text';

  useEffect(() => {
    if (isSelected && blockRef.current) {
      const rect = blockRef.current.getBoundingClientRect();
      const parent = blockRef.current.closest('[class*="overflow-y-auto"]');
      const parentRect = parent?.getBoundingClientRect() || { top: 0, left: 0 };
      setToolbarPos({
        top: rect.top - parentRect.top + (parent?.scrollTop || 0),
        left: rect.left - parentRect.left + rect.width / 2 - 120,
      });
    }
  }, [isSelected]);

  return (
    <div
      ref={blockRef}
      className={`relative cursor-pointer transition-all group/block ${
        isSelected
          ? 'ring-2 ring-blue-500 ring-offset-1'
          : 'hover:ring-1 hover:ring-blue-300'
      }`}
      style={{ padding: block.styles.padding }}
      onClick={onSelect}
    >
      {/* Block delete button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className={`absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow-sm z-10 transition-opacity ${
          isSelected ? 'opacity-100' : 'opacity-0 group-hover/block:opacity-100'
        }`}
      >
        <Trash2 size={10} />
      </button>

      {/* Floating toolbar for text blocks */}
      {isSelected && isTextBlock && (
        <FloatingToolbar
          block={block}
          onUpdate={onUpdate}
          position={toolbarPos}
        />
      )}

      {/* Inline editable content */}
      {isSelected && isTextBlock ? (
        <div
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => {
            onUpdate({ content: { ...block.content, text: e.currentTarget.textContent || '' } });
          }}
          style={{
            fontSize: block.styles.fontSize,
            fontWeight: block.styles.fontWeight,
            fontStyle: block.styles.fontStyle || 'normal',
            textDecoration: block.styles.textDecoration || 'none',
            color: block.styles.color || globalStyles.textColor,
            textAlign: block.styles.textAlign as React.CSSProperties['textAlign'],
            outline: 'none',
            minHeight: '1em',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {block.content.text as string}
        </div>
      ) : (
        renderBlock(block, globalStyles)
      )}
    </div>
  );
}

// ─── Block Renderers ───
function renderBlock(block: BlockData, globalStyles: TemplateData['globalStyles']) {
  switch (block.type) {
    case 'heading':
      return (
        <div
          style={{
            fontSize: block.styles.fontSize,
            fontWeight: block.styles.fontWeight,
            fontStyle: block.styles.fontStyle || 'normal',
            textDecoration: block.styles.textDecoration || 'none',
            color: block.styles.color || globalStyles.textColor,
            textAlign: block.styles.textAlign as React.CSSProperties['textAlign'],
          }}
        >
          {block.content.text as string || 'Heading'}
        </div>
      );

    case 'text':
      return (
        <div
          style={{
            fontSize: block.styles.fontSize,
            fontWeight: block.styles.fontWeight,
            fontStyle: block.styles.fontStyle || 'normal',
            textDecoration: block.styles.textDecoration || 'none',
            color: block.styles.color || globalStyles.textColor,
            textAlign: block.styles.textAlign as React.CSSProperties['textAlign'],
          }}
        >
          {block.content.text as string || 'Enter text...'}
        </div>
      );

    case 'image':
      return (
        <div style={{ textAlign: block.styles.textAlign as React.CSSProperties['textAlign'] }}>
          {block.content.src ? (
            <img
              src={block.content.src as string}
              alt={block.content.alt as string}
              style={{ width: block.styles.width, maxWidth: '100%' }}
            />
          ) : (
            <div className="bg-slate-100 rounded-md flex items-center justify-center py-8">
              <p className="text-xs text-slate-400">No image — set URL in properties</p>
            </div>
          )}
        </div>
      );

    case 'button':
      return (
        <div style={{ textAlign: block.styles.textAlign as React.CSSProperties['textAlign'] }}>
          <span
            style={{
              display: 'inline-block',
              backgroundColor: block.styles.backgroundColor,
              color: block.styles.color,
              fontSize: block.styles.fontSize,
              padding: block.styles.padding,
              borderRadius: block.styles.borderRadius,
              cursor: 'pointer',
            }}
          >
            {block.content.text as string || 'Button'}
          </span>
        </div>
      );

    case 'divider':
      return (
        <hr
          style={{
            borderColor: block.styles.borderColor,
            borderWidth: block.styles.borderWidth,
          }}
        />
      );

    case 'table':
      const headers = (block.content.headers || []) as string[];
      const rows = (block.content.rows || []) as string[][];
      return (
        <table className="w-full border-collapse" style={{ fontSize: block.styles.fontSize, color: block.styles.color }}>
          <thead>
            <tr>
              {headers.map((h: string, i: number) => (
                <th key={i} className="border border-slate-300 bg-slate-100 px-3 py-2 text-left text-xs font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row: string[], ri: number) => (
              <tr key={ri}>
                {row.map((cell: string, ci: number) => (
                  <td key={ci} className="border border-slate-300 px-3 py-2 text-xs">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );

    case 'signature':
      return (
        <div style={{ fontSize: block.styles.fontSize, color: block.styles.color }}>
          <div className="border-t border-slate-900 w-48 mb-2" />
          <p className="font-medium">{block.content.name as string || 'Name'}</p>
          <p className="text-slate-500 text-xs">{block.content.title as string || 'Title'}</p>
        </div>
      );

    default:
      return <div className="text-xs text-slate-400">Unknown block</div>;
  }
}
