'use client';

import { useRef, useEffect } from 'react';
import { BlockData } from '@/lib/editor-types';
import { resolveTableTheme, thStyle, tdStyle } from '@/lib/table-theme';

// Renders a contentEditable cell whose innerHTML is set ONCE on mount.
// Re-rendering the parent must never touch the cell's DOM contents, otherwise
// React's `dangerouslySetInnerHTML` would overwrite text the user is typing
// (but hasn't blurred yet). The DOM is the source of truth between mount and
// blur; saveAll() reads it back on demand.
function EditableCell({ initial, onBlur, style }: { initial: string; onBlur: () => void; style: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.innerHTML = initial;
    // intentional: only run on mount. Deps would re-apply innerHTML mid-typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      onBlur={onBlur}
      style={style}
      onKeyDown={(e) => { if (e.key === 'Tab') { e.preventDefault(); document.execCommand('insertText', false, '  '); } }}
    />
  );
}

export function EditableTable({ block, onUpdate }: { block: BlockData; onUpdate: (updates: Partial<BlockData>) => void }) {
  const tableRef = useRef<HTMLTableElement>(null);
  const theme = resolveTableTheme(block.styles);

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

  const editableStyle: React.CSSProperties = {
    outline: 'none',
    minHeight: '1.2em',
    fontSize: theme.fontSize,
    color: theme.color,
    fontFamily: theme.fontFamily,
  };

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <table ref={tableRef} style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={`h-${i}-${headers.length}`} style={{ ...thStyle(theme), minWidth: '50px', position: 'relative' }}>
                <EditableCell initial={h} onBlur={onCellBlur} style={{ ...editableStyle, color: theme.headerColor, fontWeight: 600 }} />
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
                <td key={`c-${ri}-${ci}-${row.length}`} style={{ ...tdStyle(theme, ri), minWidth: '50px', position: 'relative' }}>
                  <EditableCell initial={cell} onBlur={onCellBlur} style={editableStyle} />
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
