import { renderTiptapToHtml, type RenderFloatingImage, type RenderFloatingSignature } from '@/lib/tiptap/variable-node';
import { normalizeMjml } from '../editor/_lib/mjml-parser';

export function tiptapDocToPreviewHtml(
  doc: unknown,
  options: {
    bgColor?: string;
    floatingImages?: RenderFloatingImage[];
    floatingSignatures?: RenderFloatingSignature[];
  } = {},
): string {
  try {
    const full = renderTiptapToHtml(doc as Record<string, unknown>, {}, options);
    const m = full.match(/<body>([\s\S]*)<\/body>/);
    const body = m ? m[1] : full;
    return body.replaceAll(
      /\{\{(\w+)\}\}/g,
      '<span style="display:inline-block;background:#dbeafe;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:4px;padding:0 5px;font-size:0.82em;font-weight:600;font-family:monospace;">{{$1}}</span>',
    );
  } catch {
    return '';
  }
}

export function findContractTitle(doc: unknown): string {
  try {
    const stack: unknown[] = [doc];
    while (stack.length) {
      const node = stack.pop() as Record<string, unknown> | undefined;
      if (!node) continue;
      if (node.type === 'contractHeader') {
        const c = (node.content as Record<string, unknown>[] | undefined) ?? [];
        const text = c.map((x) => (typeof x.text === 'string' ? x.text : '')).join('');
        if (text) return text.replaceAll(/\{\{[\w]+\}\}/g, '…').substring(0, 60);
      }
      if (Array.isArray(node.content)) stack.push(...(node.content as unknown[]));
    }
  } catch { /* fallthrough */ }
  return '';
}

export function relativeTime(dateStr: string): string {
  if (!dateStr || dateStr === '0') return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "À l'instant";
    if (diffMin < 60) return `Il y a ${diffMin} min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `Il y a ${diffH}h`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `Il y a ${diffD}j`;
    if (diffD < 30) return `Il y a ${Math.floor(diffD / 7)} sem.`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

/**
 * Single source of truth for distinguishing an imported raw-HTML email template
 * from a builder-authored MJML one. MJML documents always carry an `<mjml>` root;
 * raw HTML never does. Used by the editor (load/save/render) and every dashboard
 * preview surface to route raw HTML straight to an iframe instead of the MJML
 * pipeline — so MJML logic stays untouched. No DB flag: the content tells us.
 */
export function isRawHtml(content: string | null | undefined): boolean {
  return !!content && !content.includes('<mjml');
}

export function mjmlToPreviewHtml(mjml: string): string {
  try {
    // Normalize pasted/external MJML (self-close voids, strip head/comments/raw)
    // so the strict XML pass below doesn't bail out and return an empty preview.
    mjml = normalizeMjml(mjml);
    const textContents: string[] = [];
    // Stash rich text content (mj-text/mj-button) so its inline HTML and entities
    // (e.g. &nbsp;) don't have to be valid XML — restored verbatim when rendering.
    let sanitized = mjml.replace(/(<(?:mj-text|mj-button)[^>]*>)([\s\S]*?)(<\/(?:mj-text|mj-button)>)/g, (_m, open, content, close) => {
      textContents.push(content);
      return `${open}__PLACEHOLDER_${textContents.length - 1}__${close}`;
    });
    // Escape stray ampersands (e.g. "&" in image-URL query strings like
    // ?auto=compress&cs=...) that would otherwise break strict XML parsing.
    sanitized = sanitized.replace(/&(?!amp;|lt;|gt;|quot;|apos;|#\w+;)/g, '&amp;');

    const parser = new DOMParser();
    const doc = parser.parseFromString(sanitized, 'text/xml');
    if (doc.querySelector('parsererror')) return '';
    const body = doc.querySelector('mj-body');
    if (!body) return '';

    const bgColor = body.getAttribute('background-color') || '#ffffff';
    const width = body.getAttribute('width') || '600px';
    let html = `<div style="background-color:${bgColor};max-width:${width};margin:0 auto;font-family:Verdana,sans-serif;font-size:16px;color:#000;">`;

    const sections = body.querySelectorAll('mj-section');
    sections.forEach((section) => {
      const sBg = section.getAttribute('background-color') || 'transparent';
      const sPad = section.getAttribute('padding') || '10px 0';
      // Hero background photo: layer a dark scrim over the image for legibility
      // (matches the editor canvas and live preview).
      const sBgUrl = section.getAttribute('background-url');
      const sBgImg = sBgUrl
        ? `background-image:linear-gradient(rgba(0,0,0,0.45),rgba(0,0,0,0.45)),url(${sBgUrl});background-size:cover;background-position:center;background-repeat:no-repeat;`
        : '';
      html += `<div style="background-color:${sBg};${sBgImg}padding:${sPad};">`;
      html += `<div style="display:flex;">`;

      const cols = section.querySelectorAll('mj-column');
      const colCount = cols.length || 1;
      cols.forEach((col) => {
        const colW = col.getAttribute('width') || `${(100 / colCount).toFixed(1)}%`;
        html += `<div style="width:${colW};box-sizing:border-box;">`;

        for (const child of Array.from(col.children)) {
          const tag = child.tagName.toLowerCase();
          if (tag === 'mj-text') {
            const fs = child.getAttribute('font-size') || 'inherit';
            const fw = child.getAttribute('font-weight') || 'inherit';
            const ff = child.getAttribute('font-family') || 'inherit';
            const color = child.getAttribute('color') || 'inherit';
            const align = child.getAttribute('align') || 'left';
            const pad = child.getAttribute('padding') || '10px';
            const lh = child.getAttribute('line-height') || 'inherit';
            const ls = child.getAttribute('letter-spacing') || '0px';
            const bg = child.getAttribute('container-background-color');
            const bgStyle = bg ? `background-color:${bg};` : '';
            const cssClass = child.getAttribute('css-class') || '';
            const italic = cssClass.includes('italic') ? 'font-style:italic;' : '';
            const underline = cssClass.includes('underline') ? 'text-decoration:underline;' : '';
            let textContent = child.textContent || '';
            const phMatch = textContent.match(/__PLACEHOLDER_(\d+)__/);
            if (phMatch) {
              const idx = parseInt(phMatch[1]);
              textContent = textContents[idx] || textContent;
            }
            html += `<div style="${bgStyle}${italic}${underline}font-size:${fs};font-weight:${fw};font-family:${ff};color:${color};text-align:${align};padding:${pad};line-height:${lh};letter-spacing:${ls};">${textContent}</div>`;
          } else if (tag === 'mj-button') {
            const bgc = child.getAttribute('background-color') || '#0f172a';
            const c = child.getAttribute('color') || '#ffffff';
            const fs = child.getAttribute('font-size') || '16px';
            const br = child.getAttribute('border-radius') || '6px';
            const pad = child.getAttribute('padding') || '12px 24px';
            const align = child.getAttribute('align') || 'center';
            let btnText = child.textContent || '';
            const btnPhMatch = btnText.match(/__PLACEHOLDER_(\d+)__/);
            if (btnPhMatch) btnText = textContents[parseInt(btnPhMatch[1])] || btnText;
            html += `<div style="text-align:${align};padding:10px;"><span style="display:inline-block;background-color:${bgc};color:${c};font-size:${fs};padding:${pad};border-radius:${br};text-decoration:none;">${btnText}</span></div>`;
          } else if (tag === 'mj-image') {
            const src = child.getAttribute('src') || '';
            const alt = child.getAttribute('alt') || '';
            const w = child.getAttribute('width') || '100%';
            const pad = child.getAttribute('padding') || '10px';
            const br = child.getAttribute('border-radius') || '0px';
            const videoMatch = alt.match(/^video:(youtube|upload):(.+)$/);
            if (videoMatch) {
              const vType = videoMatch[1];
              const vSrc = videoMatch[2];
              const ytMatch = vSrc.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
              const ytId = ytMatch ? ytMatch[1] : null;
              if (vType === 'youtube' && ytId) {
                html += `<div style="text-align:center;padding:${pad};"><div style="position:relative;width:${w};max-width:100%;margin:0 auto;border-radius:${br};overflow:hidden;padding-bottom:56.25%;height:0"><iframe src="https://www.youtube.com/embed/${ytId}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none" allowfullscreen></iframe></div></div>`;
              } else if (src) {
                html += `<div style="text-align:center;padding:${pad};"><div style="position:relative;width:${w};max-width:100%;margin:0 auto;border-radius:${br};overflow:hidden"><img src="${src}" style="width:100%;display:block" /><div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.3)"><div style="width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,0.9);display:flex;align-items:center;justify-content:center"><div style="width:0;height:0;border-left:12px solid #0f172a;border-top:7px solid transparent;border-bottom:7px solid transparent;margin-left:2px"></div></div></div></div></div>`;
              } else {
                html += `<div style="text-align:center;padding:${pad};"><video src="${vSrc}" style="width:${w};max-width:100%;border-radius:${br}" controls></video></div>`;
              }
            } else if (src) {
              const imgAlign = child.getAttribute('align') || 'center';
              const imgMargin = imgAlign === 'center' ? 'margin:0 auto;' : imgAlign === 'right' ? 'margin-left:auto;' : '';
              const imgH = child.getAttribute('height') || 'auto';
              const imgHStyle = imgH !== 'auto' ? `height:${imgH};object-fit:cover;` : '';
              const imgBorder = child.getAttribute('border') || '';
              const imgBorderStyle = imgBorder ? `border:${imgBorder};` : '';
              const imgCircle = br === '50%' ? 'aspect-ratio:1/1;object-fit:cover;' : '';
              html += `<div style="padding:${pad};"><img src="${src}" style="display:block;width:${w};max-width:100%;border-radius:${br};${imgHStyle}${imgBorderStyle}${imgCircle}${imgMargin}" /></div>`;
            }
          } else if (tag === 'mj-divider') {
            const bc = child.getAttribute('border-color') || '#e2e8f0';
            const bw = child.getAttribute('border-width') || '1px';
            html += `<hr style="border:none;border-top:${bw} solid ${bc};margin:10px 0;" />`;
          } else if (tag === 'mj-table') {
            const tFs = child.getAttribute('font-size') || '13px';
            const tColor = child.getAttribute('color') || 'inherit';
            let tableHtml = child.innerHTML || '';
            const tPhMatch = tableHtml.match(/__PLACEHOLDER_(\d+)__/);
            if (tPhMatch) {
              tableHtml = textContents[parseInt(tPhMatch[1])] || tableHtml;
            }
            html += `<table style="width:100%;border-collapse:collapse;font-size:${tFs};color:${tColor};padding:10px;">${tableHtml}</table>`;
          }
        }
        html += `</div>`;
      });
      html += `</div></div>`;
    });
    html += `</div>`;
    return html;
  } catch {
    return '';
  }
}
