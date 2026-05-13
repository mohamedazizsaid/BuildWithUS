import type { Editor } from '@tiptap/react';

export function replaceAllVariableNodes(
  editor: Editor,
  oldName: string,
  newName: string,
  newLabel: string | null,
): number {
  const { state } = editor;
  const varType = state.schema.nodes.variable;
  if (!varType) return 0;

  const varPositions: Array<{ from: number; to: number }> = [];
  const attrUpdates: Array<{ pos: number; newAttrs: Record<string, unknown> }> = [];

  state.doc.descendants((node, pos) => {
    if (node.type === varType && node.attrs.name === oldName) {
      varPositions.push({ from: pos, to: pos + node.nodeSize });
      return false;
    }
    const attrs = node.attrs as Record<string, unknown>;
    const updated: Record<string, unknown> = {};
    let changed = false;
    for (const [key, val] of Object.entries(attrs)) {
      if (typeof val === 'string' && val === oldName) {
        updated[key] = newName;
        changed = true;
      }
    }
    if (changed) attrUpdates.push({ pos, newAttrs: { ...attrs, ...updated } });
  });

  const total = varPositions.length + attrUpdates.length;
  if (total === 0) return 0;

  let tr = state.tr;

  for (const { pos, newAttrs } of attrUpdates) {
    tr = tr.setNodeMarkup(pos, undefined, newAttrs);
  }

  for (const { from, to } of [...varPositions].reverse()) {
    const mFrom = tr.mapping.map(from);
    const mTo   = tr.mapping.map(to);
    tr = tr.replaceWith(mFrom, mTo, varType.create({ name: newName, label: newLabel }));
  }

  editor.view.dispatch(tr);
  return total;
}
