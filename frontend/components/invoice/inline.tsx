'use client';

import { useEffect, useRef, useState } from 'react';
import { renderTextWithPills } from '@/lib/invoice/variables';

interface InlineTextProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  multiline?: boolean;
  ariaLabel?: string;
}

// Lightweight contenteditable wrapper used everywhere in the invoice canvas.
// Keeps the look of the rendered PDF (no input borders) while staying editable,
// and lets the user drop variable chips from the palette to insert `{{var}}`
// tokens. When not focused, `{{var}}` segments are rendered as styled pills;
// while focused, the value is shown as plain text so the caret behaves normally.
export function InlineText({ value, onChange, placeholder, className, style, multiline, ariaLabel }: InlineTextProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [focused, setFocused] = useState(false);

  // Sync the DOM with the React state without disturbing the caret while typing.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (focused) {
      if (el.innerText !== value) el.innerText = value;
    } else {
      const html = renderTextWithPills(value);
      if (el.innerHTML !== html) el.innerHTML = html;
    }
  }, [value, focused]);

  // Insert text at the current caret position (or at the end as fallback).
  const insertAtCaret = (text: string) => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !el.contains(sel.anchorNode)) {
      // No caret inside the element — append at the end.
      const next = (el.innerText ?? '') + text;
      el.innerText = next;
      onChange(next);
      return;
    }
    const range = sel.getRangeAt(0);
    range.deleteContents();
    range.insertNode(document.createTextNode(text));
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
    onChange(el.innerText);
  };

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-label={ariaLabel}
      data-placeholder={placeholder}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        setFocused(false);
        const next = (e.target as HTMLDivElement).innerText;
        if (next !== value) onChange(next);
      }}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('variable-name')) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
        }
      }}
      onDrop={(e) => {
        const name = e.dataTransfer.getData('variable-name');
        if (!name) return;
        e.preventDefault();
        e.stopPropagation();
        // Position the caret where the drop occurred so the token lands there.
        const range = document.caretRangeFromPoint?.(e.clientX, e.clientY);
        if (range) {
          const sel = window.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
        insertAtCaret(`{{${name}}}`);
      }}
      onKeyDown={(e) => {
        if (!multiline && e.key === 'Enter') {
          e.preventDefault();
          (e.target as HTMLDivElement).blur();
        }
      }}
      className={`inline-editable focus:outline-none rounded transition-colors focus:bg-indigo-50/40 hover:bg-slate-50 px-0.5 -mx-0.5 ${className ?? ''}`}
      style={style}
    />
  );
}

interface InlineNumberProps {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  className?: string;
  style?: React.CSSProperties;
  ariaLabel?: string;
}

export function InlineNumber({ value, onChange, step = 1, min, className, style, ariaLabel }: InlineNumberProps) {
  return (
    <input
      type="number"
      value={Number.isFinite(value) ? value : 0}
      step={step}
      min={min}
      aria-label={ariaLabel}
      onChange={(e) => {
        const n = parseFloat(e.target.value);
        onChange(Number.isFinite(n) ? n : 0);
      }}
      className={`bg-transparent focus:outline-none rounded focus:bg-indigo-50/40 hover:bg-slate-50 px-0.5 -mx-0.5 w-full text-right ${className ?? ''}`}
      style={style}
    />
  );
}

// ─── Number-or-token (line items) ─────────────────────────────────────────
// Used by quantity/unitPrice/vatRate, which may hold a numeric value (concrete
// invoice) or a `{{token}}` (template placeholder). A drop swaps the value to
// the token; typing a number switches back to numeric mode.

const TOKEN_ONLY_RE = /^\s*\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}\s*$/;

function valueAsToken(value: number | string): string | null {
  if (typeof value !== 'string') return null;
  const m = TOKEN_ONLY_RE.exec(value);
  return m ? m[1] : null;
}

interface InlineNumberOrTokenProps {
  value: number | string;
  onChange: (v: number | string) => void;
  step?: number;
  min?: number;
  suffix?: string;
  className?: string;
  style?: React.CSSProperties;
  ariaLabel?: string;
}

export function InlineNumberOrToken({ value, onChange, step = 1, min, suffix, className, style, ariaLabel }: InlineNumberOrTokenProps) {
  const token = valueAsToken(value);

  const handleDrop = (e: React.DragEvent) => {
    const name = e.dataTransfer.getData('variable-name');
    if (!name) return;
    e.preventDefault();
    e.stopPropagation();
    onChange(`{{${name}}}`);
  };
  const handleDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('variable-name')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  if (token) {
    // Compact label for the default `ligne_<col>_<n>` tokens so the cells
    // don't blow the table width. Custom tokens fall back to the full name.
    const compact = (() => {
      const m = /^ligne_(qte|prix|tva|description)_(\d+)$/.exec(token);
      if (!m) return token;
      const labels: Record<string, string> = { qte: 'Qté', prix: 'Prix', tva: 'TVA', description: 'Desc' };
      return `${labels[m[1]]} ${m[2]}`;
    })();
    return (
      <span
        className={`inline-editable inline-flex items-center justify-end gap-1 rounded px-1 ${className ?? ''}`}
        style={style}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        title={`{{${token}}} — Cliquez × pour saisir un nombre`}
      >
        <span className="invoice-var" aria-label={ariaLabel}>{compact}</span>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onChange(0); }}
          className="text-slate-300 hover:text-red-500 text-[10px] leading-none"
          title="Revenir à une valeur numérique"
        >×</button>
      </span>
    );
  }

  const numericValue = typeof value === 'number' ? value : Number.parseFloat(String(value).replace(',', '.')) || 0;
  return (
    <span className="inline-flex items-center gap-1 w-full justify-end" onDragOver={handleDragOver} onDrop={handleDrop}>
      <input
        type="number"
        value={Number.isFinite(numericValue) ? numericValue : 0}
        step={step}
        min={min}
        aria-label={ariaLabel}
        onChange={(e) => {
          const n = Number.parseFloat(e.target.value);
          onChange(Number.isFinite(n) ? n : 0);
        }}
        className={`bg-transparent focus:outline-none rounded focus:bg-indigo-50/40 hover:bg-slate-50 px-0.5 -mx-0.5 w-full text-right ${className ?? ''}`}
        style={style}
      />
      {suffix && <span className="text-slate-400 text-[9px]">{suffix}</span>}
    </span>
  );
}
