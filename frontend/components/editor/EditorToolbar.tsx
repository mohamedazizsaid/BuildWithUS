'use client';

import { Undo2, Redo2, Save, Eye, Monitor, Tablet, Smartphone, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Link2, Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useRef, useState } from 'react';
import { BlockData } from '@/lib/editor-types';

interface EditorToolbarProps {
  templateName: string;
  activeTab: 'canvas' | 'code';
  setActiveTab: (tab: 'canvas' | 'code') => void;
  previewMode: boolean;
  setPreviewMode: (mode: boolean) => void;
  previewDevice: 'desktop' | 'tablet' | 'mobile';
  setPreviewDevice: (device: 'desktop' | 'tablet' | 'mobile') => void;
  onBack: () => void;
  onCreateTemplate: () => void;
  isSaving: boolean;
  isEditMode?: boolean;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  // Formatting toolbar
  selectedBlock: BlockData | null;
  onUpdateBlock: (blockId: string, updates: Partial<BlockData>) => void;
}

// Emoji categories for the picker
const EMOJI_CATS: { icon: string; emojis: string[] }[] = [
  { icon: '😀', emojis: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','🥲','😋','😛','😜','🤪','😝','🤗','🤭','🤫','🤔','😏','🥳'] },
  { icon: '👋', emojis: ['👋','🤚','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','💪'] },
  { icon: '❤️', emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','❤️‍🩹','❣️','💕','💞','💓','💗','💖','💘','💝','💟','💌','💑','💏','🫶','🥰','😍','😘','😻','💒'] },
  { icon: '🔥', emojis: ['🔥','💯','✨','🚀','💎','👑','🏆','🥇','⚡','💥','🌟','🎯','💪','🙌','👏','🤝','💰','📈','🧠','💡','🎉','❤️‍🔥','🦄','🌈','☀️','🌙','⭐','✅','❌','💫'] },
  { icon: '💼', emojis: ['💼','💰','💵','💶','💷','🪙','💳','💎','⚖️','🏦','🏢','📞','📱','💻','🖥️','📧','📄','📊','📈','📉','📆','📋','📌','📎','🔒','🔑','📁','📝','✂️','🖊️'] },
];
const PRESET_COLORS = [
  '#000000', '#333333', '#555555', '#777777', '#999999', '#cccccc', '#ffffff',
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6',
  '#ec4899', '#f43f5e', '#fb923c', '#fbbf24', '#4ade80', '#2dd4bf', '#60a5fa', '#a78bfa',
  '#fecdd3', '#fed7aa', '#fef08a', '#bbf7d0', '#a5f3fc', '#bfdbfe', '#ddd6fe', '#f1f5f9',
];

const FONT_OPTIONS = [
  { label: 'Inter', value: 'Inter, sans-serif' },
  { label: 'DM Sans', value: "'DM Sans', sans-serif" },
  { label: 'Montserrat', value: 'Montserrat, sans-serif' },
  { label: 'Urbanist', value: 'Urbanist, sans-serif' },
  { label: 'Lexend', value: 'Lexend, sans-serif' },
  { label: 'Work Sans', value: "'Work Sans', sans-serif" },
  { label: 'Rubik', value: 'Rubik, sans-serif' },
  { label: 'Karla', value: 'Karla, sans-serif' },
  { label: 'Archivo', value: 'Archivo, sans-serif' },
  { label: 'Nunito', value: 'Nunito, sans-serif' },
  { label: 'Poppins', value: 'Poppins, sans-serif' },
  { label: 'Raleway', value: 'Raleway, sans-serif' },
  { label: 'Outfit', value: 'Outfit, sans-serif' },
  { label: 'Plus Jakarta Sans', value: "'Plus Jakarta Sans', sans-serif" },
  { label: 'Manrope', value: 'Manrope, sans-serif' },
  { label: 'Figtree', value: 'Figtree, sans-serif' },
  { label: 'Sora', value: 'Sora, sans-serif' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Helvetica', value: 'Helvetica, sans-serif' },
  { label: 'Tahoma', value: 'Tahoma, sans-serif' },
  { label: 'Playfair Display', value: "'Playfair Display', serif" },
  { label: 'Lora', value: 'Lora, serif' },
  { label: 'Fraunces', value: 'Fraunces, serif' },
  { label: 'Cinzel', value: 'Cinzel, serif' },
  { label: 'Merriweather', value: 'Merriweather, serif' },
  { label: 'DM Serif Display', value: "'DM Serif Display', serif" },
  { label: 'Cormorant Garamond', value: "'Cormorant Garamond', serif" },
  { label: 'Libre Baskerville', value: 'Libre Baskerville, serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times New Roman', value: "'Times New Roman', serif" },
  { label: 'JetBrains Mono', value: "'JetBrains Mono', monospace" },
  { label: 'Fira Code', value: "'Fira Code', monospace" },
  { label: 'Space Mono', value: "'Space Mono', monospace" },
  { label: 'IBM Plex Mono', value: "'IBM Plex Mono', monospace" },
  { label: 'Courier New', value: "'Courier New', monospace" },
  { label: 'Pacifico', value: 'Pacifico, cursive' },
  { label: 'Lobster', value: 'Lobster, cursive' },
  { label: 'Righteous', value: 'Righteous, cursive' },
  { label: 'Caveat', value: 'Caveat, cursive' },
  { label: 'Bangers', value: 'Bangers, cursive' },
  { label: 'Bebas Neue', value: "'Bebas Neue', sans-serif" },
  { label: 'Abril Fatface', value: "'Abril Fatface', serif" },
  { label: 'Yeseva One', value: "'Yeseva One', serif" },
];

const FONT_SIZES = ['10px','12px','14px','16px','18px','20px','24px','28px','32px','36px','48px','56px','64px'];

export default function EditorToolbar({
  templateName,
  activeTab,
  setActiveTab,
  previewMode,
  setPreviewMode,
  previewDevice,
  setPreviewDevice,
  onBack,
  onCreateTemplate,
  isSaving,
  isEditMode,
  onSave,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  selectedBlock,
  onUpdateBlock,
}: EditorToolbarProps) {
  const isTextBlock = selectedBlock && (selectedBlock.type === 'heading' || selectedBlock.type === 'text' || selectedBlock.type === 'button');
  const showFormatBar = isTextBlock && activeTab === 'canvas' && !previewMode;

  return (
    <div>
      {/* Main toolbar */}
      <div className="h-12 bg-background border-b border-border flex items-center justify-between px-4">
        {/* Left */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={onBack} className="h-8 gap-1.5 text-xs">← Retour</Button>
          <div className="w-px h-5 bg-border mx-1" />
          <Button variant="ghost" size="icon" onClick={onUndo} disabled={!canUndo} className="h-8 w-8" title="Annuler (Ctrl+Z)"><Undo2 size={16} /></Button>
          <Button variant="ghost" size="icon" onClick={onRedo} disabled={!canRedo} className="h-8 w-8" title="Rétablir (Ctrl+Y)"><Redo2 size={16} /></Button>
          <div className="w-px h-5 bg-border mx-1" />
          <Button variant="ghost" size="sm" onClick={onSave} className="h-8 gap-1.5 text-xs"><Save size={14} />Enregistrer</Button>
        </div>

        {/* Center */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-foreground/80">{templateName}</span>
          <div className="flex items-center bg-muted rounded-md p-0.5">
            <button
              onClick={() => { setActiveTab('canvas'); setPreviewMode(false); }}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${activeTab === 'canvas' && !previewMode ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground/80'}`}
            >Canevas</button>
            <button
              onClick={() => { setActiveTab('code'); setPreviewMode(false); }}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${activeTab === 'code' && !previewMode ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground/80'}`}
            >Code</button>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          <Button variant={previewMode ? 'default' : 'ghost'} size="icon" onClick={() => setPreviewMode(!previewMode)} className="h-8 w-8" title="Aperçu"><Eye size={16} /></Button>
          {previewMode && (
            <div className="flex items-center gap-0.5">
              <Button variant={previewDevice === 'desktop' ? 'secondary' : 'ghost'} size="icon" onClick={() => setPreviewDevice('desktop')} className="h-7 w-7"><Monitor size={14} /></Button>
              <Button variant={previewDevice === 'tablet' ? 'secondary' : 'ghost'} size="icon" onClick={() => setPreviewDevice('tablet')} className="h-7 w-7"><Tablet size={14} /></Button>
              <Button variant={previewDevice === 'mobile' ? 'secondary' : 'ghost'} size="icon" onClick={() => setPreviewDevice('mobile')} className="h-7 w-7"><Smartphone size={14} /></Button>
            </div>
          )}
          <Button onClick={onCreateTemplate} disabled={isSaving} className="h-8 px-3 text-xs">
            {isSaving ? (isEditMode ? 'Enregistrement...' : 'Création...') : (isEditMode ? 'Enregistrer' : 'Créer le modèle')}
          </Button>
        </div>
      </div>

      {/* Format bar — appears when a text block is selected */}
      {showFormatBar && selectedBlock && (
        <FormatBar block={selectedBlock} onUpdate={(updates) => onUpdateBlock(selectedBlock.id, updates)} />
      )}
    </div>
  );
}

// ─── Format Button ───
function FmtBtn({ active, onClick, children, title }: { active?: boolean; onClick: () => void; children: React.ReactNode; title?: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}`}
    >
      {children}
    </button>
  );
}

function Dropdown({
  label,
  value,
  displayValue,
  options,
  onChange,
  maxWidth = 190,
  fontPreview,
}: {
  label: string;
  value: string;
  displayValue: string;
  options: { label: string; value: string }[];
  onChange: (v: string) => void;
  maxWidth?: number;
  fontPreview?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        title={label}
        className="h-8 text-[11px] rounded-full border border-border bg-muted/40 px-3 pr-7 shadow-sm hover:bg-muted/60 focus:outline-none focus:ring-1 focus:ring-ring flex items-center gap-2"
        style={{ maxWidth }}
      >
        <span className="truncate" style={fontPreview ? { fontFamily: value } : undefined}>
          {displayValue}
        </span>
        <span className="pointer-events-none ml-auto text-[10px] text-muted-foreground">▾</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 z-50 w-[240px] max-h-64 overflow-y-auto rounded-xl border border-border bg-popover shadow-[0_12px_30px_rgba(0,0,0,0.14)] p-1">
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`w-full text-left px-3 py-1.5 text-xs rounded-lg transition-colors ${
                  value === opt.value ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60'
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

// ─── Format Bar (like Microsoft Word ribbon) ───
function FormatBar({ block, onUpdate }: { block: BlockData; onUpdate: (updates: Partial<BlockData>) => void }) {
  const [showEmoji, setShowEmoji] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const [showColor, setShowColor] = useState(false);
  const [showBgColor, setShowBgColor] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [emojiPage, setEmojiPage] = useState(0);
  const [currentBgColor, setCurrentBgColor] = useState('#ffffff');
  const lastRangeRef = useRef<Range | null>(null);

  // Track last text selection inside editable so toolbar actions can apply to it
  useEffect(() => {
    const onSelChange = () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      const anchor = sel.anchorNode as HTMLElement | null;
      const editable = anchor
        ? (anchor.nodeType === 1 ? (anchor as HTMLElement) : anchor.parentElement)?.closest('[contenteditable="true"]')
        : null;
      if (editable && editable.contains(range.commonAncestorContainer)) {
        lastRangeRef.current = range.cloneRange();
      }
    };
    document.addEventListener('selectionchange', onSelChange);
    return () => document.removeEventListener('selectionchange', onSelChange);
  }, []);

  const isBold = block.styles.fontWeight === 'bold';
  const isItalic = block.styles.fontStyle === 'italic';
  const isUnderline = block.styles.textDecoration === 'underline';

  const toggleStyle = (key: string, onVal: string, offVal: string) => {
    onUpdate({ styles: { ...block.styles, [key]: block.styles[key] === onVal ? offVal : onVal } });
  };

  const insertEmoji = (emoji: string) => {
    const text = (block.content.text as string) || '';
    onUpdate({ content: { ...block.content, text: text + emoji } });
    setShowEmoji(false);
  };

  const applyLink = () => {
    if (linkUrl) {
      onUpdate({ content: { ...block.content, href: linkUrl }, styles: { ...block.styles, textDecoration: 'underline', color: '#2563eb' } });
    }
    setShowLink(false);
    setLinkUrl('');
  };

  const applyBackgroundColor = (color: string) => {
    const selection = window.getSelection();
    if (!selection) return;

    // Restore last selection if toolbar click collapsed it
    if ((selection.isCollapsed || selection.rangeCount === 0) && lastRangeRef.current) {
      selection.removeAllRanges();
      selection.addRange(lastRangeRef.current);
    }

    const anchor = selection.anchorNode as HTMLElement | null;
    const editable = anchor
      ? (anchor.nodeType === 1 ? (anchor as HTMLElement) : anchor.parentElement)?.closest('[contenteditable="true"]')
      : null;

    if (!editable) {
      const raw = (block.content.text as string) || '';
      const wrapped = `<span style="background-color:${color}">${raw}</span>`;
      onUpdate({ content: { ...block.content, text: wrapped } });
      return;
    }

    // If nothing selected, set highlight style at caret (do NOT wrap all).
    if (selection.isCollapsed || selection.rangeCount === 0) {
      try {
        document.execCommand('styleWithCSS', false, 'true');
        document.execCommand('hiliteColor', false, color);
      } catch {
        // Fallback: insert an empty span at caret so typing continues with the color
        const range = selection.rangeCount ? selection.getRangeAt(0) : null;
        if (range) {
          const span = document.createElement('span');
          span.style.backgroundColor = color;
          span.appendChild(document.createTextNode('\u200b'));
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
        if (el.tagName === 'SPAN' && el.style.backgroundColor) {
          el.style.backgroundColor = '';
          if (!el.getAttribute('style')) {
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

    const wrapper = document.createElement('span');
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
      const spans = Array.from(root.querySelectorAll('span[style*="background-color"]'));
      spans.forEach((span) => {
        // unwrap child bg spans
        Array.from(span.querySelectorAll('span[style*="background-color"]')).forEach((child) => {
          const parent = child.parentNode;
          if (!parent) return;
          while (child.firstChild) parent.insertBefore(child.firstChild, child);
          parent.removeChild(child);
        });
        // merge adjacent with same bg
        let next = span.nextSibling as HTMLElement | null;
        while (next && next.nodeType === 1 && (next as HTMLElement).tagName === 'SPAN') {
          const nextEl = next as HTMLElement;
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
          value={block.styles.fontFamily || 'Verdana, sans-serif'}
          displayValue={(FONT_OPTIONS.find((f) => f.value === (block.styles.fontFamily || 'Verdana, sans-serif'))?.label) || 'Verdana'}
          options={FONT_OPTIONS}
          onChange={(v) => onUpdate({ styles: { ...block.styles, fontFamily: v } })}
          maxWidth={190}
          fontPreview
        />
      </div>

      {/* Font size */}
      <div className="mr-1">
        <Dropdown
          label="Taille"
          value={block.styles.fontSize || '16px'}
          displayValue={(block.styles.fontSize || '16px').replace('px', '')}
          options={FONT_SIZES.map((s) => ({ label: s.replace('px', ''), value: s }))}
          onChange={(v) => onUpdate({ styles: { ...block.styles, fontSize: v } })}
          maxWidth={80}
        />
      </div>

      {/* Text color */}
      <div className="relative mr-1">
        <button
          onClick={() => { setShowColor(!showColor); setShowEmoji(false); setShowLink(false); setShowBgColor(false); }}
          className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-accent transition-colors"
          title="Couleur du texte"
        >
          <span
            className="w-4 h-4 rounded-sm border border-border"
            style={{ backgroundColor: block.styles.color || '#000000' }}
          />
        </button>
        {showColor && (
          <div className="absolute top-full left-0 mt-1 z-50 w-[240px] rounded-xl border border-border bg-popover shadow-[0_8px_24px_rgba(0,0,0,0.12)] p-3" onClick={(e) => e.stopPropagation()}>
            <div className="grid grid-cols-7 gap-1.5">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => { onUpdate({ styles: { ...block.styles, color: c } }); setShowColor(false); }}
                  className={`w-6 h-6 rounded-md border transition-all hover:scale-110 ${block.styles.color === c ? 'ring-2 ring-primary ring-offset-1' : 'border-border/50'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2 border-t border-border/60 pt-2">
              <input
                type="color"
                value={block.styles.color || '#000000'}
                onChange={(e) => onUpdate({ styles: { ...block.styles, color: e.target.value } })}
                className="w-7 h-7 rounded-lg cursor-pointer border-0 p-0"
              />
              <span className="text-[10px] text-muted-foreground">Custom color</span>
            </div>
          </div>
        )}
        {showColor && <div className="fixed inset-0 z-40" onClick={() => setShowColor(false)} />}
      </div>

      {/* Text background color */}
      <div className="relative mr-1">
        <button
          onClick={() => { setShowBgColor(!showBgColor); setShowEmoji(false); setShowLink(false); setShowColor(false); }}
          className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-accent transition-colors"
          title="Couleur de fond"
        >
          <span
            className="w-4 h-4 rounded-sm border border-border"
            style={{ backgroundColor: currentBgColor }}
          />
        </button>
        {showBgColor && (
          <div className="absolute top-full left-0 mt-1 z-50 w-[240px] rounded-xl border border-border bg-popover shadow-[0_8px_24px_rgba(0,0,0,0.12)] p-3" onClick={(e) => e.stopPropagation()}>
            <div className="grid grid-cols-7 gap-1.5">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => { applyBackgroundColor(c); setShowBgColor(false); }}
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
              <span className="text-[10px] text-muted-foreground">Custom color</span>
            </div>
          </div>
        )}
        {showBgColor && <div className="fixed inset-0 z-40" onClick={() => setShowBgColor(false)} />}
      </div>

      <div className="w-px h-5 bg-border mx-1.5" />

      <FmtBtn active={isBold} onClick={() => toggleStyle('fontWeight', 'bold', 'normal')} title="Gras"><Bold size={15} /></FmtBtn>
      <FmtBtn active={isItalic} onClick={() => toggleStyle('fontStyle', 'italic', 'normal')} title="Italique"><Italic size={15} /></FmtBtn>
      <FmtBtn active={isUnderline} onClick={() => toggleStyle('textDecoration', 'underline', 'none')} title="Souligné"><Underline size={15} /></FmtBtn>

      <div className="w-px h-5 bg-border mx-1.5" />

      <FmtBtn active={block.styles.textAlign === 'left'} onClick={() => onUpdate({ styles: { ...block.styles, textAlign: 'left' } })} title="Gauche"><AlignLeft size={15} /></FmtBtn>
      <FmtBtn active={block.styles.textAlign === 'center'} onClick={() => onUpdate({ styles: { ...block.styles, textAlign: 'center' } })} title="Centre"><AlignCenter size={15} /></FmtBtn>
      <FmtBtn active={block.styles.textAlign === 'right'} onClick={() => onUpdate({ styles: { ...block.styles, textAlign: 'right' } })} title="Droite"><AlignRight size={15} /></FmtBtn>

      <div className="w-px h-5 bg-border mx-1.5" />

      <FmtBtn active={showLink} onClick={() => { setShowLink(!showLink); setShowEmoji(false); setShowColor(false); setShowBgColor(false); }} title="Lien"><Link2 size={15} /></FmtBtn>
      <FmtBtn active={showEmoji} onClick={() => { setShowEmoji(!showEmoji); setShowLink(false); setShowColor(false); setShowBgColor(false); }} title="Emoji"><Smile size={15} /></FmtBtn>

      {/* Emoji picker */}
      {showEmoji && (
        <div className="absolute top-full left-0 mt-1 z-50 w-[320px] rounded-xl border border-border bg-popover shadow-[0_8px_24px_rgba(0,0,0,0.12)] overflow-hidden" onClick={(e) => e.stopPropagation()}>
          <div className="flex gap-0.5 px-2 pt-2 pb-1">
            {EMOJI_CATS.map((c, i) => (
              <button key={i} onClick={() => setEmojiPage(i)} className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center transition-all ${i === emojiPage ? 'bg-accent scale-110' : 'hover:bg-accent/50'}`}>{c.icon}</button>
            ))}
          </div>
          <div className="px-2 pb-2">
            <div className="grid grid-cols-6 gap-0.5">
              {EMOJI_CATS[emojiPage].emojis.map((e, i) => (
                <button key={i} onClick={() => insertEmoji(e)} className="w-8 h-8 rounded-lg flex items-center justify-center text-lg hover:bg-accent hover:scale-110 transition-all">{e}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Link input */}
      {showLink && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-popover rounded-xl border border-border shadow-[0_8px_24px_rgba(0,0,0,0.12)] p-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
          <input
            type="text"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://..."
            className="text-xs border border-border rounded-lg px-3 py-1.5 w-56 focus:outline-none focus:ring-1 focus:ring-ring"
            onKeyDown={(e) => { if (e.key === 'Enter') applyLink(); }}
            autoFocus
          />
          <button onClick={applyLink} className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors">OK</button>
        </div>
      )}
    </div>
  );
}

