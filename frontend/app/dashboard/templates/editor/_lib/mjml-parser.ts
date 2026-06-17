import { v4 as uuid } from 'uuid';
import type { BlockData, GlobalStyles, Row, Column } from '@/lib/editor-types';

// MJML void (self-closing) elements. People often paste them as open tags
// (`<mj-image ...>`) which is valid MJML but invalid XML — normalize them so the
// strict XML parser below doesn't choke on otherwise-correct pasted MJML.
const VOID_MJML_TAGS = [
  'mj-image', 'mj-divider', 'mj-spacer', 'mj-social-element',
  'mj-carousel-image', 'mj-navbar-link', 'mj-accordion-element',
];

/**
 * Make real-world / pasted MJML safe for the strict XML parser:
 *  - drop comments, <mj-head> (styles/attrs we don't map) and <mj-raw> blocks
 *  - force void elements to be self-closed
 */
export function normalizeMjml(mjml: string): string {
  let s = mjml;
  s = s.replace(/<!--[\s\S]*?-->/g, '');
  s = s.replace(/<mj-head\b[\s\S]*?<\/mj-head>/gi, '');
  s = s.replace(/<mj-raw\b[\s\S]*?<\/mj-raw>/gi, '');
  for (const tag of VOID_MJML_TAGS) {
    // remove any explicit closing tag, then self-close the open tag
    s = s.replace(new RegExp(`</${tag}\\s*>`, 'gi'), '');
    s = s.replace(new RegExp(`<${tag}\\b([^>]*?)\\s*/?>`, 'gi'), `<${tag}$1 />`);
  }
  return s;
}

function sanitizeMjmlForXml(mjml: string): { sanitized: string; textMap: Map<string, string> } {
  const textMap = new Map<string, string>();
  let counter = 0;

  let sanitized = mjml.replace(
    /(<mj-text[^>]*>)([\s\S]*?)(<\/mj-text>)/g,
    (_match, openTag, content, closeTag) => {
      const key = `__MJML_TEXT_${counter++}__`;
      textMap.set(key, content);
      return `${openTag}${key}${closeTag}`;
    }
  );

  sanitized = sanitized.replace(/&(?!amp;|lt;|gt;|quot;|apos;|#\w+;)/g, '&amp;');

  return { sanitized, textMap };
}

function parseBorderAttr(border: string): Record<string, string> {
  if (!border) return {};
  const parts = border.trim().split(/\s+/);
  if (parts.length >= 3) {
    return { borderSize: parts[0], borderStyle: parts[1], borderColor: parts.slice(2).join(' ') };
  }
  if (parts.length === 2) {
    return { borderSize: parts[0], borderStyle: parts[1] };
  }
  if (parts.length === 1 && parts[0] !== '0px' && parts[0] !== '0') {
    return { borderSize: parts[0] };
  }
  return {};
}

function parseBlockFromElement(tag: string, el: Element, textMap?: Map<string, string>): BlockData | null {
  const id = uuid();

  if (tag === "mj-text") {
    const fontSize = el.getAttribute("font-size") || "";
    const fontWeight = el.getAttribute("font-weight") || "";
    const color = el.getAttribute("color") || "";
    const align = el.getAttribute("align") || "left";
    const padding = el.getAttribute("padding") || "10px";
    let rawText = el.textContent || "";
    if (textMap) {
      for (const [key, original] of textMap) {
        if (rawText.includes(key)) {
          rawText = original;
          break;
        }
      }
    }
    const text = rawText;

    const sigCssClass = el.getAttribute("css-class") || "";
    if (text.includes("border-top:1px solid") || sigCssClass.startsWith("sig:")) {
      const nameMatch = text.match(/font-weight:bold">(.*?)<\/p>/);
      const titleMatch = text.match(/font-size:0\.85em">(.*?)<\/p>/);
      const smallMatches = [...text.matchAll(/font-size:0\.8em">(.*?)<\/p>/g)];
      const sigAlign = el.getAttribute("align") || "left";
      const sigMarker = sigCssClass.match(/^sig:(#[0-9a-fA-F]{6}):(.+)$/);
      return {
        id,
        type: "signature",
        content: {
          name: nameMatch?.[1] || "",
          title: titleMatch?.[1] || "",
          email: smallMatches[0]?.[1] || "",
          phone: smallMatches[1]?.[1] || "",
        },
        styles: {
          fontSize, color, padding,
          textAlign: sigAlign,
          lineColor: sigMarker ? sigMarker[1] : "#000000",
          lineWidth: sigMarker ? sigMarker[2] : "200px",
        },
      };
    }

    const isHeading = fontWeight === "bold" || fontWeight === "700";
    const bgColor = el.getAttribute("container-background-color") || "";
    const cssClass = el.getAttribute("css-class") || "";
    const fontStyle = cssClass.includes("italic") ? "italic" : "normal";
    const textDecoration = cssClass.includes("underline") ? "underline" : "none";
    let cleanText = text;
    cleanText = cleanText.replace(/<span style="(?:font-style:italic|text-decoration:underline|font-style:italic;text-decoration:underline|text-decoration:underline;font-style:italic)">([\s\S]*?)<\/span>/g, '$1');
    return {
      id,
      type: isHeading ? "heading" : "text",
      content: { text: cleanText },
      styles: {
        fontSize, fontWeight, fontStyle, textDecoration, color,
        textAlign: align, padding, backgroundColor: bgColor,
        fontFamily: el.getAttribute("font-family") || "",
        lineHeight: el.getAttribute("line-height") || "",
        letterSpacing: el.getAttribute("letter-spacing") || "",
      },
    };
  }

  if (tag === "mj-image") {
    const alt = el.getAttribute("alt") || "";
    const videoMatch = alt.match(/^video:(youtube|upload):(.+)$/);
    if (videoMatch) {
      const videoType = videoMatch[1];
      const videoSrc = videoMatch[2];
      const cover = el.getAttribute("src") || "";
      return {
        id,
        type: "video",
        content: { src: videoSrc, type: videoType, cover },
        styles: {
          width: el.getAttribute("width") || "100%",
          padding: el.getAttribute("padding") || "10px",
          textAlign: "center",
          borderRadius: el.getAttribute("border-radius") || "0px",
        },
      };
    }
    return {
      id,
      type: "image",
      content: {
        src: el.getAttribute("src") || "",
        alt,
        href: el.getAttribute("href") || "",
      },
      styles: {
        width: el.getAttribute("width") || "100%",
        height: el.getAttribute("height") || "auto",
        padding: el.getAttribute("padding") || "10px",
        textAlign: el.getAttribute("align") || "center",
        borderRadius: el.getAttribute("border-radius") || "0px",
        ...parseBorderAttr(el.getAttribute("border") || ""),
      },
    };
  }

  if (tag === "mj-button") {
    const btnBorderAttr = el.getAttribute("border") || "";
    const btnBorderParts = parseBorderAttr(btnBorderAttr);
    return {
      id,
      type: "button",
      content: {
        text: el.textContent || "Button",
        href: el.getAttribute("href") || "#",
      },
      styles: {
        backgroundColor: el.getAttribute("background-color") || "",
        color: el.getAttribute("color") || "",
        fontSize: el.getAttribute("font-size") || "",
        fontWeight: el.getAttribute("font-weight") || "",
        fontFamily: el.getAttribute("font-family") || "",
        borderRadius: el.getAttribute("border-radius") || "",
        padding: el.getAttribute("padding") || "12px 24px",
        textAlign: el.getAttribute("align") || "center",
        lineHeight: el.getAttribute("line-height") || "",
        letterSpacing: el.getAttribute("letter-spacing") || "",
        btnWidth: el.getAttribute("width") || "auto",
        ...btnBorderParts,
      },
    };
  }

  if (tag === "mj-divider") {
    return {
      id,
      type: "divider",
      content: {},
      styles: {
        borderColor: el.getAttribute("border-color") || "#e2e8f0",
        borderWidth: el.getAttribute("border-width") || "1px",
        borderStyle: el.getAttribute("border-style") || "solid",
        width: el.getAttribute("width") || "100%",
        textAlign: el.getAttribute("align") || "center",
        padding: el.getAttribute("padding") || "10px 0",
      },
    };
  }

  if (tag === "mj-table") {
    const html = el.innerHTML;
    const headerMatch = html.match(/<tr>(.*?)<\/tr>/);
    const headers: string[] = [];
    const rows: string[][] = [];

    if (headerMatch) {
      const thMatches = headerMatch[1].matchAll(/<th[^>]*>(.*?)<\/th>/g);
      for (const m of thMatches) headers.push(m[1]);
    }

    const allRows = html.matchAll(/<tr>(.*?)<\/tr>/g);
    let first = true;
    for (const rowMatch of allRows) {
      if (first) {
        first = false;
        continue;
      }
      const cells: string[] = [];
      const tdMatches = rowMatch[1].matchAll(/<td[^>]*>(.*?)<\/td>/g);
      for (const m of tdMatches) cells.push(m[1]);
      if (cells.length) rows.push(cells);
    }

    const tbClass = el.getAttribute("css-class") || "";
    // New format: tb:border:headerBg:headerColor:striped(0|1):stripeColor
    // Old format (back-compat): tb:border:headerBg
    const tbMatch = tbClass.match(/^tb:(#[0-9a-fA-F]{6}):(#[0-9a-fA-F]{6})(?::(#[0-9a-fA-F]{6}):([01]):(#[0-9a-fA-F]{6}))?$/);
    const tableStyles: Record<string, string> = {
      fontSize: el.getAttribute("font-size") || "",
      color: el.getAttribute("color") || "",
      padding: el.getAttribute("padding") || "10px",
    };
    if (tbMatch) {
      tableStyles.tableBorderColor = tbMatch[1];
      tableStyles.headerBg = tbMatch[2];
      if (tbMatch[3]) {
        tableStyles.headerColor = tbMatch[3];
        tableStyles.striped = tbMatch[4] === "1" ? "on" : "off";
        tableStyles.stripeColor = tbMatch[5];
      }
    }
    return {
      id,
      type: "table",
      content: { headers, rows },
      styles: tableStyles,
    };
  }

  return null;
}

export function parseMjmlToTemplate(
  mjml: string,
  currentGlobalStyles: GlobalStyles,
): { rows: Row[]; globalStyles: GlobalStyles } | null {
  const { sanitized, textMap } = sanitizeMjmlForXml(normalizeMjml(mjml));
  const parser = new DOMParser();
  const doc = parser.parseFromString(sanitized, "text/xml");

  const parseError = doc.querySelector("parsererror");
  if (parseError) {
    console.warn("MJML XML parse error, falling back to regex parser");
    return null;
  }

  const body = doc.querySelector("mj-body");
  if (!body) return null;

  const globalStyles = { ...currentGlobalStyles };
  const bgColor = body.getAttribute("background-color");
  const width = body.getAttribute("width");
  if (bgColor) globalStyles.bodyColor = bgColor;
  if (width) globalStyles.width = width;

  const rows: Row[] = [];
  const sections = body.querySelectorAll("mj-section");

  sections.forEach((section) => {
    const columns: Column[] = [];
    const mjCols = section.querySelectorAll("mj-column");
    const colCount = mjCols.length || 1;

    mjCols.forEach((mjCol) => {
      const blocks: BlockData[] = [];

      for (const child of Array.from(mjCol.children)) {
        const tag = child.tagName.toLowerCase();
        const block = parseBlockFromElement(tag, child, textMap);
        if (block) blocks.push(block);
      }

      columns.push({
        id: uuid(),
        width: mjCol.getAttribute("width") || `${(100 / colCount).toFixed(2)}%`,
        blocks,
      });
    });

    let layout = "100";
    if (colCount === 2) layout = "50-50";
    else if (colCount === 3) layout = "33-33-33";
    else if (colCount === 4) layout = "25-25-25-25";

    rows.push({
      id: uuid(),
      layout: layout as Row["layout"],
      columns,
      styles: {
        backgroundColor:
          section.getAttribute("background-color") || "transparent",
        padding: section.getAttribute("padding") || "10px 0",
      },
    });
  });

  return { rows, globalStyles };
}
