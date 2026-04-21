'use client';

import { BlockData, GlobalStyles } from '@/lib/editor-types';
import { SOCIAL_COLORS, getSvgPaths } from '@/lib/social-icons';

export function renderBlock(block: BlockData, globalStyles: GlobalStyles) {
  // Use inherit to let global styles cascade, unless block has a specific override
  const resolveColor = (blockColor: string) => blockColor || 'inherit';
  const resolveFontSize = (blockSize: string) => blockSize || 'inherit';
  const resolveFontWeight = (blockWeight: string) => blockWeight || 'inherit';

  switch (block.type) {
    case 'heading':
      return (
        <div style={{
          fontSize: resolveFontSize(block.styles.fontSize),
          fontWeight: resolveFontWeight(block.styles.fontWeight),
          fontFamily: block.styles.fontFamily || 'inherit',
          fontStyle: block.styles.fontStyle || 'normal', textDecoration: block.styles.textDecoration || 'none',
          color: resolveColor(block.styles.color),
          textAlign: block.styles.textAlign as React.CSSProperties['textAlign'],
          lineHeight: block.styles.lineHeight || 'inherit',
          letterSpacing: block.styles.letterSpacing || 'inherit',
        }}
        dangerouslySetInnerHTML={{ __html: (block.content.text as string) || 'Titre' }}
        />
      );
    case 'text':
      return (
        <div style={{
          fontSize: resolveFontSize(block.styles.fontSize),
          fontWeight: resolveFontWeight(block.styles.fontWeight),
          fontFamily: block.styles.fontFamily || 'inherit',
          fontStyle: block.styles.fontStyle || 'normal', textDecoration: block.styles.textDecoration || 'none',
          color: resolveColor(block.styles.color),
          textAlign: block.styles.textAlign as React.CSSProperties['textAlign'],
          lineHeight: block.styles.lineHeight || 'inherit',
          letterSpacing: block.styles.letterSpacing || 'inherit',
        }}
        dangerouslySetInnerHTML={{ __html: (block.content.text as string) || 'Texte' }}
        />
      );
    case 'image': {
      const imgBorderSize = block.styles.borderSize || '0px';
      const imgBorderStyle = block.styles.borderStyle || 'solid';
      const imgBorderColor = block.styles.borderColor || 'transparent';
      const imgHasBorder = imgBorderSize !== '0px' && imgBorderSize !== '0';
      return (
        <div style={{ textAlign: block.styles.textAlign as React.CSSProperties['textAlign'] }}>
          {block.content.src ? (
            <img
              src={block.content.src as string}
              alt={block.content.alt as string}
              style={{
                width: block.styles.width,
                maxWidth: '100%',
                height: block.styles.height || 'auto',
                objectFit: block.styles.height ? 'cover' as const : undefined,
                borderRadius: block.styles.borderRadius || '0px',
                border: imgHasBorder ? `${imgBorderSize} ${imgBorderStyle} ${imgBorderColor}` : 'none',
                display: 'inline-block',
                ...(block.styles.borderRadius === '50%' ? { aspectRatio: '1/1', objectFit: 'cover' as const } : {}),
              }}
            />
          ) : (
            <div className="bg-muted rounded-md flex items-center justify-center py-8">
              <p className="text-xs text-muted-foreground">Pas d&apos;image — définir l&apos;URL dans les propriétés</p>
            </div>
          )}
        </div>
      );
    }
    case 'video': {
      const src = (block.content.src as string) || '';
      const youtubeMatch = src.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
      const youtubeId = youtubeMatch ? youtubeMatch[1] : null;
      const isYoutube = youtubeId !== null;
      return (
        <div style={{ textAlign: block.styles.textAlign as React.CSSProperties['textAlign'], padding: block.styles.padding }}>
          {isYoutube ? (
            <div style={{ width: block.styles.width, maxWidth: '100%', margin: block.styles.textAlign === 'center' ? '0 auto' : undefined, borderRadius: block.styles.borderRadius, overflow: 'hidden' }}>
              <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
                <iframe
                  src={`https://www.youtube.com/embed/${youtubeId}`}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          ) : block.content.src ? (
            <div style={{ position: 'relative', width: block.styles.width, maxWidth: '100%', margin: block.styles.textAlign === 'center' ? '0 auto' : undefined, borderRadius: block.styles.borderRadius, overflow: 'hidden' }}>
              {block.content.cover ? (
                <div style={{ position: 'relative' }}>
                  <img src={block.content.cover as string} alt="Cover" style={{ width: '100%', display: 'block' }} />
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: 0, height: 0, borderLeft: '14px solid #0f172a', borderTop: '9px solid transparent', borderBottom: '9px solid transparent', marginLeft: 3 }} />
                    </div>
                  </div>
                </div>
              ) : (
                <video src={block.content.src as string} style={{ width: '100%', display: 'block' }} controls />
              )}
            </div>
          ) : (
            <div className="bg-muted rounded-md flex flex-col items-center justify-center py-10 gap-2">
              <div className="w-10 h-10 rounded-full bg-muted-foreground/10 flex items-center justify-center">
                <div style={{ width: 0, height: 0, borderLeft: '10px solid currentColor', borderTop: '6px solid transparent', borderBottom: '6px solid transparent', marginLeft: 2 }} className="text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">Aucune vidéo</p>
            </div>
          )}
        </div>
      );
    }
    case 'button': {
      const bWidth = block.styles.btnWidth || 'auto';
      return (
        <div style={{ textAlign: block.styles.textAlign as React.CSSProperties['textAlign'] }}>
          <span style={{
            display: bWidth !== 'auto' ? 'block' : 'inline-block',
            width: bWidth !== 'auto' ? bWidth : undefined,
            backgroundColor: block.styles.backgroundColor || globalStyles.btnBackgroundColor,
            color: block.styles.color || globalStyles.btnFontColor,
            fontSize: block.styles.fontSize || globalStyles.btnFontSize,
            fontFamily: block.styles.fontFamily || globalStyles.btnFontFamily,
            fontWeight: block.styles.fontWeight || globalStyles.btnFontWeight,
            padding: block.styles.padding,
            borderRadius: block.styles.borderRadius || globalStyles.btnBorderRadius,
            border: `${block.styles.borderSize || globalStyles.btnBorderSize} solid ${block.styles.borderColor || globalStyles.btnBorderColor}`,
            cursor: 'pointer',
            textAlign: 'center',
            margin: block.styles.textAlign === 'center' ? '0 auto' : block.styles.textAlign === 'right' ? '0 0 0 auto' : undefined,
          }}>
            <span dangerouslySetInnerHTML={{ __html: (block.content.text as string) || 'Bouton' }} />
          </span>
        </div>
      );
    }
    case 'divider': {
      const dW = block.styles.width || '100%';
      const dAlign = block.styles.textAlign || 'center';
      const dMargin = dAlign === 'center' ? '0 auto' : dAlign === 'right' ? '0 0 0 auto' : '0';
      return (
        <div style={{ padding: block.styles.padding || '10px 0' }}>
          <hr style={{
            border: 'none',
            borderTop: `${block.styles.borderWidth || '1px'} ${block.styles.borderStyle || 'solid'} ${block.styles.borderColor || '#e2e8f0'}`,
            width: dW,
            margin: dMargin,
          }} />
        </div>
      );
    }
    case 'table': {
      const tHeaders = (block.content.headers || []) as string[];
      const tRows = (block.content.rows || []) as string[][];
      const tBorderColor = block.styles.tableBorderColor || '#dddddd';
      const tHeaderBg = block.styles.headerBg || '#f1f5f9';
      const tFontSize = block.styles.fontSize || '13px';
      const tColor = block.styles.color || 'inherit';
      const tFontFamily = block.styles.fontFamily || 'inherit';
      return (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {tHeaders.map((h, i) => (
                <th key={i} style={{ border: `1px solid ${tBorderColor}`, backgroundColor: tHeaderBg, padding: '8px 12px', textAlign: 'left', fontSize: tFontSize, fontWeight: 600, color: tColor, fontFamily: tFontFamily }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tRows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td key={ci} style={{ border: `1px solid ${tBorderColor}`, padding: '8px 12px', fontSize: tFontSize, color: tColor, fontFamily: tFontFamily }}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
    case 'social': {
      const links = (block.content.links || []) as string[][];
      const align = (block.content.align as string) || 'center';
      const size = parseInt(block.styles.iconSize || '32') || 32;
      const pad = block.styles.padding || '10px';
      const justifyMap: Record<string, string> = { left: 'flex-start', center: 'center', right: 'flex-end' };

      return (
        <div style={{ padding: pad, display: 'flex', justifyContent: justifyMap[align] || 'center', gap: '8px', flexWrap: 'wrap' }}>
          {links.length === 0 ? (
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Aucun réseau — cliquez pour en ajouter</span>
          ) : (
            links.map(([platform], i) => {
              const paths = getSvgPaths(platform);
              const iconSize = Math.round(size * 0.55);
              return (
                <div
                  key={i}
                  style={{
                    width: size, height: size, borderRadius: '8px',
                    backgroundColor: SOCIAL_COLORS[platform] || '#888',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {paths ? (
                    <svg
                      width={iconSize} height={iconSize}
                      viewBox="0 0 24 24"
                      fill="white"
                      stroke="none"
                      dangerouslySetInnerHTML={{ __html: paths }}
                    />
                  ) : (
                    <span style={{ color: '#fff', fontSize: Math.round(size * 0.35), fontWeight: 700 }}>
                      {platform[0].toUpperCase()}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      );
    }
    case 'signature': {
      const sLineColor = block.styles.lineColor || '#000000';
      const sLineWidth = block.styles.lineWidth || '200px';
      const sAlign = block.styles.textAlign || 'left';
      return (
        <div style={{ fontSize: block.styles.fontSize || 'inherit', color: block.styles.color || 'inherit', textAlign: sAlign as React.CSSProperties['textAlign'] }}>
          <div style={{ borderTop: `1px solid ${sLineColor}`, width: sLineWidth, marginBottom: '8px', display: 'inline-block' }} />
          <p style={{ margin: 0, fontWeight: 600 }}>{block.content.name as string || 'Nom'}</p>
          {block.content.title && <p style={{ margin: '2px 0 0', opacity: 0.7, fontSize: '0.85em' }}>{block.content.title as string}</p>}
          {block.content.email && <p style={{ margin: '2px 0 0', opacity: 0.6, fontSize: '0.8em' }}>{block.content.email as string}</p>}
          {block.content.phone && <p style={{ margin: '2px 0 0', opacity: 0.6, fontSize: '0.8em' }}>{block.content.phone as string}</p>}
        </div>
      );
    }
    default:
      return <div className="text-xs text-muted-foreground">Bloc inconnu</div>;
  }
}
