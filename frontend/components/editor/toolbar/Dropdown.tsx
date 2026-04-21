import React, { useState } from "react";

export function Dropdown({
  label,
  value,
  displayValue,
  options,
  onChange,
  onPreview,
  onPreviewEnd,
  maxWidth = 190,
  fontPreview,
}: {
  label: string;
  value: string;
  displayValue: string;
  options: { label: string; value: string }[];
  onChange: (v: string) => void;
  onPreview?: (v: string) => void;
  onPreviewEnd?: () => void;
  maxWidth?: number;
  fontPreview?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const handleClose = () => {
    setOpen(false);
    onPreviewEnd?.();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        title={label}
        className="h-8 text-[11px] rounded-full border border-border bg-muted/40 px-3 pr-7 shadow-sm hover:bg-muted/60 focus:outline-none focus:ring-1 focus:ring-ring flex items-center gap-2"
        style={{ maxWidth }}
      >
        <span
          className="truncate"
          style={fontPreview ? { fontFamily: value } : undefined}
        >
          {displayValue}
        </span>
        <span className="pointer-events-none ml-auto text-[10px] text-muted-foreground">
          ▾
        </span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={handleClose} />
          <div className="absolute top-full left-0 mt-1 z-50 w-[240px] max-h-64 overflow-y-auto rounded-xl border border-border bg-popover shadow-[0_12px_30px_rgba(0,0,0,0.14)] p-1">
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                onMouseEnter={() => onPreview?.(opt.value)}
                onMouseLeave={() => onPreviewEnd?.()}
                className={`w-full text-left px-3 py-1.5 text-xs rounded-lg transition-colors ${
                  value === opt.value
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/60"
                }`}
                style={fontPreview ? { fontFamily: opt.value } : undefined}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
