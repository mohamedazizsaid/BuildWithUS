'use client';

import React, { useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BlockData } from '@/lib/editor-types';
import { AccordionSection } from './shared';
import { StyledSelect, AlignmentSelector } from './FontSelectors';

// ─── YouTube URL helpers ───
export function extractYoutubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
  return match ? match[1] : null;
}

export function getYoutubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

// ─── Video Block Properties ───
export function VideoBlockProperties({
  block,
  updateContent,
  updateStyle,
  onUpdate,
}: {
  block: BlockData;
  updateContent: (key: string, value: string) => void;
  updateStyle: (key: string, value: string) => void;
  onUpdate: (updates: Partial<BlockData>) => void;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>('source');
  const fileRef = useRef<HTMLInputElement>(null);
  const videoType = (block.content.type as string) || 'upload';
  const youtubeId = videoType === 'youtube' ? extractYoutubeId(block.content.src as string || '') : null;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const { media } = await import('@/lib/api');
      const result = await media.upload(file);
      onUpdate({ content: { ...block.content, src: result.url, type: 'upload' } });
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setIsUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const [youtubeInput, setYoutubeInput] = useState((block.content.type === 'youtube' ? block.content.src as string : '') || '');

  const applyYoutubeUrl = (url?: string) => {
    const val = url ?? youtubeInput;
    if (!val) return;
    const id = extractYoutubeId(val);
    if (id) {
      onUpdate({ content: { ...block.content, src: val, type: 'youtube', cover: getYoutubeThumbnail(id) } });
    }
  };

  return (
    <div className="space-y-1">
      <AccordionSection openSection={openSection} setOpenSection={setOpenSection} id="source" title="Source">
        {/* Type toggle */}
        <div>
          <Label className="text-xs">Type de vidéo</Label>
          <div className="flex gap-1 mt-1">
            {[
              { v: 'upload', l: 'Fichier' },
              { v: 'youtube', l: 'YouTube' },
            ].map((opt) => (
              <button
                key={opt.v}
                onClick={() => updateContent('type', opt.v)}
                className={`flex-1 h-8 text-xs rounded-xl border transition-colors ${
                  videoType === opt.v ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'border-border hover:bg-accent hover:border-ring'
                }`}
              >
                {opt.l}
              </button>
            ))}
          </div>
        </div>

        {videoType === 'upload' ? (
          <>
            {block.content.src && (
              <div className="relative rounded-xl overflow-hidden border border-border bg-black">
                <video src={block.content.src as string} className="w-full h-32 object-contain" />
                <button
                  onClick={() => updateContent('src', '')}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs hover:bg-red-600 shadow"
                >×</button>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-10 h-10 rounded-full bg-white/80 flex items-center justify-center">
                    <div className="w-0 h-0 border-l-[10px] border-l-slate-900 border-y-[6px] border-y-transparent ml-1" />
                  </div>
                </div>
              </div>
            )}
            <input ref={fileRef} type="file" accept="video/mp4,video/webm,video/ogg" onChange={handleUpload} className="hidden" />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={isUploading}
              className="w-full h-9 rounded-xl border border-dashed border-border text-xs text-muted-foreground hover:bg-accent hover:border-ring transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isUploading ? (
                <><div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" /> Upload...</>
              ) : (
                <>{block.content.src ? 'Changer la vidéo' : 'Importer une vidéo'}</>
              )}
            </button>
          </>
        ) : (
          <>
            <div>
              <Label className="text-xs">URL YouTube</Label>
              <Input
                value={youtubeInput}
                onChange={(e) => {
                  setYoutubeInput(e.target.value);
                  // Auto-apply if valid YouTube URL detected (paste)
                  if (extractYoutubeId(e.target.value)) {
                    applyYoutubeUrl(e.target.value);
                  }
                }}
                onBlur={() => applyYoutubeUrl()}
                onKeyDown={(e) => { if (e.key === 'Enter') applyYoutubeUrl(); }}
                className="h-8 text-xs mt-1"
                placeholder="https://youtube.com/watch?v=..."
              />
              {youtubeInput && !extractYoutubeId(youtubeInput) && (
                <p className="text-[10px] text-red-500 mt-1">URL YouTube invalide</p>
              )}
            </div>
            {youtubeId && (
              <div className="relative rounded-xl overflow-hidden border border-border">
                <img src={getYoutubeThumbnail(youtubeId)} alt="YouTube thumbnail" className="w-full h-32 object-cover" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-8 rounded-lg bg-red-600 flex items-center justify-center">
                    <div className="w-0 h-0 border-l-[8px] border-l-white border-y-[5px] border-y-transparent ml-0.5" />
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Cover image */}
        {videoType === 'upload' && (
          <div>
            <Label className="text-xs">Image de couverture (URL)</Label>
            <Input value={block.content.cover as string || ''} onChange={(e) => updateContent('cover', e.target.value)} className="h-8 text-xs mt-1" placeholder="https://..." />
          </div>
        )}
      </AccordionSection>

      <AccordionSection openSection={openSection} setOpenSection={setOpenSection} id="layout" title="Mise en page">
        <StyledSelect
          label="Largeur"
          value={block.styles.width || '100%'}
          onChange={(v) => updateStyle('width', v)}
          options={[
            { value: '50%', label: '50%' },
            { value: '75%', label: '75%' },
            { value: '100%', label: '100%' },
          ]}
        />
        <AlignmentSelector label="Alignement" value={block.styles.textAlign || 'center'} onChange={(v) => updateStyle('textAlign', v)} />
        <StyledSelect
          label="Angles arrondis"
          value={block.styles.borderRadius || '0px'}
          onChange={(v) => updateStyle('borderRadius', v)}
          options={[
            { value: '0px', label: 'Carré' },
            { value: '8px', label: 'Arrondi (8px)' },
            { value: '16px', label: 'Grand (16px)' },
          ]}
        />
      </AccordionSection>

      <AccordionSection openSection={openSection} setOpenSection={setOpenSection} id="spacing" title="Espacement">
        <StyledSelect
          label="Marge intérieure"
          value={block.styles.padding || '10px'}
          onChange={(v) => updateStyle('padding', v)}
          options={[
            { value: '0px', label: 'Aucun' },
            { value: '10px', label: 'Normal (10px)' },
            { value: '16px', label: 'Grand (16px)' },
            { value: '24px', label: 'Extra (24px)' },
          ]}
        />
      </AccordionSection>
    </div>
  );
}
