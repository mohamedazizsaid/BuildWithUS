// Stamp variable values onto a copy of the user-uploaded PDF.
//
// We use `pdf-lib` (browser-side) so download = one fetch + one bytes write,
// no server round-trip. Helvetica is bundled in every PDF reader and ships
// inside pdf-lib's standard fonts, so we don't have to embed custom faces.

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { PdfTemplate } from './pdf-template';
import { isTextPlacement, isShapePlacement, EDITOR_PAGE_WIDTH, PDF_LINE_HEIGHT, PDF_FIRST_BASELINE } from './pdf-template';

interface ExportOptions {
  /** Final filename suggested to the user in the download dialog. */
  filename?: string;
  /** Variable name → resolved value. Missing keys leave the slot blank. */
  values: Record<string, string>;
}

export async function exportPdfTemplateWithValues(
  template: PdfTemplate,
  opts: ExportOptions,
): Promise<Blob> {
  const sourceBytes = await fetch(template.pdfUrl).then((r) => {
    if (!r.ok) throw new Error(`PDF fetch failed (${r.status})`);
    return r.arrayBuffer();
  });

  const pdf = await PDFDocument.load(sourceBytes);
  const helvetica       = await pdf.embedFont(StandardFonts.Helvetica);
  const helveticaBold   = await pdf.embedFont(StandardFonts.HelveticaBold);
  const helveticaOblique     = await pdf.embedFont(StandardFonts.HelveticaOblique);
  const helveticaBoldOblique = await pdf.embedFont(StandardFonts.HelveticaBoldOblique);

  for (const placement of template.placements) {
    const page = pdf.getPage(placement.page - 1);
    if (!page) continue;

    const { width: pageW, height: pageH } = page.getSize();
    // Editor px → PDF points: everything is authored at a fixed page width.
    const pxToPt = pageW / EDITOR_PAGE_WIDTH;
    const sizePt = placement.fontSize * pxToPt;

    // Shapes draw their own primitive and skip the text path entirely.
    if (isShapePlacement(placement)) {
      const sx = placement.x * pageW;
      const sw = placement.width * pageW;
      const sh = (placement.height ?? 0) * pageH;
      const topDown = placement.y * pageH;
      const yBottom = pageH - topDown - sh;
      const strokePt = (placement.strokeWidth ?? 0) * pxToPt;
      const fill = placement.noFill ? undefined : hexToRgb(placement.fillColor);
      const stroke = strokePt > 0
        ? { borderColor: hexToRgb(placement.strokeColor), borderWidth: strokePt }
        : {};
      if (placement.shape === 'ellipse') {
        page.drawEllipse({ x: sx + sw / 2, y: yBottom + sh / 2, xScale: sw / 2, yScale: sh / 2, color: fill, ...stroke });
      } else if (placement.shape === 'line') {
        const yMid = pageH - topDown - sh / 2;
        page.drawLine({ start: { x: sx, y: yMid }, end: { x: sx + sw, y: yMid }, thickness: strokePt || 1, color: hexToRgb(placement.strokeColor) });
      } else {
        page.drawRectangle({ x: sx, y: yBottom, width: sw, height: sh, color: fill, ...stroke });
      }
      continue;
    }

    // 'text' placements stamp their literal content; 'variable' placements
    // resolve against the supplied values map.
    const value = isTextPlacement(placement)
      ? (placement.text ?? '')
      : (opts.values[placement.variableName] ?? '');

    // Split multi-line text zones into individual lines, stamped top-down.
    const lines = value.split('\n');
    const lineHeight = sizePt * PDF_LINE_HEIGHT;

    const boxWidth = placement.width * pageW;
    const xLeft = placement.x * pageW;
    // pdf-lib uses bottom-left origin; placement.y is top-down in editor space.
    // Each line is ~1.5× the font size tall, anchored at the chip's top.
    const boxHeight = lineHeight * Math.max(1, lines.length);
    const boxBottom = pageH - (placement.y * pageH) - boxHeight;

    // Mask the original content first so stamped text sits on top of the fill.
    if (placement.whiteout) {
      page.drawRectangle({
        x: xLeft,
        y: boxBottom,
        width: boxWidth,
        height: boxHeight,
        color: hexToRgb(placement.whiteoutColor),
      });
    }

    if (!value) continue;

    const font = pickFont(placement, { helvetica, helveticaBold, helveticaOblique, helveticaBoldOblique });
    // Drop the first baseline to the same spot the editor's line box puts it
    // (≈1.1×fontSize below the chip top — see PDF_FIRST_BASELINE), so the stamp
    // lines up with the editor preview the user aligned against. Subsequent
    // lines step down by one line-height.
    const yTop = pageH - (placement.y * pageH) - sizePt * PDF_FIRST_BASELINE;
    lines.forEach((line, i) => {
      if (!line) return;
      const textWidth = font.widthOfTextAtSize(line, sizePt);
      const xFinal = xLeft + alignOffset(placement.align, boxWidth, textWidth);
      page.drawText(line, {
        x: xFinal,
        y: yTop - i * lineHeight,
        size: sizePt,
        font,
        color: rgb(0.1, 0.1, 0.1),
      });
    });
  }

  const bytes = await pdf.save();
  // Wrap bytes as a real Uint8Array slice so Blob's TS overload accepts it
  // across browsers (Safari/iOS rejects raw shared ArrayBuffers).
  const buf = new Uint8Array(bytes);
  return new Blob([buf], { type: 'application/pdf' });
}

type Fonts = {
  helvetica: import('pdf-lib').PDFFont;
  helveticaBold: import('pdf-lib').PDFFont;
  helveticaOblique: import('pdf-lib').PDFFont;
  helveticaBoldOblique: import('pdf-lib').PDFFont;
};

function pickFont(p: { bold?: boolean; italic?: boolean }, fonts: Fonts) {
  if (p.bold && p.italic) return fonts.helveticaBoldOblique;
  if (p.bold)             return fonts.helveticaBold;
  if (p.italic)           return fonts.helveticaOblique;
  return fonts.helvetica;
}

function alignOffset(align: 'left' | 'center' | 'right' | undefined, boxWidth: number, textWidth: number): number {
  if (align === 'center') return (boxWidth - textWidth) / 2;
  if (align === 'right')  return  boxWidth - textWidth;
  return 0;
}

/** Parse a #rrggbb / #rgb hex string into a pdf-lib rgb color (default white). */
function hexToRgb(hex: string | undefined) {
  const fallback = rgb(1, 1, 1);
  if (!hex) return fallback;
  let h = hex.trim().replace(/^#/, '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length !== 6) return fallback;
  const n = Number.parseInt(h, 16);
  if (Number.isNaN(n)) return fallback;
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}
