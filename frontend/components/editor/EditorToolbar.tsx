'use client';

import { Undo2, Redo2, Save, Eye, Monitor, Tablet, Smartphone, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Link2, Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
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

// ─── Format Bar (like Microsoft Word ribbon) ───
function FormatBar({ block, onUpdate }: { block: BlockData; onUpdate: (updates: Partial<BlockData>) => void }) {
  const [showEmoji, setShowEmoji] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [emojiPage, setEmojiPage] = useState(0);

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

  return (
    <div className="h-10 bg-background border-b border-border flex items-center px-4 gap-0.5 relative">
      <FmtBtn active={isBold} onClick={() => toggleStyle('fontWeight', 'bold', 'normal')} title="Gras"><Bold size={15} /></FmtBtn>
      <FmtBtn active={isItalic} onClick={() => toggleStyle('fontStyle', 'italic', 'normal')} title="Italique"><Italic size={15} /></FmtBtn>
      <FmtBtn active={isUnderline} onClick={() => toggleStyle('textDecoration', 'underline', 'none')} title="Souligné"><Underline size={15} /></FmtBtn>

      <div className="w-px h-5 bg-border mx-1.5" />

      <FmtBtn active={block.styles.textAlign === 'left'} onClick={() => onUpdate({ styles: { ...block.styles, textAlign: 'left' } })} title="Gauche"><AlignLeft size={15} /></FmtBtn>
      <FmtBtn active={block.styles.textAlign === 'center'} onClick={() => onUpdate({ styles: { ...block.styles, textAlign: 'center' } })} title="Centre"><AlignCenter size={15} /></FmtBtn>
      <FmtBtn active={block.styles.textAlign === 'right'} onClick={() => onUpdate({ styles: { ...block.styles, textAlign: 'right' } })} title="Droite"><AlignRight size={15} /></FmtBtn>

      <div className="w-px h-5 bg-border mx-1.5" />

      <FmtBtn active={showLink} onClick={() => { setShowLink(!showLink); setShowEmoji(false); }} title="Lien"><Link2 size={15} /></FmtBtn>
      <FmtBtn active={showEmoji} onClick={() => { setShowEmoji(!showEmoji); setShowLink(false); }} title="Emoji"><Smile size={15} /></FmtBtn>

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
