import { BlockData, GlobalStyles, TemplateData, DEFAULT_GLOBAL_STYLES } from './editor-types';
import { SOCIAL_COLORS, socialIconSvgString } from './social-icons';

export function generatePreviewHtml(template: TemplateData): string {
  const { rows, globalStyles } = template;
  const padding = globalStyles.paddingGroup
    ? globalStyles.paddingTop
    : `${globalStyles.paddingTop} ${globalStyles.paddingRight} ${globalStyles.paddingBottom} ${globalStyles.paddingLeft}`;
  const bgImage = globalStyles.backgroundImage
    ? `background-image:url(${globalStyles.backgroundImage});background-size:${globalStyles.backgroundSize === 'repeat' ? 'auto' : globalStyles.backgroundSize};background-repeat:${globalStyles.backgroundSize === 'repeat' ? 'repeat' : 'no-repeat'};background-position:center;`
    : '';

  let html = `<div style="background-color:${globalStyles.bodyColor};font-family:${globalStyles.fontFamily};color:${globalStyles.textColor};font-size:${globalStyles.fontSize};font-weight:${globalStyles.fontWeight};line-height:${globalStyles.lineHeight};direction:${globalStyles.textDirection};max-width:${globalStyles.width};margin:0 auto;padding:${padding};${bgImage}">`;

  for (const row of rows) {
    const rowBg = row.styles.backgroundColor === 'transparent' ? '' : `background-color:${row.styles.backgroundColor};`;
    html += `<div style="${rowBg}padding:${row.styles.padding};">`;
    html += `<div style="display:flex;">`;
    for (const col of row.columns) {
      html += `<div style="width:${col.width};box-sizing:border-box;">`;
      for (const block of col.blocks) {
        html += blockToHtml(block, globalStyles);
      }
      html += `</div>`;
    }
    html += `</div></div>`;
  }
  html += `</div>`;
  return html;
}

export function blockToHtml(block: BlockData, globalStyles: GlobalStyles): string {
  const color       = block.styles.color      || globalStyles.textColor;
  const fontSize    = block.styles.fontSize   || globalStyles.fontSize;
  const fontWeight  = block.styles.fontWeight || globalStyles.fontWeight;
  const fontFamily  = block.styles.fontFamily || globalStyles.fontFamily;
  const lineHeight  = block.styles.lineHeight || globalStyles.lineHeight;
  const letterSpacing = block.styles.letterSpacing || '0px';

  switch (block.type) {
    case 'heading':
    case 'text': {
      const txtBg        = block.styles.backgroundColor ? `background-color:${block.styles.backgroundColor};` : '';
      const txtItalic    = block.styles.fontStyle === 'italic' ? 'font-style:italic;' : '';
      const txtUnderline = block.styles.textDecoration === 'underline' ? 'text-decoration:underline;' : '';
      return `<div style="${txtBg}${txtItalic}${txtUnderline}font-size:${fontSize};font-weight:${fontWeight};font-family:${fontFamily};color:${color};text-align:${block.styles.textAlign};padding:${block.styles.padding};line-height:${lineHeight};letter-spacing:${letterSpacing};white-space:pre-wrap">${block.content.text}</div>`;
    }
    case 'image': {
      const pBr     = block.styles.borderRadius || '0px';
      const pBs     = block.styles.borderSize   || '0px';
      const pBst    = block.styles.borderStyle  || 'solid';
      const pBc     = block.styles.borderColor  || 'transparent';
      const pBorder = pBs !== '0px' ? `border:${pBs} ${pBst} ${pBc};` : '';
      const pCircle = pBr === '50%' ? 'aspect-ratio:1/1;object-fit:cover;' : '';
      const pAlign  = block.styles.textAlign || 'center';
      const pMargin = pAlign === 'center' ? 'margin:0 auto;' : pAlign === 'right' ? 'margin-left:auto;' : '';
      return block.content.src
        ? `<div style="padding:${block.styles.padding}"><img src="${block.content.src}" alt="${block.content.alt}" style="display:block;width:${block.styles.width};max-width:100%;height:${block.styles.height || 'auto'};${block.styles.height && block.styles.height !== 'auto' ? 'object-fit:cover;' : ''}border-radius:${pBr};${pBorder}${pCircle}${pMargin}" /></div>`
        : `<div style="background:#f1f5f9;padding:32px;text-align:center;color:#94a3b8;font-size:12px">Pas d'image</div>`;
    }
    case 'button': {
      // Mirror blockToMjml: block.styles.padding is the OUTER spacing around the
      // button; MJML sizes the button with its default inner-padding of 10px 25px.
      const bBorderSize = block.styles.borderSize || globalStyles.btnBorderSize || '0px';
      const bBorder = bBorderSize !== '0px' ? `border:${bBorderSize} solid ${block.styles.borderColor || globalStyles.btnBorderColor};` : '';
      const bLh = block.styles.lineHeight || globalStyles.lineHeight;
      const bLs = block.styles.letterSpacing || '0px';
      return `<div style="text-align:${block.styles.textAlign};padding:${block.styles.padding}"><a href="${block.content.href}" style="display:inline-block;background-color:${block.styles.backgroundColor || globalStyles.btnBackgroundColor};color:${block.styles.color || globalStyles.btnFontColor};font-size:${block.styles.fontSize || globalStyles.btnFontSize};font-family:${block.styles.fontFamily || globalStyles.btnFontFamily};font-weight:${block.styles.fontWeight || globalStyles.btnFontWeight};line-height:${bLh};letter-spacing:${bLs};padding:10px 25px;border-radius:${block.styles.borderRadius || globalStyles.btnBorderRadius};${bBorder}text-align:center;text-decoration:none">${block.content.text}</a></div>`;
    }
    case 'divider':
      return `<hr style="border-color:${block.styles.borderColor};border-width:${block.styles.borderWidth};margin:${block.styles.padding} 0" />`;
    case 'table': {
      const headers = (block.content.headers || []) as string[];
      const rows    = (block.content.rows    || []) as string[][];
      let t = `<table style="width:100%;border-collapse:collapse;font-size:${fontSize};color:${color};padding:${block.styles.padding}">`;
      t += `<tr>${headers.map(h => `<th style="border:1px solid #ddd;padding:8px;background:#f1f5f9;text-align:left">${h}</th>`).join('')}</tr>`;
      for (const row of rows) {
        t += `<tr>${row.map(c => `<td style="border:1px solid #ddd;padding:8px">${c}</td>`).join('')}</tr>`;
      }
      t += `</table>`;
      return t;
    }
    case 'signature':
      return `<div style="padding:${block.styles.padding};font-size:${block.styles.fontSize};color:${block.styles.color}"><div style="border-top:1px solid #000;width:200px;margin-bottom:8px"></div><p style="margin:0;font-weight:bold">${block.content.name}</p><p style="margin:0;color:#64748b">${block.content.title}</p></div>`;
    case 'social': {
      const links = (block.content.links || []) as string[][];
      const align = (block.content.align as string) || 'center';
      const size  = parseInt(block.styles.iconSize || '32') || 32;
      const pad   = block.styles.padding || '10px';
      const justifyMap: Record<string, string> = { left: 'flex-start', center: 'center', right: 'flex-end' };
      const iconSize = Math.round(size * 0.55);
      const icons = links.map(([platform, url]) => {
        const bg   = SOCIAL_COLORS[platform] || '#888';
        const href = url || '#';
        const svg  = socialIconSvgString(platform, iconSize);
        return `<a href="${href}" style="display:inline-flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:8px;background-color:${bg};text-decoration:none;flex-shrink:0">${svg}</a>`;
      }).join('');
      return `<div style="padding:${pad};display:flex;justify-content:${justifyMap[align] || 'center'};flex-wrap:wrap;gap:8px">${icons}</div>`;
    }
    default:
      return '';
  }
}

// Render a predefined template's rows directly to preview HTML using default global styles.
// This is what the gallery thumbnails use.
export function renderRowsPreview(rows: import('./editor-types').Row[]): string {
  return generatePreviewHtml({ rows, globalStyles: DEFAULT_GLOBAL_STYLES });
}
