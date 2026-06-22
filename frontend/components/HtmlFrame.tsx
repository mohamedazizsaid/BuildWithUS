'use client';

import type { CSSProperties } from 'react';

/** Force every link to open in a new tab so clicking one in a preview never
 *  navigates the editor away. Injected right after <head>/<html>, else prepended. */
function withBaseTarget(html: string): string {
  if (/<base\b/i.test(html)) return html;
  const tag = '<base target="_blank" rel="noopener">';
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, (m) => m + tag);
  if (/<html[^>]*>/i.test(html)) return html.replace(/<html[^>]*>/i, (m) => m + tag);
  return tag + html;
}

/**
 * Renders imported raw HTML email templates in a sandboxed iframe.
 *
 * The sandbox keeps scripts OFF (email HTML never needs JS, and this stops an
 * imported document from touching the host app) but allows popups — so links,
 * combined with the injected `<base target="_blank">`, open in a new tab and
 * are fully clickable, exactly like the MJML preview. The HTML is shown as
 * authored: what you import is what you see/send.
 */
export function HtmlFrame({
  html,
  title = 'Aperçu HTML',
  className,
  style,
  newTabLinks = true,
  sandbox = 'allow-popups allow-popups-to-escape-sandbox',
}: Readonly<{
  html: string;
  title?: string;
  className?: string;
  style?: CSSProperties;
  newTabLinks?: boolean;
  sandbox?: string;
}>) {
  const doc = newTabLinks ? withBaseTarget(html) : html;
  return (
    <iframe
      title={title}
      srcDoc={doc}
      sandbox={sandbox}
      className={className}
      style={{ border: 'none', ...style }}
    />
  );
}
