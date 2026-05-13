import type { Editor } from '@tiptap/react';
import { VARIABLE_PALETTE } from '@/lib/tiptap/contract-templates';
import type { BlockMeta } from './types';

export const BLOCK_LABELS: Record<string, string> = {
  contractHeader:   'En-tête',
  paragraph:        'Paragraphe',
  heading:          'Titre',
  bulletList:       'Liste',
  orderedList:      'Liste numérotée',
  blockquote:       'Citation',
  horizontalRule:   'Séparateur',
  financialBlock:   'Récapitulatif financier',
  definitionsBlock: 'Définitions',
  infoBox:          'Encadré',
  partiesBlock:     'Parties',
  formFieldsBlock:  'Formulaire',
  checkboxBlock:    'Cases à cocher',
  signatureBlock:   'Signatures',
  sepaBlock:        'Mandat SEPA',
  retractBlock:     'Rétractation',
};

export function resolveBlock(editor: Editor, clientX: number, clientY: number, canvas: HTMLDivElement): BlockMeta | null {
  try {
    const target = document.elementFromPoint(clientX, clientY);
    if (!target || !canvas.contains(target)) return null;

    let blockEl: Element | null = target;
    while (blockEl && blockEl.parentElement && !blockEl.parentElement.classList.contains('tiptap')) {
      blockEl = blockEl.parentElement;
    }
    if (!blockEl || !blockEl.parentElement) return null;

    const tiptap     = blockEl.parentElement;
    const childIndex = Array.from(tiptap.children).indexOf(blockEl as HTMLElement);
    if (childIndex < 0) return null;

    const from = editor.view.posAtDOM(tiptap, childIndex);
    if (from < 0) return null;

    let node = editor.state.doc.nodeAt(from);
    let nodeFrom = from;
    if (!node) {
      const $pos = editor.state.doc.resolve(Math.min(from, editor.state.doc.content.size));
      nodeFrom = $pos.before(1);
      node = editor.state.doc.nodeAt(nodeFrom);
    }
    if (!node) return null;

    const canvasRect = canvas.getBoundingClientRect();
    const elRect     = blockEl.getBoundingClientRect();
    return {
      label:    BLOCK_LABELS[node.type.name] ?? 'Bloc',
      nodeType: node.type.name,
      from:   nodeFrom,
      to:     nodeFrom + node.nodeSize,
      top:    elRect.top   - canvasRect.top,
      height: elRect.height,
      left:   elRect.left  - canvasRect.left,
      right:  canvasRect.right - elRect.right,
    };
  } catch { return null; }
}

export function labelFor(name: string): string {
  const found = VARIABLE_PALETTE.flatMap((c) => c.vars).find((v) => v.name === name);
  return found?.label ?? name.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function categoryFor(name: string): { bg: string; color: string; border: string } {
  const cat = VARIABLE_PALETTE.find((c) => c.vars.some((v) => v.name === name));
  return cat ?? { bg: '#f1f5f9', color: '#334155', border: '#e2e8f0' };
}
