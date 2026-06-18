/**
 * Curated set of email-safe icon glyphs for the "Liste à icônes" block.
 *
 * These are Unicode dingbats/symbols (NOT images or inline SVG): they render in
 * every email client, inherit text color + font-size, and look identical in the
 * canvas and the exported email. Each item stores the glyph itself, so no
 * key→glyph lookup is needed at render or parse time.
 */
export const LIST_ICONS: { glyph: string; label: string }[] = [
  { glyph: '✓', label: 'Coche' },
  { glyph: '✔', label: 'Coche pleine' },
  { glyph: '✖', label: 'Croix' },
  { glyph: '★', label: 'Étoile' },
  { glyph: '☆', label: 'Étoile vide' },
  { glyph: '♥', label: 'Cœur' },
  { glyph: '→', label: 'Flèche' },
  { glyph: '➜', label: 'Flèche large' },
  { glyph: '▸', label: 'Chevron' },
  { glyph: '●', label: 'Point' },
  { glyph: '○', label: 'Cercle' },
  { glyph: '◆', label: 'Losange' },
  { glyph: '▪', label: 'Carré' },
  { glyph: '✚', label: 'Plus' },
  { glyph: '✦', label: 'Étincelle' },
  { glyph: '✿', label: 'Fleur' },
  { glyph: '⚑', label: 'Drapeau' },
  { glyph: '•', label: 'Puce' },
];

export const DEFAULT_LIST_ICON = '✓';
