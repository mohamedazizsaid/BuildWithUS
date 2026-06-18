'use client';

import { BlockData, GlobalStyles } from '@/lib/editor-types';
import { SOCIAL_COLORS, getSvgPaths } from '@/lib/social-icons';
import { resolveTableTheme, thStyle, tdStyle } from '@/lib/table-theme';

export function renderBlock(block: BlockData, globalStyles: GlobalStyles) {
  // Use inherit to let global styles cascade, unless block has a specific override
  const resolveColor = (blockColor: string) => blockColor || 'inherit';
  const resolveFontSize = (blockSize: string) => blockSize || 'inherit';
  const resolveFontWeight = (blockWeight: string) => blockWeight || 'inherit';

  switch (block.type) {
    case 'heading': {
      const headingText = (block.content.text as string) || '';
      const headingEmpty = !headingText.trim();
      return (
        <div style={{
          fontSize: resolveFontSize(block.styles.fontSize),
          fontWeight: resolveFontWeight(block.styles.fontWeight),
          fontFamily: block.styles.fontFamily || 'inherit',
          fontStyle: block.styles.fontStyle || 'normal', textDecoration: block.styles.textDecoration || 'none',
          color: headingEmpty ? '#9ca3af' : resolveColor(block.styles.color),
          textAlign: block.styles.textAlign as React.CSSProperties['textAlign'],
          lineHeight: block.styles.lineHeight || 'inherit',
          letterSpacing: block.styles.letterSpacing || 'inherit',
        }}
        dangerouslySetInnerHTML={{ __html: headingEmpty ? 'Votre titre' : headingText }}
        />
      );
    }
    case 'text': {
      const textValue = (block.content.text as string) || '';
      const textEmpty = !textValue.trim();
      return (
        <div style={{
          fontSize: resolveFontSize(block.styles.fontSize),
          fontWeight: resolveFontWeight(block.styles.fontWeight),
          fontFamily: block.styles.fontFamily || 'inherit',
          fontStyle: block.styles.fontStyle || 'normal', textDecoration: block.styles.textDecoration || 'none',
          color: textEmpty ? '#9ca3af' : resolveColor(block.styles.color),
          textAlign: block.styles.textAlign as React.CSSProperties['textAlign'],
          lineHeight: block.styles.lineHeight || 'inherit',
          letterSpacing: block.styles.letterSpacing || 'inherit',
        }}
        dangerouslySetInnerHTML={{ __html: textEmpty ? 'Saisissez votre texte' : textValue }}
        />
      );
    }
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
      const bFull = bWidth !== 'auto';
      const bBorderSize = block.styles.borderSize || globalStyles.btnBorderSize;
      // Mirror blockToMjml: block.styles.padding is the OUTER spacing around the
      // button; MJML sizes the button with its default inner-padding of 10px 25px
      // and vertically centers the label.
      return (
        <div style={{ textAlign: block.styles.textAlign as React.CSSProperties['textAlign'], padding: block.styles.padding }}>
          <span style={{
            display: bFull ? 'flex' : 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: bFull ? bWidth : undefined,
            backgroundColor: block.styles.backgroundColor || globalStyles.btnBackgroundColor,
            color: block.styles.color || globalStyles.btnFontColor,
            fontSize: block.styles.fontSize || globalStyles.btnFontSize,
            fontFamily: block.styles.fontFamily || globalStyles.btnFontFamily,
            fontWeight: block.styles.fontWeight || globalStyles.btnFontWeight,
            lineHeight: block.styles.lineHeight || globalStyles.lineHeight,
            letterSpacing: block.styles.letterSpacing || undefined,
            padding: '10px 25px',
            borderRadius: block.styles.borderRadius || globalStyles.btnBorderRadius,
            border: bBorderSize && bBorderSize !== '0px'
              ? `${bBorderSize} solid ${block.styles.borderColor || globalStyles.btnBorderColor}`
              : undefined,
            cursor: 'pointer',
            textAlign: 'center',
            margin: !bFull && block.styles.textAlign === 'center' ? '0 auto' : !bFull && block.styles.textAlign === 'right' ? '0 0 0 auto' : undefined,
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
      const theme = resolveTableTheme(block.styles);
      return (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {tHeaders.map((h, i) => (
                <th key={i} style={thStyle(theme)}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tRows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td key={ci} style={tdStyle(theme, ri)}>{cell}</td>
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
    case 'menu': {
      const items = (block.content.items || []) as string[][];
      const layout = (block.content.layout as string) || 'horizontal';
      const align = (block.content.align as string) || 'center';
      const spacing = block.styles.spacing || '20px';
      const color = block.styles.color || globalStyles.linkColor || '#0f172a';
      const fontSize = block.styles.fontSize || 'inherit';
      const fontWeight = block.styles.fontWeight || 'inherit';
      const fontFamily = block.styles.fontFamily || 'inherit';
      const textDecoration = block.styles.textDecoration || 'none';
      const justifyMap: Record<string, string> = { left: 'flex-start', center: 'center', right: 'flex-end' };
      const isVertical = layout === 'vertical';

      if (items.length === 0) {
        return <div style={{ padding: block.styles.padding || '10px', textAlign: 'center', fontSize: 12, color: '#94a3b8' }}>Aucune option — ajoutez-en dans les propriétés</div>;
      }
      return (
        <div style={{
          display: 'flex',
          flexDirection: isVertical ? 'column' : 'row',
          justifyContent: justifyMap[align] || 'center',
          alignItems: isVertical ? (align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center') : 'center',
          gap: spacing,
          padding: block.styles.padding || '10px',
          flexWrap: 'wrap',
        }}>
          {items.map(([label, url], i) => (
            <a key={i} href={url || '#'} style={{ color, fontSize, fontWeight, fontFamily, textDecoration }}>
              {label || `Option ${i + 1}`}
            </a>
          ))}
        </div>
      );
    }
    case 'icon-list': {
      const items = (block.content.items || []) as string[][];
      const align = (block.content.align as string) || 'left';
      const iconColor = block.styles.iconColor || '#16a34a';
      const iconSize = block.styles.iconSize || '20px';
      const spacing = block.styles.spacing || '12px';
      const color = block.styles.color || 'inherit';
      const fontSize = block.styles.fontSize || 'inherit';
      const fontWeight = block.styles.fontWeight || 'inherit';
      const fontFamily = block.styles.fontFamily || 'inherit';
      const justify = align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start';
      if (items.length === 0) {
        return <div style={{ padding: block.styles.padding || '10px', textAlign: 'center', fontSize: 12, color: '#94a3b8' }}>Aucun élément — ajoutez-en dans les propriétés</div>;
      }
      return (
        <div style={{ padding: block.styles.padding || '10px', display: 'flex', flexDirection: 'column', gap: spacing }}>
          {items.map(([glyph, text], i) => {
            const empty = !(text || '').trim();
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: justify, gap: '8px' }}>
                <span style={{ color: iconColor, fontSize: iconSize, lineHeight: 1.4, flexShrink: 0 }}>{glyph || '•'}</span>
                <span style={{ color: empty ? '#9ca3af' : color, fontSize, fontWeight, fontFamily, lineHeight: 1.4 }}>{empty ? 'Votre texte' : text}</span>
              </div>
            );
          })}
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
