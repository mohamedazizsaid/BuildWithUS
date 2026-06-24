/**
 * Color + palette engine for the AI email generator.
 *
 * The whole point of the tool-based approach is that DESIGN QUALITY lives in
 * code, not in the model's head. The model picks an accent color and a mood;
 * this module derives a coherent, readable palette from it, and every section
 * "tone" resolves to a background + readable text colors. That kills the
 * white-text-on-white-background class of bugs at the source.
 *
 * No dependencies — small hex utilities only (runs server-side in the route).
 */

export interface Palette {
  page: string; // outer page background (canvas behind the email body)
  body: string; // email body surface (mj-body background)
  ink: string; // primary text on body/surface
  muted: string; // secondary text on body/surface
  accent: string; // buttons, eyebrows, links
  accentInk: string; // readable text on the accent color
  dark: string; // dark section background (hero band / footer)
  darkInk: string; // primary text on dark
  darkMuted: string; // secondary text on dark
  border: string; // dividers / hairlines
  font: string;
  radius: string; // button / border radius
}

const clampByte = (n: number) => Math.max(0, Math.min(255, Math.round(n)));

export function parseHex(hex?: string): [number, number, number] | null {
  if (!hex) return null;
  let h = hex.trim().replace(/^#/, '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length !== 6 || /[^0-9a-fA-F]/.test(h)) return null;
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

const toHex = (rgb: [number, number, number]) =>
  '#' + rgb.map((c) => clampByte(c).toString(16).padStart(2, '0')).join('');

/** Linear blend of two colors; `t` = how much of `b` (0 → all a, 1 → all b). */
export function mix(a: string, b: string, t: number): string {
  const ra = parseHex(a);
  const rb = parseHex(b);
  if (!ra || !rb) return a;
  return toHex([
    ra[0] + (rb[0] - ra[0]) * t,
    ra[1] + (rb[1] - ra[1]) * t,
    ra[2] + (rb[2] - ra[2]) * t,
  ]);
}

/** WCAG relative luminance (0 = black, 1 = white). */
export function luminance(hex: string): number {
  const rgb = parseHex(hex);
  if (!rgb) return 1;
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two colors (1 → identical, 21 → black/white). */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

const NEAR_BLACK = '#1c1917';
const NEAR_WHITE = '#fdfcfa';

/** Pick whichever ink color reads best on the given background. */
export function readableInk(bg: string, dark = NEAR_BLACK, light = NEAR_WHITE): string {
  return contrastRatio(bg, light) >= contrastRatio(bg, dark) ? light : dark;
}

const DEFAULT_ACCENT = '#1c1917';
const DEFAULT_FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

/**
 * Build a coherent palette from a few high-level choices. Everything the model
 * doesn't specify is derived so the colors always harmonise and stay readable.
 */
export function derivePalette(opts: {
  accent?: string;
  body?: string;
  ink?: string;
  font?: string;
  mood?: 'light' | 'dark';
  radius?: string;
} = {}): Palette {
  const mood = opts.mood === 'dark' ? 'dark' : 'light';
  const accent = parseHex(opts.accent) ? (opts.accent as string) : DEFAULT_ACCENT;
  const body = parseHex(opts.body)
    ? (opts.body as string)
    : mood === 'dark'
      ? '#17181c'
      : '#ffffff';
  const ink = parseHex(opts.ink) ? (opts.ink as string) : readableInk(body);
  const muted = mix(ink, body, 0.42);
  const border = mix(ink, body, 0.86);
  const page = mix(body, mood === 'dark' ? '#000000' : '#000000', mood === 'dark' ? 0.35 : 0.05);
  const dark = mood === 'dark' ? mix(body, '#000000', 0.3) : NEAR_BLACK;
  const darkInk = readableInk(dark);
  const darkMuted = mix(darkInk, dark, 0.42);
  const accentInk = readableInk(accent);

  return {
    page,
    body,
    ink,
    muted,
    accent,
    accentInk,
    dark,
    darkInk,
    darkMuted,
    border,
    font: opts.font || DEFAULT_FONT,
    radius: opts.radius || '6px',
  };
}

export type Tone = 'default' | 'surface' | 'dark' | 'accent';

export interface ToneStyle {
  /** Section background ('transparent' shows the body surface beneath). */
  bg: string;
  /** Readable primary text color for this tone. */
  ink: string;
  /** Readable secondary text color for this tone. */
  muted: string;
}

/** Resolve a section tone to a background + the text colors readable on it. */
export function toneStyle(tone: Tone, p: Palette): ToneStyle {
  switch (tone) {
    case 'dark':
      return { bg: p.dark, ink: p.darkInk, muted: p.darkMuted };
    case 'accent':
      return { bg: p.accent, ink: p.accentInk, muted: mix(p.accentInk, p.accent, 0.32) };
    case 'surface':
      return { bg: mix(p.body, p.ink, 0.05), ink: p.ink, muted: p.muted };
    default:
      return { bg: 'transparent', ink: p.ink, muted: p.muted };
  }
}
