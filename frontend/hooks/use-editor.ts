import { useState, useCallback } from 'react';
import { v4 as uuid } from 'uuid';
import {
  TemplateData,
  Row,
  BlockData,
  BlockType,
  RowLayout,
  LAYOUT_OPTIONS,
  DEFAULT_BLOCK_CONTENT,
  DEFAULT_GLOBAL_STYLES,
  GlobalStyles,
} from '@/lib/editor-types';

export function useEditor() {
  const [template, setTemplate] = useState<TemplateData>({
    rows: [],
    globalStyles: { ...DEFAULT_GLOBAL_STYLES },
  });
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [selectedColumnId, setSelectedColumnId] = useState<string | null>(null);
  const [history, setHistory] = useState<TemplateData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const pushHistory = useCallback((newTemplate: TemplateData) => {
    setHistory((prev) => [...prev.slice(0, historyIndex + 1), newTemplate]);
    setHistoryIndex((prev) => prev + 1);
  }, [historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex((prev) => prev - 1);
      setTemplate(history[historyIndex - 1]);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex((prev) => prev + 1);
      setTemplate(history[historyIndex + 1]);
    }
  }, [history, historyIndex]);

  const updateTemplate = useCallback((newTemplate: TemplateData) => {
    setTemplate(newTemplate);
    pushHistory(newTemplate);
  }, [pushHistory]);

  const addRow = useCallback((layout: RowLayout) => {
    const option = LAYOUT_OPTIONS.find((o) => o.value === layout);
    if (!option) return;

    const newRow: Row = {
      id: uuid(),
      layout,
      columns: option.widths.map((width) => ({
        id: uuid(),
        width,
        blocks: [],
      })),
      styles: { backgroundColor: 'transparent', padding: '10px 0' },
    };

    const newTemplate = { ...template, rows: [...template.rows, newRow] };
    updateTemplate(newTemplate);
  }, [template, updateTemplate]);

  const removeRow = useCallback((rowId: string) => {
    const newTemplate = {
      ...template,
      rows: template.rows.filter((r) => r.id !== rowId),
    };
    updateTemplate(newTemplate);
    setSelectedBlockId(null);
    setSelectedRowId(null);
    setSelectedColumnId(null);
  }, [template, updateTemplate]);

  const addBlockToNewRow = useCallback((type: BlockType) => {
    const newRow: Row = {
      id: uuid(),
      layout: '100' as RowLayout,
      columns: [{
        id: uuid(),
        width: '100%',
        blocks: [{
          id: uuid(),
          type,
          content: { ...DEFAULT_BLOCK_CONTENT[type].content },
          styles: { ...DEFAULT_BLOCK_CONTENT[type].styles },
        }],
      }],
      styles: { backgroundColor: 'transparent', padding: '10px 0' },
    };
    const newTemplate = { ...template, rows: [...template.rows, newRow] };
    updateTemplate(newTemplate);
    setSelectedBlockId(newRow.columns[0].blocks[0].id);
  }, [template, updateTemplate]);

  const addStockImageToNewRow = useCallback((src: string) => {
    const newRow: Row = {
      id: uuid(),
      layout: '100' as RowLayout,
      columns: [{
        id: uuid(),
        width: '100%',
        blocks: [{
          id: uuid(),
          type: 'image',
          content: { ...DEFAULT_BLOCK_CONTENT['image'].content, src },
          styles: { ...DEFAULT_BLOCK_CONTENT['image'].styles },
        }],
      }],
      styles: { backgroundColor: 'transparent', padding: '10px 0' },
    };
    const newTemplate = { ...template, rows: [...template.rows, newRow] };
    updateTemplate(newTemplate);
    setSelectedBlockId(newRow.columns[0].blocks[0].id);
  }, [template, updateTemplate]);

  const addBlock = useCallback((columnId: string, type: BlockType) => {
    const defaults = DEFAULT_BLOCK_CONTENT[type];
    const newBlock: BlockData = {
      id: uuid(),
      type,
      content: { ...defaults.content },
      styles: { ...defaults.styles },
    };

    const newTemplate = {
      ...template,
      rows: template.rows.map((row) => ({
        ...row,
        columns: row.columns.map((col) => {
          if (col.id === columnId) {
            return { ...col, blocks: [...col.blocks, newBlock] };
          }
          return col;
        }),
      })),
    };
    updateTemplate(newTemplate);
    setSelectedBlockId(newBlock.id);
  }, [template, updateTemplate]);

  const updateBlock = useCallback((blockId: string, updates: Partial<BlockData>) => {
    const newTemplate = {
      ...template,
      rows: template.rows.map((row) => ({
        ...row,
        columns: row.columns.map((col) => ({
          ...col,
          blocks: col.blocks.map((block) => {
            if (block.id === blockId) {
              return {
                ...block,
                ...updates,
                content: updates.content ? { ...block.content, ...updates.content } : block.content,
                styles: updates.styles ? { ...block.styles, ...updates.styles } : block.styles,
              };
            }
            return block;
          }),
        })),
      })),
    };
    updateTemplate(newTemplate);
  }, [template, updateTemplate]);

  const duplicateBlock = useCallback((blockId: string) => {
    const newTemplate = {
      ...template,
      rows: template.rows.map((row) => ({
        ...row,
        columns: row.columns.map((col) => {
          const blockIndex = col.blocks.findIndex((b) => b.id === blockId);
          if (blockIndex === -1) return col;
          const original = col.blocks[blockIndex];
          const duplicate: BlockData = {
            ...original,
            id: uuid(),
            content: { ...original.content },
            styles: { ...original.styles },
          };
          const newBlocks = [...col.blocks];
          newBlocks.splice(blockIndex + 1, 0, duplicate);
          return { ...col, blocks: newBlocks };
        }),
      })),
    };
    updateTemplate(newTemplate);
  }, [template, updateTemplate]);

  const removeBlock = useCallback((blockId: string) => {
    const newTemplate = {
      ...template,
      rows: template.rows.map((row) => ({
        ...row,
        columns: row.columns.map((col) => ({
          ...col,
          blocks: col.blocks.filter((b) => b.id !== blockId),
        })),
      })),
    };
    updateTemplate(newTemplate);
    setSelectedBlockId(null);
  }, [template, updateTemplate]);

  const updateGlobalStyles = useCallback((styles: Partial<GlobalStyles>) => {
    const newTemplate = {
      ...template,
      globalStyles: { ...template.globalStyles, ...styles },
    };
    updateTemplate(newTemplate);
  }, [template, updateTemplate]);

  const updateRowStyles = useCallback((rowId: string, styles: Record<string, string>) => {
    const newTemplate = {
      ...template,
      rows: template.rows.map((row) => {
        if (row.id === rowId) {
          return { ...row, styles: { ...row.styles, ...styles } };
        }
        return row;
      }),
    };
    updateTemplate(newTemplate);
  }, [template, updateTemplate]);

  const updateColumnStyles = useCallback((columnId: string, styles: Record<string, string>) => {
    const newTemplate = {
      ...template,
      rows: template.rows.map((row) => ({
        ...row,
        columns: row.columns.map((col) => {
          if (col.id === columnId) {
            return { ...col, styles: { ...(col.styles || {}), ...styles } };
          }
          return col;
        }),
      })),
    };
    updateTemplate(newTemplate);
  }, [template, updateTemplate]);

  const reorderRows = useCallback((fromIndex: number, toIndex: number) => {
    const newRows = [...template.rows];
    const [moved] = newRows.splice(fromIndex, 1);
    newRows.splice(toIndex, 0, moved);
    const newTemplate = { ...template, rows: newRows };
    updateTemplate(newTemplate);
  }, [template, updateTemplate]);

  const reorderBlocks = useCallback((columnId: string, fromIndex: number, toIndex: number) => {
    const newTemplate = {
      ...template,
      rows: template.rows.map((row) => ({
        ...row,
        columns: row.columns.map((col) => {
          if (col.id === columnId) {
            const newBlocks = [...col.blocks];
            const [moved] = newBlocks.splice(fromIndex, 1);
            newBlocks.splice(toIndex, 0, moved);
            return { ...col, blocks: newBlocks };
          }
          return col;
        }),
      })),
    };
    updateTemplate(newTemplate);
  }, [template, updateTemplate]);

  const getSelectedBlock = useCallback((): BlockData | null => {
    for (const row of template.rows) {
      for (const col of row.columns) {
        const block = col.blocks.find((b) => b.id === selectedBlockId);
        if (block) return block;
      }
    }
    return null;
  }, [template, selectedBlockId]);

  const getSelectedColumn = useCallback(() => {
    for (const row of template.rows) {
      const col = row.columns.find((c) => c.id === selectedColumnId);
      if (col) return col;
    }
    return null;
  }, [template, selectedColumnId]);

  // Apply a remote (collaborative) update — bypasses history so undo stays clean
  const applyRemoteTemplate = useCallback((newTemplate: TemplateData) => {
    setTemplate(newTemplate);
  }, []);

  return {
    template,
    setTemplate: updateTemplate,
    applyRemoteTemplate,
    selectedBlockId,
    setSelectedBlockId,
    selectedRowId,
    setSelectedRowId,
    selectedColumnId,
    setSelectedColumnId,
    addRow,
    removeRow,
    addBlockToNewRow,
    addStockImageToNewRow,
    addBlock,
    updateBlock,
    removeBlock,
    updateGlobalStyles,
    updateRowStyles,
    updateColumnStyles,
    reorderRows,
    reorderBlocks,
    duplicateBlock,
    addSection: useCallback((newRows: Row[]) => {
      const newTemplate = { ...template, rows: [...template.rows, ...newRows] };
      updateTemplate(newTemplate);
    }, [template, updateTemplate]),
    getSelectedBlock,
    getSelectedColumn,
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
  };
}
