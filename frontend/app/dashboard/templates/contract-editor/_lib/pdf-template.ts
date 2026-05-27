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

/**
 * CSS-pixel width every page is rendered at in the editor canvas. Font sizes
 * and box heights are authored relative to this width, so export scales them by
 * (real PDF page width in points / this) to keep the download WYSIWYG.
 */
export const EDITOR_PAGE_WIDTH = 760;

export interface PdfPlacement {
  /** Stable id so React can key chips through reorders without remounts. */
  id: string;
  /**
   * What the placement stamps at export time:
   *   - 'variable' (default): the resolved value of `variableName`.
   *   - 'text': the literal `text` field — used to mask & redraw over the
   *      original PDF content ("cover & replace").
   *   - 'shape': a vector rectangle / ellipse / line (no text).
   * Older saved templates predate this field; absence means 'variable'.
   * Stacking (z-order) follows array order: later placements paint on top,
   * in both the editor and the export.
   */
  type?: 'variable' | 'text' | 'shape';
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
  /** Variable name without braces, e.g. "client_nom". Empty for 'text' type. */
  variableName: string;
  /** Literal content for 'text' placements. */
  text?: string;
  /** Optional display label override; defaults to the palette label. */
  label?: string;
  align?: 'left' | 'center' | 'right';
  bold?: boolean;
  italic?: boolean;
  /** Draw a filled rectangle under the text to hide the original PDF content. */
  whiteout?: boolean;
  /** Fill color for the white-out rectangle (hex). Defaults to white. */
  whiteoutColor?: string;

  // ---- Shape fields (type === 'shape') ----
  /** Which primitive to draw. */
  shape?: 'rect' | 'ellipse' | 'line';
  /** Shape height as a 0–1 fraction of the page height. */
  height?: number;
  /** Fill color (hex). Ignored when `noFill` is set or for lines. */
  fillColor?: string;
  /** Outline-only shape (no fill). */
  noFill?: boolean;
  /** Border / line color (hex). */
  strokeColor?: string;
  /** Border / line thickness in editor px (scaled to points on export). */
  strokeWidth?: number;
}

/** True when a placement stamps literal text rather than a variable value. */
export function isTextPlacement(p: PdfPlacement): boolean {
  return p.type === 'text';
}

/** True when a placement draws a vector shape rather than text. */
export function isShapePlacement(p: PdfPlacement): boolean {
  return p.type === 'shape';
}

/** Collision-resistant id for a new placement on the given page. */
export function makePlacementId(page: number): string {
  return `p${page}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

/** A fresh static-text placement near the top-left of the given page. */
export function makeTextPlacement(page: number): PdfPlacement {
  return {
    id: makePlacementId(page),
    type: 'text',
    page,
    x: 0.1,
    y: 0.1,
    width: 0.3,
    fontSize: 11,
    variableName: '',
    text: 'Nouveau texte',
    align: 'left',
    whiteout: true,
    whiteoutColor: '#ffffff',
  };
}

/** A fresh shape placement near the top-left of the given page. */
export function makeShapePlacement(page: number, shape: 'rect' | 'ellipse' | 'line'): PdfPlacement {
  return {
    id: makePlacementId(page),
    type: 'shape',
    shape,
    page,
    x: 0.1,
    y: 0.1,
    width: 0.2,
    height: shape === 'line' ? 0.03 : 0.08,
    fontSize: 11,
    variableName: '',
    fillColor: '#ffffff',
    noFill: shape === 'line',
    strokeColor: '#000000',
    strokeWidth: shape === 'line' ? 2 : 0,
  };
}

/** Reorder a placement within the array (z-order). Returns a new array. */
export function reorderPlacement(
  placements: PdfPlacement[],
  id: string,
  dir: 'front' | 'back' | 'forward' | 'backward',
): PdfPlacement[] {
  const i = placements.findIndex((p) => p.id === id);
  if (i < 0) return placements;
  const arr = placements.slice();
  const [item] = arr.splice(i, 1);
  switch (dir) {
    case 'front':    arr.push(item); break;
    case 'back':     arr.unshift(item); break;
    case 'forward':  arr.splice(Math.min(arr.length, i + 1), 0, item); break;
    case 'backward': arr.splice(Math.max(0, i - 1), 0, item); break;
  }
  return arr;
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
