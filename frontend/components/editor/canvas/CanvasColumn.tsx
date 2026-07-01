'use client';

import { useState } from 'react';
import { BlockData, Column, GlobalStyles } from '@/lib/editor-types';
import { CanvasBlock } from './CanvasBlock';

export function CanvasColumn({
  column, isSelected, selectedBlockId,
  onSelectColumn, onSelectBlock, onRemoveBlock, onDuplicateBlock, onUpdateBlock, onReorderBlocks, onDropBlock, globalStyles,
}: {
  column: Column;
  isSelected: boolean;
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

  const cs = column.styles || {};
  // A "card" column carries its own background/border/rounding. We render those
  // on an INNER wrapper and let the column's `padding` act as the OUTER gutter
  // (transparent) — mirroring the HTML pattern <td padding> > <table radius> so
  // adjacent cards get real spacing between them instead of touching.
  const hasCard = !!(cs.backgroundColor || cs.border || cs.borderRadius);
  const noPad = !cs.padding || cs.padding === '0' || cs.padding === '0px';
  // Cards almost always want a gutter; default to 8px when the MJML didn't set
  // one so they don't render edge-to-edge. Plain columns keep their padding.
  const outerPad = hasCard ? (noPad ? '8px' : cs.padding) : cs.padding;

  const content = column.blocks.length === 0 ? (
        <div className="flex items-center justify-center h-full min-h-[60px]">
          <p className="text-xs text-muted-foreground">Déposez du contenu ici</p>
        </div>
      ) : (
        column.blocks.map((block, index) => {
          // A selected block with inline-editable text is in edit mode (its
          // contenteditable is active). Keep the wrapper non-draggable then, or
          // mouse-drag-selecting text would start a native block drag instead.
          const isEditing =
            selectedBlockId === block.id &&
            ['text', 'heading', 'button', 'table', 'icon-list'].includes(block.type);
          return (
          <div
            key={block.id}
            draggable={!isEditing}
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
          );
        })
      );

  return (
    <div
      className={`group/col relative cursor-pointer transition-[outline-color] outline outline-2 -outline-offset-2 ${
        isSelected ? 'outline-violet-500' : 'outline-transparent hover:outline-violet-300 hover:outline-dashed'
      } ${column.blocks.length === 0 ? 'min-h-[60px]' : ''}`}
      style={{
        width: column.width,
        minWidth: 0,
        boxSizing: 'border-box',
        padding: outerPad || undefined,
        verticalAlign: (cs.verticalAlign as React.CSSProperties['verticalAlign']) || undefined,
        ...(hasCard
          ? {}
          : {
              backgroundColor: cs.backgroundColor || 'transparent',
              border: cs.border || undefined,
              borderRadius: cs.borderRadius || undefined,
            }),
      }}
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
      {/* Column label tab — lets you find/click the box even when blocks fill it */}
      <div className={`absolute -top-[1px] left-0 h-4 px-1.5 flex items-center gap-1 text-[9px] font-medium rounded-b transition-opacity select-none pointer-events-none z-10 ${
        isSelected ? 'bg-violet-500 text-white opacity-100' : 'bg-violet-300 text-white opacity-0 group-hover/col:opacity-100'
      }`}>
        Colonne
      </div>
      {hasCard ? (
        <div
          style={{
            backgroundColor: cs.backgroundColor || undefined,
            border: cs.border || undefined,
            borderRadius: cs.borderRadius || undefined,
            boxSizing: 'border-box',
            height: '100%',
            overflow: 'hidden',
          }}
        >
          {content}
        </div>
      ) : (
        content
      )}
    </div>
  );
}
