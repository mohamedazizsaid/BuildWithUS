'use client';

import { useState } from 'react';
import { BlockData, Column, GlobalStyles } from '@/lib/editor-types';
import { CanvasBlock } from './CanvasBlock';

export function CanvasColumn({
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
      )}
    </div>
  );
}
