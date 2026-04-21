import React, { useState, useRef, useEffect } from "react";
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link2,
  Smile,
  Highlighter,
} from "lucide-react";
import { BlockData } from "@/lib/editor-types";
import { FmtBtn } from "./FmtBtn";
import { Dropdown } from "./Dropdown";
import { FontSizeInput } from "./FontSizeInput";
import { PRESET_COLORS, FONT_OPTIONS, EMOJI_CATS } from "./constants";

export function FormatBar({
  block,
  onUpdate,
}: {
  block: BlockData;
  onUpdate: (updates: Partial<BlockData>) => void;
}) {
  const [showEmoji, setShowEmoji] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const [showColor, setShowColor] = useState(false);
  const [showBgColor, setShowBgColor] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [emojiPage, setEmojiPage] = useState(0);
  const [currentBgColor, setCurrentBgColor] = useState("#ffffff");
  const lastRangeRef = useRef<Range | null>(null);
  const previewOrigRef = useRef<Record<string, string> | null>(null);

  const previewStyle = (key: string, val: string) => {
    if (!previewOrigRef.current) {
      previewOrigRef.current = { ...block.styles };
    }
    onUpdate({ styles: { ...block.styles, [key]: val } });
  };

  const endPreview = () => {
    if (previewOrigRef.current) {
      onUpdate({ styles: previewOrigRef.current });
      previewOrigRef.current = null;
    }
  };

  const commitStyle = (key: string, val: string) => {
    previewOrigRef.current = null;
    onUpdate({ styles: { ...block.styles, [key]: val } });
  };

  // Track last text selection inside editable so toolbar actions can apply to it
  useEffect(() => {
    const onSelChange = () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      const anchor = sel.anchorNode as HTMLElement | null;
      const editable = anchor
        ? (anchor.nodeType === 1
            ? (anchor as HTMLElement)
            : anchor.parentElement
          )?.closest('[contenteditable="true"]')
        : null;
      if (editable && editable.contains(range.commonAncestorContainer)) {
        lastRangeRef.current = range.cloneRange();
      }
    };
    document.addEventListener("selectionchange", onSelChange);
    return () => document.removeEventListener("selectionchange", onSelChange);
  }, []);

  const isBold = block.styles.fontWeight === "bold";
  const isItalic = block.styles.fontStyle === "italic";
  const isUnderline = block.styles.textDecoration === "underline";

  const toggleStyle = (key: string, onVal: string, offVal: string) => {
    onUpdate({
      styles: {
        ...block.styles,
        [key]: block.styles[key] === onVal ? offVal : onVal,
      },
    });
  };

  const insertEmoji = (emoji: string) => {
    const text = (block.content.text as string) || "";
    onUpdate({ content: { ...block.content, text: text + emoji } });
    setShowEmoji(false);
  };

  const applyLink = () => {
    if (!linkUrl) { setShowLink(false); return; }

    // Ensure URL has protocol
    const url = linkUrl.match(/^https?:\/\//) ? linkUrl : `https://${linkUrl}`;

    const selection = window.getSelection();

    // Restore last selection if toolbar click collapsed it
    if (selection && (selection.isCollapsed || selection.rangeCount === 0) && lastRangeRef.current) {
      selection.removeAllRanges();
      selection.addRange(lastRangeRef.current);
    }

    const anchor = selection?.anchorNode as HTMLElement | null;
    const editable = anchor
      ? (anchor.nodeType === 1 ? (anchor as HTMLElement) : anchor.parentElement)?.closest('[contenteditable="true"]')
      : null;

    if (editable && selection && !selection.isCollapsed && selection.rangeCount > 0) {
      // Wrap selected text in <a> tag
      const range = selection.getRangeAt(0);
      if (editable.contains(range.commonAncestorContainer)) {
        const fragment = range.extractContents();
        const link = document.createElement('a');
        link.href = url;
        link.style.color = '#2563eb';
        link.style.textDecoration = 'underline';
        link.setAttribute('target', '_blank');
        link.appendChild(fragment);
        range.insertNode(link);

        // Place caret after the link
        const after = document.createRange();
        after.setStartAfter(link);
        after.collapse(true);
        selection.removeAllRanges();
        selection.addRange(after);

        // Save the updated innerHTML back to block content
        onUpdate({ content: { ...block.content, text: editable.innerHTML } });
      }
    } else {
      // No selection — for buttons, set the href directly
      onUpdate({ content: { ...block.content, href: url } });
    }

    setShowLink(false);
    setLinkUrl("");
  };

  const applyBackgroundColor = (color: string) => {
    const selection = window.getSelection();
    if (!selection) return;

    // Restore last selection if toolbar click collapsed it
    if (
      (selection.isCollapsed || selection.rangeCount === 0) &&
      lastRangeRef.current
    ) {
      selection.removeAllRanges();
      selection.addRange(lastRangeRef.current);
    }

    const anchor = selection.anchorNode as HTMLElement | null;
    const editable = (anchor
      ? (anchor.nodeType === 1
          ? (anchor as HTMLElement)
          : anchor.parentElement
        )?.closest('[contenteditable="true"]')
      : null) as HTMLElement | null;

    if (!editable) {
      const raw = (block.content.text as string) || "";
      const wrapped = `<span style="background-color:${color}">${raw}</span>`;
      onUpdate({ content: { ...block.content, text: wrapped } });
      return;
    }

    // If nothing selected, set highlight style at caret (do NOT wrap all).
    if (selection.isCollapsed || selection.rangeCount === 0) {
      try {
        document.execCommand("styleWithCSS", false, "true");
        document.execCommand("hiliteColor", false, color);
      } catch {
        // Fallback: insert an empty span at caret so typing continues with the color
        const range = selection.rangeCount ? selection.getRangeAt(0) : null;
        if (range) {
          const span = document.createElement("span");
          span.style.backgroundColor = color;
          span.appendChild(document.createTextNode("\u200b"));
          range.insertNode(span);
          // place caret inside the span after the zero-width space
          const newRange = document.createRange();
          newRange.setStart(span.firstChild as Text, 1);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
      }
      setCurrentBgColor(color);
      onUpdate({ content: { ...block.content, text: editable.innerHTML } });
      return;
    }

    const range = selection.getRangeAt(0);
    if (!editable.contains(range.commonAncestorContainer)) return;

    const fragment = range.extractContents();

    // Strip existing background colors within the selection to avoid deep nesting
    const stripBg = (node: Node) => {
      if (node.nodeType === 1) {
        const el = node as HTMLElement;
        if (el.tagName === "SPAN" && el.style.backgroundColor) {
          el.style.backgroundColor = "";
          if (!el.getAttribute("style")) {
            // unwrap if span has no other styles
            const parent = el.parentNode;
            if (parent) {
              while (el.firstChild) parent.insertBefore(el.firstChild, el);
              parent.removeChild(el);
            }
            return;
          }
        }
        Array.from(node.childNodes).forEach(stripBg);
      }
    };
    stripBg(fragment);

    const wrapper = document.createElement("span");
    wrapper.style.backgroundColor = color;
    wrapper.appendChild(fragment);

    range.insertNode(wrapper);
    // place caret just after the wrapper to continue typing smoothly
    const after = document.createRange();
    after.setStartAfter(wrapper);
    after.collapse(true);
    selection.removeAllRanges();
    selection.addRange(after);

    // Normalize nested/adjacent background spans in the editable
    const normalizeBg = (root: HTMLElement) => {
      const spans = Array.from(
        root.querySelectorAll('span[style*="background-color"]'),
      );
      (spans as HTMLElement[]).forEach((span) => {
        // unwrap child bg spans
        Array.from(
          span.querySelectorAll('span[style*="background-color"]'),
        ).forEach((child) => {
          const parent = child.parentNode;
          if (!parent) return;
          while (child.firstChild) parent.insertBefore(child.firstChild, child);
          parent.removeChild(child);
        });
        // merge adjacent with same bg
        let next = span.nextSibling as HTMLElement | null;
        while (
          next &&
          next.nodeType === 1 &&
          next.tagName === "SPAN"
        ) {
          const nextEl = next;
          if (nextEl.style.backgroundColor === span.style.backgroundColor) {
            while (nextEl.firstChild) span.appendChild(nextEl.firstChild);
            const toRemove = nextEl;
            next = nextEl.nextSibling as HTMLElement | null;
            toRemove.parentNode?.removeChild(toRemove);
          } else {
            break;
          }
        }
      });
    };
    console.log("hello", editable);
    normalizeBg(editable);

    setCurrentBgColor(color);
    onUpdate({ content: { ...block.content, text: editable.innerHTML } });
  };

  return (
    <div className="h-10 bg-background border-b border-border flex items-center px-4 gap-0.5 relative">
      {/* Font family */}
      <div className="mr-1">
        <Dropdown
          label="Police"
          value={block.styles.fontFamily || "Verdana, sans-serif"}
          displayValue={
            FONT_OPTIONS.find(
              (f) =>
                f.value === (block.styles.fontFamily || "Verdana, sans-serif"),
            )?.label || "Verdana"
          }
          options={FONT_OPTIONS}
          onChange={(v) => commitStyle('fontFamily', v)}
          onPreview={(v) => previewStyle('fontFamily', v)}
          onPreviewEnd={endPreview}
          maxWidth={190}
          fontPreview
        />
      </div>

      {/* Font size */}
      <div className="mr-1">
        <FontSizeInput
          value={block.styles.fontSize || "16px"}
          onChange={(v) => commitStyle('fontSize', v)}
          onPreview={(v) => previewStyle('fontSize', v)}
          onPreviewEnd={endPreview}
        />
      </div>

      {/* Text color */}
      <div className="relative mr-1">
        <button
          onClick={() => {
            setShowColor(!showColor);
            setShowEmoji(false);
            setShowLink(false);
            setShowBgColor(false);
          }}
          className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-accent transition-colors"
          title="Couleur du texte"
        >
          <span
            className="w-4 h-4 rounded-sm border border-border"
            style={{ backgroundColor: block.styles.color || "#000000" }}
          />
        </button>
        {showColor && (
          <div
            className="absolute top-full left-0 mt-1 z-50 w-[240px] rounded-xl border border-border bg-popover shadow-[0_8px_24px_rgba(0,0,0,0.12)] p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid grid-cols-7 gap-1.5">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    onUpdate({ styles: { ...block.styles, color: c } });
                    setShowColor(false);
                  }}
                  className={`w-6 h-6 rounded-md border transition-all hover:scale-110 ${block.styles.color === c ? "ring-2 ring-primary ring-offset-1" : "border-border/50"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2 border-t border-border/60 pt-2">
              <input
                type="color"
                value={block.styles.color || "#000000"}
                onChange={(e) =>
                  onUpdate({
                    styles: { ...block.styles, color: e.target.value },
                  })
                }
                className="w-7 h-7 rounded-lg cursor-pointer border-0 p-0"
              />
              <span className="text-[10px] text-muted-foreground">
                Custom color
              </span>
            </div>
          </div>
        )}
        {showColor && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowColor(false)}
          />
        )}
      </div>

      {/* Text background color */}
      <div className="relative mr-1">
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            setShowBgColor(!showBgColor);
            setShowEmoji(false);
            setShowLink(false);
            setShowColor(false);
          }}
          className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-accent transition-colors relative"
          title="Couleur de fond"
        >
          <Highlighter size={16} />
          <span
            className="absolute left-1 right-1 bottom-1 h-1 rounded-full"
            style={{ backgroundColor: currentBgColor }}
          />
        </button>
        {showBgColor && (
          <div
            className="absolute top-full left-0 mt-1 z-50 w-[240px] rounded-xl border border-border bg-popover shadow-[0_8px_24px_rgba(0,0,0,0.12)] p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid grid-cols-7 gap-1.5">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    applyBackgroundColor(c);
                    setShowBgColor(false);
                  }}
                  className="w-6 h-6 rounded-md border transition-all hover:scale-110 border-border/50"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2 border-t border-border/60 pt-2">
              <input
                type="color"
                defaultValue="#ffffff"
                onChange={(e) => applyBackgroundColor(e.target.value)}
                className="w-7 h-7 rounded-lg cursor-pointer border-0 p-0"
              />
              <span className="text-[10px] text-muted-foreground">
                Custom color
              </span>
            </div>
          </div>
        )}
        {showBgColor && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowBgColor(false)}
          />
        )}
      </div>

      <div className="w-px h-5 bg-border mx-1.5" />

      <FmtBtn
        active={isBold}
        onClick={() => toggleStyle("fontWeight", "bold", "normal")}
        title="Gras"
      >
        <Bold size={15} />
      </FmtBtn>
      <FmtBtn
        active={isItalic}
        onClick={() => toggleStyle("fontStyle", "italic", "normal")}
        title="Italique"
      >
        <Italic size={15} />
      </FmtBtn>
      <FmtBtn
        active={isUnderline}
        onClick={() => toggleStyle("textDecoration", "underline", "none")}
        title="Souligné"
      >
        <Underline size={15} />
      </FmtBtn>

      <div className="w-px h-5 bg-border mx-1.5" />

      <FmtBtn
        active={block.styles.textAlign === "left"}
        onClick={() =>
          onUpdate({ styles: { ...block.styles, textAlign: "left" } })
        }
        title="Gauche"
      >
        <AlignLeft size={15} />
      </FmtBtn>
      <FmtBtn
        active={block.styles.textAlign === "center"}
        onClick={() =>
          onUpdate({ styles: { ...block.styles, textAlign: "center" } })
        }
        title="Centre"
      >
        <AlignCenter size={15} />
      </FmtBtn>
      <FmtBtn
        active={block.styles.textAlign === "right"}
        onClick={() =>
          onUpdate({ styles: { ...block.styles, textAlign: "right" } })
        }
        title="Droite"
      >
        <AlignRight size={15} />
      </FmtBtn>

      <div className="w-px h-5 bg-border mx-1.5" />

      <FmtBtn
        active={showLink}
        onMouseDown={(e: React.MouseEvent) => e.preventDefault()}
        onClick={() => {
          setShowLink(!showLink);
          setShowEmoji(false);
          setShowColor(false);
          setShowBgColor(false);
        }}
        title="Lien"
      >
        <Link2 size={15} />
      </FmtBtn>
      <FmtBtn
        active={showEmoji}
        onClick={() => {
          setShowEmoji(!showEmoji);
          setShowLink(false);
          setShowColor(false);
          setShowBgColor(false);
        }}
        title="Emoji"
      >
        <Smile size={15} />
      </FmtBtn>

      {/* Emoji picker */}
      {showEmoji && (
        <div
          className="absolute top-full left-0 mt-1 z-50 w-[320px] rounded-xl border border-border bg-popover shadow-[0_8px_24px_rgba(0,0,0,0.12)] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex gap-0.5 px-2 pt-2 pb-1">
            {EMOJI_CATS.map((c, i) => (
              <button
                key={i}
                onClick={() => setEmojiPage(i)}
                className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center transition-all ${i === emojiPage ? "bg-accent scale-110" : "hover:bg-accent/50"}`}
              >
                {c.icon}
              </button>
            ))}
          </div>
          <div className="px-2 pb-2">
            <div className="grid grid-cols-6 gap-0.5">
              {EMOJI_CATS[emojiPage].emojis.map((e, i) => (
                <button
                  key={i}
                  onClick={() => insertEmoji(e)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-lg hover:bg-accent hover:scale-110 transition-all"
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Link input */}
      {showLink && (
        <div
          className="absolute top-full left-0 mt-1 z-50 bg-popover rounded-xl border border-border shadow-[0_8px_24px_rgba(0,0,0,0.12)] p-3 flex gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="text"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://..."
            className="text-xs border border-border rounded-lg px-3 py-1.5 w-56 focus:outline-none focus:ring-1 focus:ring-ring"
            onKeyDown={(e) => {
              if (e.key === "Enter") applyLink();
            }}
            autoFocus
          />
          <button
            onClick={applyLink}
            className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors"
          >
            OK
          </button>
        </div>
      )}
    </div>
  );
}
