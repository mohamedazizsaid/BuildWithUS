import type { BlockData, Row, TemplateData } from '@/lib/editor-types';
import { parseHex } from './theme';

/**
 * Deterministic, model-free editing for the common single-element commands on a
 * SELECTED block/section: align, size, bold, color, background, remove. The
 * small model is unreliable at "change the selected block" (it ignores the id or
 * trips the runaway guard), so these high-confidence ops are applied in code —
 * which is why "select a block + ask to centre/agrandir/supprimer" now works
 * instantly. Anything we don't recognise returns { applied:false } and falls
 * through to the model as before.
 */

export interface CommandResult {
  applied: boolean;
  message: string;
}

const NAMED: Record<string, string> = {
  rouge: '#e03131', red: '#e03131',
  bleu: '#1d4ed8', blue: '#1d4ed8',
  vert: '#2e7d32', green: '#2e7d32',
  jaune: '#f59f00', yellow: '#f59f00',
  orange: '#e8590c',
  violet: '#7048e8', purple: '#7048e8',
  rose: '#d6336c', pink: '#d6336c',
  noir: '#000000', black: '#000000',
  blanc: '#ffffff', white: '#ffffff',
  gris: '#868e96', gray: '#868e96', grey: '#868e96',
  'bleu marine': '#1e3a8a', navy: '#1e3a8a',
  turquoise: '#0d9488', teal: '#0d9488',
  doré: '#b8860b', dore: '#b8860b', gold: '#b8860b',
};

const BASE_SIZE: Record<string, number> = { heading: 24, text: 16, button: 16 };

function num(px: string | undefined, fallback: number): number {
  const m = /(\d+(?:\.\d+)?)/.exec(px || '');
  return m ? parseFloat(m[1]) : fallback;
}

function findBlock(t: TemplateData, id: string): { block: BlockData; row: Row } | null {
  for (const r of t.rows)
    for (const c of r.columns)
      for (const b of c.blocks) if (b.id === id) return { block: b, row: r };
  return null;
}

function removeBlock(t: TemplateData, id: string): boolean {
  for (const r of t.rows)
    for (const c of r.columns) {
      const i = c.blocks.findIndex((b) => b.id === id);
      if (i >= 0) {
        c.blocks.splice(i, 1);
        return true;
      }
    }
  return false;
}

function detectColor(text: string): string | null {
  const hex = /#([0-9a-f]{6}|[0-9a-f]{3})\b/i.exec(text);
  if (hex) return `#${hex[1]}`;
  // longest name first so "bleu marine" beats "bleu"
  for (const name of Object.keys(NAMED).sort((a, b) => b.length - a.length)) {
    if (new RegExp(`\\b${name}\\b`, 'i').test(text)) return NAMED[name];
  }
  return null;
}

/**
 * Apply recognised deterministic commands from `message` to the selected target.
 * Mutates `t`. Returns whether anything was applied + a short FR summary.
 */
export function applySelectionCommand(
  t: TemplateData,
  selection: { blockId?: string | null; sectionId?: string | null },
  message: string,
): CommandResult {
  const msg = (message || '').toLowerCase();
  const done: string[] = [];

  // ── Remove (block or whole section) — terminal, nothing else applies ──
  if (/\b(supprime|enl[èe]ve|enleve|retire|efface|delete|remove)\b/.test(msg)) {
    if (selection.blockId && removeBlock(t, selection.blockId)) return { applied: true, message: 'Élément supprimé.' };
    if (selection.sectionId) {
      const i = t.rows.findIndex((r) => r.id === selection.sectionId);
      if (i >= 0) {
        t.rows.splice(i, 1);
        return { applied: true, message: 'Section supprimée.' };
      }
    }
    return { applied: false, message: '' };
  }

  const wantsBg = /\b(fond|arri[èe]re|background|bg)\b/.test(msg);
  const located = selection.blockId ? findBlock(t, selection.blockId) : null;
  const block = located?.block;
  const row =
    located?.row ?? (selection.sectionId ? t.rows.find((r) => r.id === selection.sectionId) ?? null : null);

  // ── Background color → applies to the section (row) ──
  const color = detectColor(msg);
  if (color && wantsBg && row) {
    row.styles.backgroundColor = color;
    done.push(`fond ${color}`);
  }

  if (block) {
    // ── Alignment ──
    if (/\bcentr/.test(msg)) {
      block.styles.textAlign = 'center';
      done.push('centré');
    } else if (/\b(gauche|left)\b/.test(msg)) {
      block.styles.textAlign = 'left';
      done.push('aligné à gauche');
    } else if (/\b(droite?|right)\b/.test(msg)) {
      block.styles.textAlign = 'right';
      done.push('aligné à droite');
    }

    // ── Bold / weight ──
    if (/\b(gras|bold)\b/.test(msg)) {
      block.styles.fontWeight = '700';
      done.push('en gras');
    } else if (/\b(normal|maigre|l[ée]ger)\b/.test(msg)) {
      block.styles.fontWeight = '400';
      done.push('poids normal');
    }

    // ── Size ──
    const explicit = /(\d{2,3})\s?px/.exec(msg);
    const base = BASE_SIZE[block.type] ?? 16;
    if (explicit) {
      block.styles.fontSize = `${explicit[1]}px`;
      done.push(`taille ${explicit[1]}px`);
    } else if (/\b(plus\s+(grand|gros|grande)|agrandi\w*|grossi\w*|augment\w*)\b/.test(msg)) {
      const next = Math.min(64, Math.round(num(block.styles.fontSize, base) + 8));
      block.styles.fontSize = `${next}px`;
      done.push(`agrandi (${next}px)`);
    } else if (/\b(plus\s+petit\w*|r[ée]dui\w*|diminue\w*|r[ée]tr[ée]ci\w*)\b/.test(msg)) {
      const next = Math.max(11, Math.round(num(block.styles.fontSize, base) - 6));
      block.styles.fontSize = `${next}px`;
      done.push(`réduit (${next}px)`);
    }

    // ── Text color (only when not targeting the background) ──
    if (color && !wantsBg && (block.type === 'heading' || block.type === 'text' || block.type === 'button')) {
      if (block.type === 'button') block.styles.backgroundColor = color;
      else block.styles.color = color;
      done.push(`couleur ${color}`);
    }
  }

  if (done.length === 0) return { applied: false, message: '' };
  return { applied: true, message: `C'est fait : ${done.join(', ')}.` };
}

/** Is this message a candidate for deterministic selection editing? (Cheap
 * pre-check so we only short-circuit when a known command verb is present.) */
export function looksLikeSelectionCommand(message: string): boolean {
  const m = (message || '').toLowerCase();
  return (
    /\b(supprime|enl[èe]ve|enleve|retire|efface|delete|remove)\b/.test(m) ||
    /\bcentr|\b(gauche|droite?|left|right)\b/.test(m) ||
    /\b(gras|bold|normal|maigre|l[ée]ger)\b/.test(m) ||
    /(\d{2,3})\s?px|\b(plus\s+(grand|gros|grande|petit\w*)|agrandi\w*|grossi\w*|augment\w*|r[ée]dui\w*|diminue\w*|r[ée]tr[ée]ci\w*)\b/.test(m) ||
    /#([0-9a-f]{6}|[0-9a-f]{3})\b/i.test(m) ||
    new RegExp(`\\b(${Object.keys(NAMED).join('|')})\\b`, 'i').test(m)
  );
}
