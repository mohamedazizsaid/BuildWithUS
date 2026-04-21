'use client';

import React from 'react';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BlockData } from '@/lib/editor-types';
import { NumericInput } from './shared';
import { SOCIAL_COLORS, SOCIAL_LABELS, getSvgPaths } from '@/lib/social-icons';

// ─── Social Icon ───
export function SocialIcon({ platform, size = 18 }: { platform: string; size?: number }) {
  const paths = getSvgPaths(platform);
  if (!paths) return null;
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 24 24"
      fill="white"
      stroke="none"
      dangerouslySetInnerHTML={{ __html: paths }}
    />
  );
}

// ─── Social Block Properties ───
export function SocialBlockProperties({
  block,
  onUpdate,
}: {
  block: BlockData;
  onUpdate: (updates: Partial<BlockData>) => void;
}) {
  const links = (block.content.links || []) as string[][];
  const align = (block.content.align as string) || 'center';

  const updateLinks = (newLinks: string[][]) => {
    onUpdate({ content: { ...block.content, links: newLinks } });
  };

  const addLink = (platform: string) => {
    if (links.some(([p]) => p === platform)) return;
    updateLinks([...links, [platform, '']]);
  };

  const removeLink = (idx: number) => {
    updateLinks(links.filter((_, i) => i !== idx));
  };

  const setUrl = (idx: number, url: string) => {
    const next = links.map((l, i) => i === idx ? [l[0], url] : l);
    updateLinks(next);
  };

  return (
    <div className="space-y-4">
      {/* Alignment */}
      <div>
        <Label className="text-xs mb-1 block">Alignement</Label>
        <div className="flex gap-1">
          {(['left', 'center', 'right'] as const).map((a) => (
            <button
              key={a}
              onClick={() => onUpdate({ content: { ...block.content, align: a } })}
              className={`flex-1 h-7 rounded text-xs font-medium transition-all ${align === a ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            >
              {a === 'left' ? '⬅' : a === 'center' ? '⬛' : '➡'}
            </button>
          ))}
        </div>
      </div>

      {/* Add platforms */}
      <div>
        <Label className="text-xs mb-2 block">Ajouter un réseau</Label>
        <div className="flex flex-wrap gap-1.5">
          {Object.keys(SOCIAL_COLORS).map((key) => {
            const alreadyAdded = links.some(([pl]) => pl === key);
            return (
              <button
                key={key}
                onClick={() => addLink(key)}
                disabled={alreadyAdded}
                title={SOCIAL_LABELS[key]}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:scale-110 active:scale-95"
                style={{ backgroundColor: SOCIAL_COLORS[key] }}
              >
                <SocialIcon platform={key} size={18} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Current links */}
      {links.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs">Liens</Label>
          {links.map(([platform, url], idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <div
                className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center"
                style={{ backgroundColor: SOCIAL_COLORS[platform] || '#888' }}
              >
                <SocialIcon platform={platform} size={14} />
              </div>
              <Input
                value={url}
                onChange={(e) => setUrl(idx, e.target.value)}
                placeholder={`URL ${SOCIAL_LABELS[platform] ?? platform}`}
                className="h-7 text-xs flex-1"
              />
              <button
                onClick={() => removeLink(idx)}
                className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Icon size */}
      <div>
        <Label className="text-xs">Taille des icônes</Label>
        <NumericInput
          value={block.styles.iconSize || '32px'}
          onChange={(v) => onUpdate({ styles: { ...block.styles, iconSize: v } })}
        />
      </div>

      {/* Padding */}
      <div>
        <Label className="text-xs">Marge intérieure</Label>
        <NumericInput
          value={block.styles.padding || '10px'}
          onChange={(v) => onUpdate({ styles: { ...block.styles, padding: v } })}
        />
      </div>
    </div>
  );
}
