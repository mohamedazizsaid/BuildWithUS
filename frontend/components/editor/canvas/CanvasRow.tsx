'use client';

import { GripVertical, Trash2 } from 'lucide-react';
import { BlockData, Row, GlobalStyles } from '@/lib/editor-types';
import { CanvasColumn } from './CanvasColumn';

export function CanvasRow({
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
      style={{
        backgroundColor: row.styles.backgroundColor === 'transparent' ? 'transparent' : row.styles.backgroundColor,
        // Hero background photo with a dark scrim so overlaid text stays legible.
        backgroundImage: row.styles.backgroundUrl
          ? `linear-gradient(rgba(0,0,0,0.45),rgba(0,0,0,0.45)),url(${row.styles.backgroundUrl})`
          : undefined,
        backgroundSize: row.styles.backgroundUrl ? 'cover' : undefined,
        backgroundPosition: row.styles.backgroundUrl ? 'center' : undefined,
        backgroundRepeat: row.styles.backgroundUrl ? 'no-repeat' : undefined,
        padding: row.styles.padding,
      }}
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
