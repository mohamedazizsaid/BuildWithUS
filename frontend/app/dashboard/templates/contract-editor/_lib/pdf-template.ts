// PDF-template mode for the contract editor.
//
// Two contract kinds share the same templates table column:
//   - TipTap JSON  (current "build from scratch" mode)
//   - PdfTemplate  (this file — "upload a PDF + drop variables on it")
//
// Coordinates are stored as fractions of each page's natural size so the
// placement is resolution-independent. At render time we multiply by the
// rendered page width/height; at export time we multiply by the PDF's true
// page size (in points) and pass to pdf-lib. This avoids drift when the user
// zooms or when we render at a different DPR than they edited at.

export interface PdfPlacement {
  /** Stable id so React can key chips through reorders without remounts. */
  id: string;
  /** 1-based page number this chip sits on. */
  page: number;
  /** Top-left x as a 0–1 fraction of the page width. */
  x: number;
  /** Top-left y as a 0–1 fraction of the page height. */
  y: number;
  /** Chip width as a 0–1 fraction of the page width (height auto from line-height). */
  width: number;
  /** Stamped text height in points (≈ pixels). */
  fontSize: number;
  /** Variable name without braces, e.g. "client_nom". */
  variableName: string;
  /** Optional display label override; defaults to the palette label. */
  label?: string;
  align?: 'left' | 'center' | 'right';
  bold?: boolean;
  italic?: boolean;
}

export interface PdfTemplate {
  kind: 'pdf-template';
  /** Public URL of the uploaded PDF in MinIO. */
  pdfUrl: string;
  /** Original filename — purely cosmetic, helps users recognize the template. */
  pdfFileName?: string;
  placements: PdfPlacement[];
}

export function isPdfTemplate(parsed: unknown): parsed is PdfTemplate {
  return !!parsed
    && typeof parsed === 'object'
    && (parsed as { kind?: unknown }).kind === 'pdf-template';
}

export function emptyPdfTemplate(pdfUrl: string, pdfFileName?: string): PdfTemplate {
  return { kind: 'pdf-template', pdfUrl, pdfFileName, placements: [] };
}

/** Safe parser — accepts the raw `content` string saved in the templates DB
 *  and returns a PdfTemplate if it parses as one, else null. Callers fall
 *  back to TipTap parsing on null. */
export function tryParsePdfTemplate(content: string | null | undefined): PdfTemplate | null {
  if (!content) return null;
  try {
    const parsed = JSON.parse(content);
    return isPdfTemplate(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function serializePdfTemplate(t: PdfTemplate): string {
  return JSON.stringify(t);
}
