'use client';

import { useEffect, useRef } from 'react';

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
// Keeps the look of the rendered PDF (no input borders) while staying editable.
export function InlineText({ value, onChange, placeholder, className, style, multiline, ariaLabel }: InlineTextProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  // Sync external value changes without disturbing the caret while typing.
  useEffect(() => {
    if (!ref.current) return;
    if (ref.current.innerText !== value) ref.current.innerText = value;
  }, [value]);

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-label={ariaLabel}
      data-placeholder={placeholder}
      onBlur={(e) => {
        const next = (e.target as HTMLDivElement).innerText;
        if (next !== value) onChange(next);
      }}
      onKeyDown={(e) => {
        if (!multiline && e.key === 'Enter') {
          e.preventDefault();
          (e.target as HTMLDivElement).blur();
        }
      }}
      className={`inline-editable focus:outline-none rounded transition-colors focus:bg-indigo-50/40 hover:bg-slate-50 px-0.5 -mx-0.5 ${className ?? ''}`}
      style={style}
    >
      {value}
    </div>
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
