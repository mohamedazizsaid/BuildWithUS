import React, { useState, useRef } from "react";
import { FONT_SIZES } from "./constants";

export function FontSizeInput({
  value,
  onChange,
  onPreview,
  onPreviewEnd,
}: {
  value: string;
  onChange: (v: string) => void;
  onPreview?: (v: string) => void;
  onPreviewEnd?: () => void;
}) {
  const numVal = parseInt(value) || 16;
  const [inputVal, setInputVal] = useState(String(numVal));
  const [prevValue, setPrevValue] = useState(value);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync when external value changes (https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes)
  if (value !== prevValue) {
    setPrevValue(value);
    setInputVal(String(parseInt(value) || 16));
  }

  const commit = (raw: string) => {
    const n = parseInt(raw);
    if (!isNaN(n) && n >= 1) {
      onChange(`${n}px`);
    } else {
      setInputVal(String(numVal)); // reset to last valid
    }
    setOpen(false);
  };

  return (
    <div className="relative">
      <div className="flex items-center h-8 rounded-full border border-border bg-muted/40 shadow-sm hover:bg-muted/60 focus-within:ring-1 focus-within:ring-ring overflow-hidden"
        style={{ width: 68 }}>
        <input
          ref={inputRef}
          type="number"
          min={1}
          value={inputVal}
          onChange={(e) => {
            setInputVal(e.target.value);
            const n = parseInt(e.target.value);
            if (!isNaN(n) && n >= 1) onPreview?.(`${n}px`);
          }}
          onFocus={() => { setOpen(true); inputRef.current?.select(); }}
          onBlur={(e) => {
            // Don't commit if clicking a dropdown item
            setTimeout(() => {
              if (document.activeElement !== inputRef.current) {
                commit(e.target.value);
                onPreviewEnd?.();
              }
            }, 120);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") { commit(inputVal); inputRef.current?.blur(); }
            if (e.key === "Escape") { setInputVal(String(numVal)); setOpen(false); onPreviewEnd?.(); inputRef.current?.blur(); }
          }}
          className="w-full bg-transparent text-[11px] text-center px-2 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button
          tabIndex={-1}
          onMouseDown={(e) => { e.preventDefault(); setOpen((o) => !o); }}
          className="pr-2 text-[10px] text-muted-foreground shrink-0"
        >▾</button>
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onMouseDown={() => { setOpen(false); onPreviewEnd?.(); }} />
          <div className="absolute top-full left-0 mt-1 z-50 w-20 max-h-56 overflow-y-auto rounded-xl border border-border bg-popover shadow-[0_12px_30px_rgba(0,0,0,0.14)] p-1">
            {FONT_SIZES.map((s) => {
              const n = parseInt(s);
              return (
                <button
                  key={s}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setInputVal(String(n));
                    onChange(s);
                    setOpen(false);
                    onPreviewEnd?.();
                  }}
                  onMouseEnter={() => onPreview?.(s)}
                  onMouseLeave={() => onPreviewEnd?.()}
                  className={`w-full text-center px-2 py-1 text-xs rounded-lg transition-colors ${
                    numVal === n ? "bg-accent text-accent-foreground" : "hover:bg-accent/60"
                  }`}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
