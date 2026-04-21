import React from "react";

export function FmtBtn({
  active,
  onClick,
  onMouseDown,
  children,
  title,
}: {
  active?: boolean;
  onClick: () => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      onMouseDown={onMouseDown}
      title={title}
      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}
    >
      {children}
    </button>
  );
}
