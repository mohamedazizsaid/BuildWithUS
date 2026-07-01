import type { BlockData, GlobalStyles, TemplateData } from '@/lib/editor-types';
import { SOCIAL_COLORS, socialIconSvgString } from '@/lib/social-icons';
import { resolveTableTheme, tableCss, thCss, tdCss, encodeTableClass } from '@/lib/table-theme';

export function blockToMjml(block: BlockData, g: GlobalStyles) {
  const color = block.styles.color || g.textColor;
  const fontSize = block.styles.fontSize || g.fontSize;
  const fontWeight = block.styles.fontWeight || g.fontWeight;
  const fontFamily = block.styles.fontFamily || g.fontFamily;
  const lineHeight = block.styles.lineHeight || g.lineHeight;
  const letterSpacing = block.styles.letterSpacing || '0px';

  switch (block.type) {
    case "heading":
    case "text": {
      const bg = block.styles.backgroundColor ? ` container-background-color="${block.styles.backgroundColor}"` : '';
      const isItalic = block.styles.fontStyle === 'italic';
      const isUnderline = block.styles.textDecoration === 'underline';
      let textContent = block.content.text as string;
      if (isItalic || isUnderline) {
        const inlineStyles: string[] = [];
        if (isItalic) inlineStyles.push('font-style:italic');
        if (isUnderline) inlineStyles.push('text-decoration:underline');
        textContent = `<span style="${inlineStyles.join(';')}">${textContent}</span>`;
      }
      const markers: string[] = [];
      if (isItalic) markers.push('italic');
      if (isUnderline) markers.push('underline');
      const cssClass = markers.length > 0 ? ` css-class="${markers.join(' ')}"` : '';
      const txtHeight = block.styles.height && block.styles.height !== 'auto' ? ` height="${block.styles.height}"` : '';
      return `        <mj-text font-size="${fontSize}" font-weight="${fontWeight}" color="${color}" align="${block.styles.textAlign}" padding="${block.styles.padding}" font-family="${fontFamily}" line-height="${lineHeight}" letter-spacing="${letterSpacing}"${bg}${cssClass}${txtHeight}>${textContent}</mj-text>\n`;
    }
    case "image": {
      const imgBr = block.styles.borderRadius || '0px';
      const imgBs = block.styles.borderSize || '0px';
      const imgBst = block.styles.borderStyle || 'solid';
      const imgBc = block.styles.borderColor || 'transparent';
      const imgBorder = imgBs !== '0px' ? ` border="${imgBs} ${imgBst} ${imgBc}"` : '';
      const imgAlign = block.styles.textAlign || 'center';
      const imgSrc = (block.content.src as string || '').replace(/&/g, '&amp;');
      const imgHref = block.content.href ? ` href="${(block.content.href as string).replace(/&/g, '&amp;')}"` : '';
      const imgHeight = block.styles.height && block.styles.height !== 'auto' ? ` css-class="h:${block.styles.height}"` : '';
      return `        <mj-image src="${imgSrc}" alt="${block.content.alt}" width="${block.styles.width}" height="${block.styles.height || 'auto'}" padding="${block.styles.padding}" border-radius="${imgBr}" align="${imgAlign}"${imgBorder}${imgHref}${imgHeight} />\n`;
    }
    case "button": {
      const btnBg = block.styles.backgroundColor || g.btnBackgroundColor;
      const btnColor = block.styles.color || g.btnFontColor;
      const btnSize = block.styles.fontSize || g.btnFontSize;
      const btnRadius = block.styles.borderRadius || g.btnBorderRadius;
      const btnFamily = block.styles.fontFamily || g.btnFontFamily;
      const btnWeight = block.styles.fontWeight || g.btnFontWeight;
      const btnBorderSize = block.styles.borderSize || g.btnBorderSize || '0px';
      const btnBorderColor = block.styles.borderColor || g.btnBorderColor || 'transparent';
      const btnBorder = btnBorderSize !== '0px' ? ` border="${btnBorderSize} solid ${btnBorderColor}"` : '';
      const btnLh = block.styles.lineHeight || g.lineHeight;
      const btnLs = block.styles.letterSpacing || '0px';
      const btnW = block.styles.btnWidth && block.styles.btnWidth !== 'auto' ? ` width="${block.styles.btnWidth}"` : '';
      // inner-padding controls the button's own size (chunkiness); `padding` is the
      // OUTER spacing. Only emit when set so we don't override MJML's sane default.
      const btnInner = block.styles.innerPadding ? ` inner-padding="${block.styles.innerPadding}"` : '';
      return `        <mj-button background-color="${btnBg}" color="${btnColor}" font-size="${btnSize}" font-weight="${btnWeight}" font-family="${btnFamily}" border-radius="${btnRadius}" href="${block.content.href}" padding="${block.styles.padding}" align="${block.styles.textAlign}" line-height="${btnLh}" letter-spacing="${btnLs}"${btnBorder}${btnW}${btnInner}>${block.content.text}</mj-button>\n`;
    }
    case "divider": {
      const divStyle = block.styles.borderStyle || 'solid';
      const divWidth = block.styles.width || '100%';
      const divAlign = block.styles.textAlign || 'center';
      return `        <mj-divider border-color="${block.styles.borderColor || '#e2e8f0'}" border-width="${block.styles.borderWidth || '1px'}" border-style="${divStyle}" width="${divWidth}" align="${divAlign}" padding="${block.styles.padding || '10px 0'}" />\n`;
    }
    case "table": {
      const tHeaders = (block.content.headers || []) as string[];
      const tRows = (block.content.rows || []) as string[][];
      const tAligns = (block.content.aligns || []) as string[];
      const tTheme = resolveTableTheme(block.styles);
      let table = `        <mj-table font-size="${tTheme.fontSize}" color="${tTheme.color}" padding="${block.styles.padding}" css-class="${encodeTableClass(tTheme)}">`;
      table += `<tr>${tHeaders.map((h: string, ci: number) => `<th style="${thCss(tTheme, tAligns[ci])}">${h}</th>`).join("")}</tr>`;
      tRows.forEach((row, ri) => {
        table += `<tr>${row.map((c: string, ci: number) => `<td style="${tdCss(tTheme, ri, tAligns[ci])}">${c}</td>`).join("")}</tr>`;
      });
      table += `</mj-table>\n`;
      return table;
    }
    case "video": {
      const vSrc = block.content.src as string || '';
      const vCover = block.content.cover as string || '';
      const vBr = block.styles.borderRadius || '0px';
      const vW = block.styles.width || '100%';
      const vPad = block.styles.padding || '10px';
      const ytMatch = vSrc.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
      const ytId = ytMatch ? ytMatch[1] : null;
      if (ytId) {
        return `        <mj-image css-class="video-block" src="https://img.youtube.com/vi/${ytId}/hqdefault.jpg" alt="video:youtube:${vSrc}" href="https://www.youtube.com/watch?v=${ytId}" width="${vW}" padding="${vPad}" border-radius="${vBr}" />\n`;
      }
      if (vSrc) {
        const imgSrc = vCover || '';
        return `        <mj-image css-class="video-block" src="${imgSrc}" alt="video:upload:${vSrc}" href="${vSrc}" width="${vW}" padding="${vPad}" border-radius="${vBr}" />\n`;
      }
      return '';
    }
    case "social": {
      const links = (block.content.links || []) as string[][];
      const align = (block.content.align as string) || 'center';
      const iconSize = block.styles.iconSize || '32px';
      const pad = block.styles.padding || '10px';
      const MJML_SUPPORTED = ['facebook', 'twitter', 'google', 'pinterest', 'linkedin', 'tumblr', 'xing'];
      let out = `        <mj-social align="${align}" padding="${pad}" icon-size="${iconSize}" font-size="0">\n`;
      for (const [platform, url] of links) {
        if (!platform) continue;
        const href = (url || '#').replace(/&/g, '&amp;');
        if (MJML_SUPPORTED.includes(platform)) {
          out += `          <mj-social-element name="${platform}" href="${href}" />\n`;
        } else {
          const color = SOCIAL_COLORS[platform] || '#888888';
          const abbr = { instagram: 'Ig', youtube: 'Yt', tiktok: 'Tk', github: 'Gh', whatsapp: 'W' }[platform] ?? platform[0].toUpperCase();
          out += `          <mj-social-element name="facebook" href="${href}" background-color="${color}" css-class="social-${platform}">${abbr}</mj-social-element>\n`;
        }
      }
      out += `        </mj-social>\n`;
      return out;
    }
    case "menu": {
      const items = (block.content.items || []) as string[][];
      const layout = (block.content.layout as string) || 'horizontal';
      const align = (block.content.align as string) || 'center';
      const spacing = block.styles.spacing || '20px';
      const linkColor = block.styles.color || g.linkColor || '#0f172a';
      const linkSize = block.styles.fontSize || g.fontSize;
      const linkWeight = block.styles.fontWeight || g.fontWeight;
      const linkFamily = block.styles.fontFamily || g.fontFamily;
      const linkDeco = block.styles.textDecoration || 'none';
      const pad = block.styles.padding || '10px';
      const isVertical = layout === 'vertical';
      const linkStyle = `color:${linkColor};font-size:${linkSize};font-weight:${linkWeight};font-family:${linkFamily};text-decoration:${linkDeco}`;
      const html = isVertical
        ? items.map(([label, url]) => `<div style="text-align:${align};padding:2px 0">${label ? `<a href="${(url || '#').replace(/&/g, '&amp;')}" style="${linkStyle}">${label}</a>` : ''}</div>`).join('')
        : `<div style="text-align:${align}">${items.map(([label, url], i) => label ? `<a href="${(url || '#').replace(/&/g, '&amp;')}" style="${linkStyle};display:inline-block;${i < items.length - 1 ? `margin-right:${spacing}` : ''}">${label}</a>` : '').join('')}</div>`;
      return `        <mj-text padding="${pad}" align="${align}">${html}</mj-text>\n`;
    }
    case "icon-list": {
      const items = (block.content.items || []) as string[][];
      const ilAlign = (block.content.align as string) || 'left';
      const iconColor = block.styles.iconColor || '#16a34a';
      const iconSize = block.styles.iconSize || '20px';
      const spacing = block.styles.spacing || '12px';
      const ilPad = block.styles.padding || '10px';
      const tableMargin = ilAlign === 'center' ? 'margin:0 auto' : ilAlign === 'right' ? 'margin-left:auto' : 'margin-right:auto';
      let rowsHtml = '';
      items.forEach(([glyph, text, itemColor], i) => {
        const pb = i < items.length - 1 ? spacing : '0';
        rowsHtml += `<tr><td style="vertical-align:top;padding:0 8px ${pb} 0;color:${itemColor || iconColor};font-size:${iconSize};line-height:1.4;white-space:nowrap">${glyph || '&bull;'}</td><td style="vertical-align:top;padding:0 0 ${pb} 0;line-height:1.4">${text || ''}</td></tr>`;
      });
      // Round-trip marker: iconlist:align:iconColor:iconSize:spacing(no px)
      const marker = `iconlist:${ilAlign}:${iconColor}:${iconSize}:${spacing.replace(/px$/, '')}`;
      return `        <mj-text padding="${ilPad}" color="${color}" font-size="${fontSize}" font-weight="${fontWeight}" font-family="${fontFamily}" css-class="${marker}"><table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;${tableMargin}"><tbody>${rowsHtml}</tbody></table></mj-text>\n`;
    }
    case "color-bar": {
      const segments = (block.content.segments || []) as string[];
      const cbHeight = block.styles.height || '8px';
      const cbRadius = block.styles.borderRadius || '0px';
      const cbPad = block.styles.padding || '0';
      const n = segments.length || 1;
      const w = (100 / n).toFixed(4);
      const cellRadius = (first: boolean, last: boolean) => {
        if (cbRadius === '0px' || cbRadius === '0') return '';
        if (first && last) return `border-radius:${cbRadius};`;
        if (first) return `border-radius:${cbRadius} 0 0 ${cbRadius};`;
        if (last) return `border-radius:0 ${cbRadius} ${cbRadius} 0;`;
        return '';
      };
      const cells = segments
        .map((c, i) => `<td bgcolor="${c}" style="background-color:${c};width:${w}%;height:${cbHeight};font-size:0;line-height:0;mso-line-height-rule:exactly;${cellRadius(i === 0, i === n - 1)}">&nbsp;</td>`)
        .join('');
      return `        <mj-text padding="${cbPad}" line-height="0" css-class="colorbar:${cbHeight}:${cbRadius}"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;table-layout:fixed;width:100%"><tbody><tr>${cells}</tr></tbody></table></mj-text>\n`;
    }
    case "signature": {
      const sigLineColor = block.styles.lineColor || '#000000';
      const sigLineWidth = block.styles.lineWidth || '200px';
      const sigAlign = block.styles.textAlign || 'left';
      const sigEmail = block.content.email ? `<p style="margin:2px 0 0;opacity:0.6;font-size:0.8em">${block.content.email}</p>` : '';
      const sigPhone = block.content.phone ? `<p style="margin:2px 0 0;opacity:0.6;font-size:0.8em">${block.content.phone}</p>` : '';
      const sigTitle = block.content.title ? `<p style="margin:2px 0 0;opacity:0.7;font-size:0.85em">${block.content.title}</p>` : '';
      return `        <mj-text padding="${block.styles.padding}" font-size="${fontSize}" color="${color}" align="${sigAlign}" css-class="sig:${sigLineColor}:${sigLineWidth}"><div style="border-top:1px solid ${sigLineColor};width:${sigLineWidth};margin-bottom:8px;${sigAlign === 'center' ? 'margin-left:auto;margin-right:auto' : sigAlign === 'right' ? 'margin-left:auto' : ''}"></div><p style="margin:0;font-weight:bold">${block.content.name}</p>${sigTitle}${sigEmail}${sigPhone}</mj-text>\n`;
    }
    default:
      return "";
  }
}

function blockToHtml(block: BlockData, globalStyles: GlobalStyles): string {
  const color = block.styles.color || globalStyles.textColor;
  const fontSize = block.styles.fontSize || globalStyles.fontSize;
  const fontWeight = block.styles.fontWeight || globalStyles.fontWeight;
  const fontFamily = block.styles.fontFamily || globalStyles.fontFamily;
  const lineHeight = block.styles.lineHeight || globalStyles.lineHeight;
  const letterSpacing = block.styles.letterSpacing || "0px";

  switch (block.type) {
    case "heading":
    case "text": {
      const txtBg = block.styles.backgroundColor ? `background-color:${block.styles.backgroundColor};` : '';
      const txtItalic = block.styles.fontStyle === 'italic' ? 'font-style:italic;' : '';
      const txtUnderline = block.styles.textDecoration === 'underline' ? 'text-decoration:underline;' : '';
      const rawTxt = (block.content.text as string) || '';
      const isSpacerBar = block.styles.height && block.styles.height !== 'auto'
        && rawTxt.replace(/&nbsp;|&#160;| |\s/g, '') === '';
      if (isSpacerBar) {
        return `<div style="${txtBg}height:${block.styles.height};font-size:0;line-height:0"></div>`;
      }
      return `<div style="${txtBg}${txtItalic}${txtUnderline}font-size:${fontSize};font-weight:${fontWeight};font-family:${fontFamily};color:${color};text-align:${block.styles.textAlign};padding:${block.styles.padding};line-height:${lineHeight};letter-spacing:${letterSpacing}">${block.content.text}</div>`;
    }
    case "image": {
      const pBr = block.styles.borderRadius || '0px';
      const pBs = block.styles.borderSize || '0px';
      const pBst = block.styles.borderStyle || 'solid';
      const pBc = block.styles.borderColor || 'transparent';
      const pBorder = pBs !== '0px' ? `border:${pBs} ${pBst} ${pBc};` : '';
      const pCircle = pBr === '50%' ? 'aspect-ratio:1/1;object-fit:cover;' : '';
      const pAlign = block.styles.textAlign || 'center';
      const pMargin = pAlign === 'center' ? 'margin:0 auto;' : pAlign === 'right' ? 'margin-left:auto;' : '';
      return block.content.src
        ? `<div style="padding:${block.styles.padding}"><img src="${block.content.src}" alt="${block.content.alt}" style="display:block;width:${block.styles.width};max-width:100%;height:${block.styles.height || 'auto'};${block.styles.height && block.styles.height !== 'auto' ? 'object-fit:cover;' : ''}border-radius:${pBr};${pBorder}${pCircle}${pMargin}" /></div>`
        : `<div style="background:#f1f5f9;padding:32px;text-align:center;color:#94a3b8;font-size:12px">Pas d'image</div>`;
    }
    case "button": {
      // Mirror blockToMjml: block.styles.padding is the OUTER spacing around the
      // button; MJML sizes the button with its default inner-padding of 10px 25px.
      const btnBg = block.styles.backgroundColor || globalStyles.btnBackgroundColor;
      const btnColor = block.styles.color || globalStyles.btnFontColor;
      const btnSize = block.styles.fontSize || globalStyles.btnFontSize;
      const btnRadius = block.styles.borderRadius || globalStyles.btnBorderRadius;
      const btnFamily = block.styles.fontFamily || globalStyles.btnFontFamily;
      const btnWeight = block.styles.fontWeight || globalStyles.btnFontWeight;
      const btnBorderSize = block.styles.borderSize || globalStyles.btnBorderSize || '0px';
      const btnBorderColor = block.styles.borderColor || globalStyles.btnBorderColor || 'transparent';
      const btnBorder = btnBorderSize !== '0px' ? `border:${btnBorderSize} solid ${btnBorderColor};` : '';
      const btnLh = block.styles.lineHeight || globalStyles.lineHeight;
      const btnLs = block.styles.letterSpacing || '0px';
      const innerPad = block.styles.innerPadding || '10px 25px'; // MJML mj-button default inner-padding
      const btnFull = block.styles.btnWidth && block.styles.btnWidth !== 'auto';
      const btnDisplay = btnFull ? `display:block;width:${block.styles.btnWidth};box-sizing:border-box;` : 'display:inline-block;';
      return `<div style="text-align:${block.styles.textAlign};padding:${block.styles.padding}"><a href="${block.content.href}" style="${btnDisplay}background-color:${btnBg};color:${btnColor};font-size:${btnSize};font-family:${btnFamily};font-weight:${btnWeight};line-height:${btnLh};letter-spacing:${btnLs};padding:${innerPad};border-radius:${btnRadius};${btnBorder}text-align:center;text-decoration:none">${block.content.text}</a></div>`;
    }
    case "divider":
      return `<hr style="border-color:${block.styles.borderColor};border-width:${block.styles.borderWidth};margin:${block.styles.padding} 0" />`;
    case "table": {
      const headers = (block.content.headers || []) as string[];
      const rows = (block.content.rows || []) as string[][];
      const hAligns = (block.content.aligns || []) as string[];
      const hTheme = resolveTableTheme(block.styles);
      let t = `<table style="${tableCss()};padding:${block.styles.padding}">`;
      t += `<tr>${headers.map((h: string, ci: number) => `<th style="${thCss(hTheme, hAligns[ci])}">${h}</th>`).join("")}</tr>`;
      rows.forEach((row, ri) => {
        t += `<tr>${row.map((c: string, ci: number) => `<td style="${tdCss(hTheme, ri, hAligns[ci])}">${c}</td>`).join("")}</tr>`;
      });
      t += `</table>`;
      return t;
    }
    case "video": {
      const vSrc = block.content.src as string || '';
      const vYtMatch = vSrc.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
      const vYtId = vYtMatch ? vYtMatch[1] : null;
      const vWidth = block.styles.width || '100%';
      const vAlign = block.styles.textAlign || 'center';
      const vRadius = block.styles.borderRadius || '0px';
      if (vYtId) {
        return `<div style="text-align:${vAlign};padding:${block.styles.padding}"><div style="width:${vWidth};max-width:100%;margin:${vAlign === 'center' ? '0 auto' : '0'};border-radius:${vRadius};overflow:hidden;position:relative;padding-bottom:56.25%;height:0"><iframe src="https://www.youtube.com/embed/${vYtId}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen></iframe></div></div>`;
      }
      if (vSrc) {
        const vCover = block.content.cover as string;
        if (vCover) {
          return `<div style="text-align:${vAlign};padding:${block.styles.padding}"><div style="position:relative;width:${vWidth};max-width:100%;margin:${vAlign === 'center' ? '0 auto' : '0'};border-radius:${vRadius};overflow:hidden"><img src="${vCover}" style="width:100%;display:block" /><div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.3)"><div style="width:48px;height:48px;border-radius:50%;background:rgba(255,255,255,0.9);display:flex;align-items:center;justify-content:center"><div style="width:0;height:0;border-left:14px solid #0f172a;border-top:9px solid transparent;border-bottom:9px solid transparent;margin-left:3px"></div></div></div></div></div>`;
        }
        return `<div style="text-align:${vAlign};padding:${block.styles.padding}"><video src="${vSrc}" style="width:${vWidth};max-width:100%;border-radius:${vRadius}" controls></video></div>`;
      }
      return '';
    }
    case "menu": {
      const items = (block.content.items || []) as string[][];
      const layout = (block.content.layout as string) || 'horizontal';
      const align = (block.content.align as string) || 'center';
      const spacing = block.styles.spacing || '20px';
      const linkColor = block.styles.color || globalStyles.linkColor || '#0f172a';
      const linkSize = block.styles.fontSize || globalStyles.fontSize;
      const linkWeight = block.styles.fontWeight || globalStyles.fontWeight;
      const linkFamily = block.styles.fontFamily || globalStyles.fontFamily;
      const linkDeco = block.styles.textDecoration || 'none';
      const pad = block.styles.padding || '10px';
      const linkStyle = `color:${linkColor};font-size:${linkSize};font-weight:${linkWeight};font-family:${linkFamily};text-decoration:${linkDeco}`;
      const justifyMap: Record<string, string> = { left: 'flex-start', center: 'center', right: 'flex-end' };
      if (layout === 'vertical') {
        const rows = items.map(([label, url]) => label ? `<div style="text-align:${align};padding:${parseInt(spacing) / 2 || 4}px 0"><a href="${url || '#'}" style="${linkStyle}">${label}</a></div>` : '').join('');
        return `<div style="padding:${pad}">${rows}</div>`;
      }
      const linksH = items.map(([label, url]) => label ? `<a href="${url || '#'}" style="${linkStyle};margin:0 ${parseInt(spacing) / 2 || 10}px;display:inline-block">${label}</a>` : '').join('');
      return `<div style="padding:${pad};display:flex;justify-content:${justifyMap[align] || 'center'};flex-wrap:wrap;align-items:center">${linksH}</div>`;
    }
    case "icon-list": {
      const items = (block.content.items || []) as string[][];
      const ilAlign = (block.content.align as string) || 'left';
      const iconColor = block.styles.iconColor || '#16a34a';
      const iconSize = block.styles.iconSize || '20px';
      const spacing = block.styles.spacing || '12px';
      const ilColor = block.styles.color || globalStyles.textColor;
      const ilFontSize = block.styles.fontSize || globalStyles.fontSize;
      const ilFontWeight = block.styles.fontWeight || globalStyles.fontWeight;
      const ilFontFamily = block.styles.fontFamily || globalStyles.fontFamily;
      const tableMargin = ilAlign === 'center' ? 'margin:0 auto' : ilAlign === 'right' ? 'margin-left:auto' : 'margin-right:auto';
      const rows = items.map(([glyph, text, itemColor], i) => {
        const pb = i < items.length - 1 ? spacing : '0';
        return `<tr><td style="vertical-align:top;padding:0 8px ${pb} 0;color:${itemColor || iconColor};font-size:${iconSize};line-height:1.4;white-space:nowrap">${glyph || '&bull;'}</td><td style="vertical-align:top;padding:0 0 ${pb} 0;color:${ilColor};font-size:${ilFontSize};font-weight:${ilFontWeight};font-family:${ilFontFamily};line-height:1.4">${text || ''}</td></tr>`;
      }).join('');
      return `<div style="padding:${block.styles.padding || '10px'}"><table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;${tableMargin}"><tbody>${rows}</tbody></table></div>`;
    }
    case "color-bar": {
      const segments = (block.content.segments || []) as string[];
      const cbHeight = block.styles.height || '8px';
      const cbRadius = block.styles.borderRadius || '0px';
      const cbPad = block.styles.padding || '0';
      const n = segments.length || 1;
      const w = (100 / n).toFixed(4);
      const cellRadius = (first: boolean, last: boolean) => {
        if (cbRadius === '0px' || cbRadius === '0') return '';
        if (first && last) return `border-radius:${cbRadius};`;
        if (first) return `border-radius:${cbRadius} 0 0 ${cbRadius};`;
        if (last) return `border-radius:0 ${cbRadius} ${cbRadius} 0;`;
        return '';
      };
      const cells = segments
        .map((c, i) => `<td bgcolor="${c}" style="background-color:${c};width:${w}%;height:${cbHeight};font-size:0;line-height:0;${cellRadius(i === 0, i === n - 1)}">&nbsp;</td>`)
        .join('');
      return `<div style="padding:${cbPad}"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;table-layout:fixed;width:100%"><tbody><tr>${cells}</tr></tbody></table></div>`;
    }
    case "signature":
      return `<div style="padding:${block.styles.padding};font-size:${block.styles.fontSize};color:${block.styles.color}"><div style="border-top:1px solid #000;width:200px;margin-bottom:8px"></div><p style="margin:0;font-weight:bold">${block.content.name}</p><p style="margin:0;color:#64748b">${block.content.title}</p></div>`;
    case "social": {
      const links = (block.content.links || []) as string[][];
      const align = (block.content.align as string) || 'center';
      const size = parseInt(block.styles.iconSize || '32') || 32;
      const pad = block.styles.padding || '10px';
      const justifyMap: Record<string, string> = { left: 'flex-start', center: 'center', right: 'flex-end' };
      const iconSize = Math.round(size * 0.55);
      const icons = links.map(([platform, url]) => {
        const bg = SOCIAL_COLORS[platform] || '#888';
        const href = url || '#';
        const svg = socialIconSvgString(platform, iconSize);
        return `<a href="${href}" style="display:inline-flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:8px;background-color:${bg};text-decoration:none;flex-shrink:0">${svg}</a>`;
      }).join('');
      return `<div style="padding:${pad};display:flex;justify-content:${justifyMap[align] || 'center'};flex-wrap:wrap;gap:8px">${icons}</div>`;
    }
    default:
      return "";
  }
}

export function generatePreviewHtml(template: TemplateData): string {
  const { rows, globalStyles } = template;
  const padding = globalStyles.paddingGroup
    ? globalStyles.paddingTop
    : `${globalStyles.paddingTop} ${globalStyles.paddingRight} ${globalStyles.paddingBottom} ${globalStyles.paddingLeft}`;
  const bgImage = globalStyles.backgroundImage
    ? `background-image:url(${globalStyles.backgroundImage});background-size:${globalStyles.backgroundSize === "repeat" ? "auto" : globalStyles.backgroundSize};background-repeat:${globalStyles.backgroundSize === "repeat" ? "repeat" : "no-repeat"};background-position:center;`
    : "";

  // Surface any custom <mj-style> CSS (incl. @media / .h1 rules) into the HTML
  // preview so it renders the way the compiled email will.
  const styleCss = (globalStyles.customHead || "")
    .match(/<mj-style\b[^>]*>([\s\S]*?)<\/mj-style>/gi)
    ?.map((s) => s.replace(/<\/?mj-style\b[^>]*>/gi, ""))
    .join("\n") || "";

  let html = styleCss ? `<style>${styleCss}</style>` : "";
  html += `<div style="background-color:${globalStyles.bodyColor};font-family:${globalStyles.fontFamily};color:${globalStyles.textColor};font-size:${globalStyles.fontSize};font-weight:${globalStyles.fontWeight};line-height:${globalStyles.lineHeight};direction:${globalStyles.textDirection};max-width:${globalStyles.width};margin:0 auto;padding:${padding};${bgImage}">`;

  for (const row of rows) {
    const rowBg =
      row.styles.backgroundColor === "transparent"
        ? ""
        : `background-color:${row.styles.backgroundColor};`;
    // Hero background photo: layer a dark scrim over the image for legibility so
    // text laid on top stays readable (matches the editor canvas).
    const rowBgImg = row.styles.backgroundUrl
      ? `background-image:linear-gradient(rgba(0,0,0,0.45),rgba(0,0,0,0.45)),url(${row.styles.backgroundUrl});background-size:cover;background-position:center;background-repeat:no-repeat;`
      : "";
    html += `<div style="${rowBg}${rowBgImg}padding:${row.styles.padding};">`;
    html += `<div style="display:flex;">`;
    for (const col of row.columns) {
      const cs = col.styles || {};
      // Card columns: padding is the outer gutter, bg/border/radius go on an
      // inner wrapper so adjacent cards are spaced apart (matches CanvasColumn).
      const hasCard = !!(cs.backgroundColor || cs.border || cs.borderRadius);
      const noPad = !cs.padding || cs.padding === "0" || cs.padding === "0px";
      const outerPad = hasCard ? (noPad ? "8px" : cs.padding) : cs.padding;
      const cardCss =
        (cs.backgroundColor ? `background-color:${cs.backgroundColor};` : "") +
        (cs.border ? `border:${cs.border};` : "") +
        (cs.borderRadius ? `border-radius:${cs.borderRadius};` : "");
      const outerCss =
        `width:${col.width};box-sizing:border-box;` +
        (outerPad ? `padding:${outerPad};` : "") +
        (cs.verticalAlign ? `vertical-align:${cs.verticalAlign};` : "") +
        (hasCard ? "" : cardCss);
      html += `<div style="${outerCss}">`;
      if (hasCard) html += `<div style="box-sizing:border-box;height:100%;overflow:hidden;${cardCss}">`;
      for (const block of col.blocks) {
        html += blockToHtml(block, globalStyles);
      }
      if (hasCard) html += `</div>`;
      html += `</div>`;
    }
    html += `</div></div>`;
  }

  html += `</div>`;
  return html;
}
