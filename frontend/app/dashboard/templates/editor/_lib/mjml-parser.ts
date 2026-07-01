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

/**
 * Pull what we can use out of <mj-head> BEFORE it's stripped for XML parsing:
 *  - `customHead`: raw mj-title / mj-preview / mj-style kept verbatim for round-trip
 *  - `attrDefaults`: mj-attributes defaults (mj-all / mj-text / mj-button) by tag
 * Done with regex (not the XML parser) so a stray `>`/`{` inside mj-style CSS
 * can never break the whole import.
 */
export function extractHead(mjml: string): {
  customHead: string;
  attrDefaults: Record<string, Record<string, string>>;
} {
  const headMatch = mjml.match(/<mj-head\b[^>]*>([\s\S]*?)<\/mj-head>/i);
  if (!headMatch) return { customHead: '', attrDefaults: {} };
  const head = headMatch[1];

  const keep: string[] = [];
  for (const re of [
    /<mj-title\b[\s\S]*?<\/mj-title>/gi,
    /<mj-preview\b[\s\S]*?<\/mj-preview>/gi,
    /<mj-style\b[\s\S]*?<\/mj-style>/gi,
  ]) {
    for (const m of head.matchAll(re)) keep.push(m[0].trim());
  }

  const attrDefaults: Record<string, Record<string, string>> = {};
  const attrsBlock = head.match(/<mj-attributes\b[^>]*>([\s\S]*?)<\/mj-attributes>/i);
  if (attrsBlock) {
    for (const tagMatch of attrsBlock[1].matchAll(/<(mj-[a-z-]+)\b([^>]*?)\/?>/gi)) {
      const tagName = tagMatch[1].toLowerCase();
      const attrs: Record<string, string> = attrDefaults[tagName] || {};
      for (const a of tagMatch[2].matchAll(/([a-z-]+)="([^"]*)"/gi)) {
        attrs[a[1].toLowerCase()] = a[2];
      }
      attrDefaults[tagName] = attrs;
    }
  }

  return { customHead: keep.join('\n'), attrDefaults };
}

// Fold mj-attributes defaults into the global styles so blocks that rely on
// document-level defaults (rather than per-element attributes) still look right.
function applyAttrDefaults(
  gs: GlobalStyles,
  d: Record<string, Record<string, string>>,
): GlobalStyles {
  const out = { ...gs };
  const all = d['mj-all'] || {};
  const text = d['mj-text'] || {};
  const btn = d['mj-button'] || {};
  if (all['font-family']) out.fontFamily = all['font-family'];
  if (text['font-family']) out.fontFamily = text['font-family'];
  if (text['color']) out.textColor = text['color'];
  if (text['font-size']) out.fontSize = text['font-size'];
  if (text['line-height']) out.lineHeight = text['line-height'];
  if (text['font-weight']) out.fontWeight = text['font-weight'];
  if (btn['background-color']) out.btnBackgroundColor = btn['background-color'];
  if (btn['color']) out.btnFontColor = btn['color'];
  if (btn['font-size']) out.btnFontSize = btn['font-size'];
  if (btn['font-family']) out.btnFontFamily = btn['font-family'];
  if (btn['font-weight']) out.btnFontWeight = btn['font-weight'];
  if (btn['border-radius']) out.btnBorderRadius = btn['border-radius'];
  return out;
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

// Pull the first hex colour out of a marker cell's inline styles (the coloured
// dot's background/color), so a bullet list keeps roughly the right icon colour.
function extractMarkerColor(td: Element | null): string {
  if (!td) return "";
  const styled = td.querySelector("[style]") || td;
  const style = styled.getAttribute("style") || "";
  const m =
    style.match(/background-color:\s*(#[0-9a-fA-F]{3,8})/) ||
    style.match(/(?:^|[;\s])color:\s*(#[0-9a-fA-F]{3,8})/);
  return m ? m[1] : "";
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

    // Icon list — encoded as an mj-text whose css-class carries the marker
    // "iconlist:align:iconColor:iconSize:spacing" and whose body is a 2-col table.
    const ilCssClass = el.getAttribute("css-class") || "";
    const ilMatch = ilCssClass.match(/^iconlist:(left|center|right):(#[0-9a-fA-F]{6}):(\d+px):(\d+)$/);
    if (ilMatch) {
      const items: string[][] = [];
      for (const tr of text.matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
        const cells = [...tr[1].matchAll(/<td([^>]*)>([\s\S]*?)<\/td>/g)];
        if (cells.length >= 2) {
          const glyph = cells[0][2].trim();
          const cellText = cells[1][2].trim();
          // Per-item icon colour, if the glyph cell carries its own `color:` —
          // falls back to the block-level iconColor when absent.
          const colorMatch = cells[0][1].match(/color:\s*(#[0-9a-fA-F]{3,8})/);
          const itemColor = colorMatch ? colorMatch[1] : "";
          items.push(itemColor && itemColor !== ilMatch[2] ? [glyph, cellText, itemColor] : [glyph, cellText]);
        }
      }
      return {
        id,
        type: "icon-list",
        content: { items, align: ilMatch[1] },
        styles: {
          padding: el.getAttribute("padding") || "10px",
          iconColor: ilMatch[2],
          iconSize: ilMatch[3],
          spacing: `${ilMatch[4]}px`,
          color: el.getAttribute("color") || "",
          fontSize: el.getAttribute("font-size") || "",
          fontWeight: el.getAttribute("font-weight") || "",
          fontFamily: el.getAttribute("font-family") || "",
        },
      };
    }

    // Colour bar — an mj-text whose css-class carries "colorbar:height:radius"
    // and whose body is a single-row table of coloured cells. Read each cell's
    // bgcolor back into the segment list.
    const cbMatch = ilCssClass.match(/^colorbar:([^:]+):(.+)$/);
    if (cbMatch) {
      const segments = [...text.matchAll(/bgcolor="(#[0-9a-fA-F]{3,8})"/g)].map((m) => m[1]);
      return {
        id,
        type: "color-bar",
        content: { segments },
        styles: {
          height: cbMatch[1],
          borderRadius: cbMatch[2],
          padding: el.getAttribute("padding") || "0",
        },
      };
    }

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
        height: el.getAttribute("height") || "",
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
        innerPadding: el.getAttribute("inner-padding") || "",
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
    // Walk the parsed XML rather than regex-matching innerHTML: cells in pasted
    // MJML routinely span multiple lines or wrap inline markup, which the old
    // single-line regex silently dropped. Only treat the first row as a header
    // when it actually uses <th>; otherwise every row is data (so we never lose
    // the first row of a header-less table — e.g. a bullet list built as a table).
    const trEls = Array.from(el.querySelectorAll("tr"));
    const headers: string[] = [];
    const rows: string[][] = [];
    const firstHasTh = trEls.length > 0 && trEls[0].querySelector("th") !== null;

    trEls.forEach((tr, idx) => {
      if (idx === 0 && firstHasTh) {
        for (const th of Array.from(tr.querySelectorAll("th"))) {
          headers.push((th.textContent || "").trim());
        }
        return;
      }
      const cells = Array.from(tr.querySelectorAll("td")).map((td) => (td.textContent || "").trim());
      if (cells.length) rows.push(cells);
    });

    // Auto-detect a "bullet list built as a 2-column table": no <th>, every row
    // has exactly two cells, and the first cell of every row is just a coloured
    // marker (no real text). Import it as the builder's native icon-list so it
    // renders as bullets instead of a table showing a literal "&nbsp;".
    const isMarkerCell = (td: Element | null) =>
      !!td && (td.textContent || "").replace(/ |&nbsp;|\s/g, "") === "";
    const looksLikeBulletList =
      !firstHasTh &&
      !el.getAttribute("css-class") &&
      trEls.length > 0 &&
      trEls.every((tr) => {
        const tds = tr.querySelectorAll("td");
        return tds.length === 2 && isMarkerCell(tds[0]) && !isMarkerCell(tds[1]);
      });

    if (looksLikeBulletList) {
      const items: string[][] = trEls.map((tr) => {
        const tds = tr.querySelectorAll("td");
        const rowColor = extractMarkerColor(tds[0]);
        const text = (tds[1].textContent || "").trim();
        return rowColor ? ["●", text, rowColor] : ["●", text];
      });
      const markerColor = extractMarkerColor(trEls[0].querySelectorAll("td")[0]) || "#16a34a";
      return {
        id,
        type: "icon-list",
        content: { items, align: "left" },
        styles: {
          padding: el.getAttribute("padding") || "10px",
          spacing: "12px",
          iconColor: markerColor,
          iconSize: "14px",
          color: el.getAttribute("color") || "",
          fontSize: el.getAttribute("font-size") || "",
          fontWeight: "",
          fontFamily: "",
        },
      };
    }

    const tbClass = el.getAttribute("css-class") || "";
    // Newest: tb:border:headerBg:headerColor:striped(0|1):stripeColor:borderWidth:padKey
    // Older:  tb:border:headerBg:headerColor:striped:stripeColor  (5 colour fields)
    // Oldest: tb:border:headerBg                                  (back-compat)
    const tbMatch = tbClass.match(
      /^tb:(#[0-9a-fA-F]{6}):(#[0-9a-fA-F]{6})(?::(#[0-9a-fA-F]{6}):([01]):(#[0-9a-fA-F]{6})(?::(\d+px):(compact|normal|large))?)?$/
    );
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
      if (tbMatch[6]) tableStyles.tableBorderWidth = tbMatch[6];
      if (tbMatch[7]) tableStyles.cellPadding = tbMatch[7];
    }

    // Per-column text alignment survives via each cell's inline `text-align`.
    // Read it off the first row (header if present, else the first data row).
    const alignRow = trEls[0];
    const aligns: string[] = [];
    if (alignRow) {
      for (const cell of Array.from(alignRow.querySelectorAll("th,td"))) {
        const m = (cell.getAttribute("style") || "").match(/text-align:\s*(left|center|right)/);
        aligns.push(m ? m[1] : "left");
      }
    }

    return {
      id,
      type: "table",
      content: aligns.some((a) => a !== "left") ? { headers, rows, aligns } : { headers, rows },
      styles: tableStyles,
    };
  }

  return null;
}

export function parseMjmlToTemplate(
  mjml: string,
  currentGlobalStyles: GlobalStyles,
): { rows: Row[]; globalStyles: GlobalStyles } | null {
  const head = extractHead(mjml);
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

  const globalStyles = applyAttrDefaults({ ...currentGlobalStyles }, head.attrDefaults);
  globalStyles.customHead = head.customHead;
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

      // Preserve column-level styling (card backgrounds, borders, rounding)
      // that the old parser discarded — this is what made imported "pricing
      // card" columns collapse to plain text.
      const colStyles: Record<string, string> = {};
      const colBg = mjCol.getAttribute("background-color");
      const colBorder = mjCol.getAttribute("border");
      const colRadius = mjCol.getAttribute("border-radius");
      const colPadding = mjCol.getAttribute("padding");
      const colVAlign = mjCol.getAttribute("vertical-align");
      if (colBg) colStyles.backgroundColor = colBg;
      if (colBorder) colStyles.border = colBorder;
      if (colRadius) colStyles.borderRadius = colRadius;
      if (colPadding) colStyles.padding = colPadding;
      if (colVAlign) colStyles.verticalAlign = colVAlign;

      columns.push({
        id: uuid(),
        width: mjCol.getAttribute("width") || `${(100 / colCount).toFixed(2)}%`,
        ...(Object.keys(colStyles).length ? { styles: colStyles } : {}),
        blocks,
      });
    });

    let layout = "100";
    if (colCount === 2) layout = "50-50";
    else if (colCount === 3) layout = "33-33-33";
    else if (colCount === 4) layout = "25-25-25-25";

    const rowStyles: Record<string, string> = {
      backgroundColor:
        section.getAttribute("background-color") || "transparent",
      padding: section.getAttribute("padding") || "10px 0",
    };
    const sectionRadius = section.getAttribute("border-radius");
    if (sectionRadius) rowStyles.borderRadius = sectionRadius;
    const sectionBgUrl = section.getAttribute("background-url");
    if (sectionBgUrl) rowStyles.backgroundUrl = sectionBgUrl;

    rows.push({
      id: uuid(),
      layout: layout as Row["layout"],
      columns,
      styles: rowStyles,
    });
  });

  return { rows, globalStyles };
}
