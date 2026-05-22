// Stamp variable values onto a copy of the user-uploaded PDF.
//
// We use `pdf-lib` (browser-side) so download = one fetch + one bytes write,
// no server round-trip. Helvetica is bundled in every PDF reader and ships
// inside pdf-lib's standard fonts, so we don't have to embed custom faces.

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { PdfTemplate, PdfPlacement } from './pdf-template';

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
    const value = opts.values[placement.variableName] ?? '';
    if (!value) continue;

    const font = pickFont(placement, { helvetica, helveticaBold, helveticaOblique, helveticaBoldOblique });
    // pdf-lib uses bottom-left origin; placement.y is top-down in editor space.
    const boxWidth = placement.width * pageW;
    const textWidth = font.widthOfTextAtSize(value, placement.fontSize);
    const xLeft = placement.x * pageW;
    const xOffset =
      placement.align === 'center' ? (boxWidth - textWidth) / 2 :
      placement.align === 'right'  ? (boxWidth - textWidth) :
      0;
    const xFinal = xLeft + xOffset;
    // Drop the baseline by ~fontSize so the rendered text sits visually at the
    // top-left of the chip the user placed (matches WYSIWYG expectations).
    const yFinal = pageH - (placement.y * pageH) - placement.fontSize;

    page.drawText(value, {
      x: xFinal,
      y: yFinal,
      size: placement.fontSize,
      font,
      color: rgb(0.1, 0.1, 0.1),
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

function pickFont(p: PdfPlacement, fonts: Fonts) {
  if (p.bold && p.italic) return fonts.helveticaBoldOblique;
  if (p.bold)             return fonts.helveticaBold;
  if (p.italic)           return fonts.helveticaOblique;
  return fonts.helvetica;
}
