import type { BlockData } from '@/lib/editor-types';

/**
 * Design systems — the visual "looks" the builder can render in.
 *
 * Before this, every AI email used ONE type scale + spacing + treatment, so
 * they all looked the same ("basic"). A design system parametrises the things
 * that make a layout feel art-directed: type scale, default alignment, button
 * shape, spacing rhythm, card treatment, accent prominence. The planner picks a
 * system per email (by subject/mood); the builder renders every block through
 * it. That's where design VARIETY comes from.
 *
 * `default` reproduces the legacy constants exactly, so edit mode / Phase-1
 * paths that never set a system behave identically to before.
 */

type Styles = BlockData['styles'];

export type DesignSystemName =
  | 'default'
  | 'editorial'
  | 'bold'
  | 'minimal'
  | 'luxe'
  | 'corporate';

export interface DesignSystem {
  name: DesignSystemName;
  heading: Record<'h1' | 'h2' | 'h3', Styles>;
  text: Record<'lede' | 'body' | 'caption', Styles>;
  eyebrow: { fontSize: string; fontWeight: string; letterSpacing: string; uppercase: boolean };
  /** Default text alignment for headings/text/eyebrows/buttons. */
  align: 'left' | 'center';
  buttonRadius: string;
  buttonPill: boolean;
  /** Full-width / multi-column section vertical padding. */
  sectionPaddingFull: string;
  sectionPaddingMulti: string;
  heroPadding: string;
  cardRadius: string;
  /** Card border width in px ('0' = borderless, fill-only card). */
  cardBorderWidth: string;
  /** How much ink to mix into the body for a card fill (0–1). */
  cardFillMix: number;
  dividerThickness: string;
  /** Hints the planner/executor lean on for variety. */
  likesColorBar: boolean;
  likesCards: boolean;
}

// Legacy constants (kept byte-for-byte as the `default`/`editorial` baseline).
const EDITORIAL: DesignSystem = {
  name: 'editorial',
  heading: {
    h1: { fontSize: '32px', fontWeight: '800', letterSpacing: '-0.5px', lineHeight: '1.15' },
    h2: { fontSize: '23px', fontWeight: '700', letterSpacing: '0px', lineHeight: '1.3' },
    h3: { fontSize: '18px', fontWeight: '700', letterSpacing: '0px', lineHeight: '1.4' },
  },
  text: {
    lede: { fontSize: '17px', lineHeight: '1.7' },
    body: { fontSize: '15px', lineHeight: '1.7' },
    caption: { fontSize: '13px', lineHeight: '1.6' },
  },
  eyebrow: { fontSize: '11px', fontWeight: '700', letterSpacing: '3px', uppercase: true },
  align: 'left',
  buttonRadius: '8px',
  buttonPill: false,
  sectionPaddingFull: '28px 0',
  sectionPaddingMulti: '24px 0',
  heroPadding: '72px 40px',
  cardRadius: '18px',
  cardBorderWidth: '1px',
  cardFillMix: 0.08,
  dividerThickness: '1px',
  likesColorBar: true,
  likesCards: true,
};

const DEFAULT: DesignSystem = { ...EDITORIAL, name: 'default' };

// Big, centered, punchy — promos, sales, launches.
const BOLD: DesignSystem = {
  name: 'bold',
  heading: {
    h1: { fontSize: '42px', fontWeight: '900', letterSpacing: '-1px', lineHeight: '1.05' },
    h2: { fontSize: '28px', fontWeight: '800', letterSpacing: '-0.3px', lineHeight: '1.2' },
    h3: { fontSize: '19px', fontWeight: '700', letterSpacing: '0px', lineHeight: '1.35' },
  },
  text: {
    lede: { fontSize: '18px', fontWeight: '500', lineHeight: '1.6' },
    body: { fontSize: '15px', lineHeight: '1.65' },
    caption: { fontSize: '13px', lineHeight: '1.6' },
  },
  eyebrow: { fontSize: '12px', fontWeight: '800', letterSpacing: '2px', uppercase: true },
  align: 'center',
  buttonRadius: '999px',
  buttonPill: true,
  sectionPaddingFull: '32px 0',
  sectionPaddingMulti: '20px 0',
  heroPadding: '84px 40px',
  cardRadius: '16px',
  cardBorderWidth: '2px',
  cardFillMix: 0.1,
  dividerThickness: '2px',
  likesColorBar: true,
  likesCards: true,
};

// Airy, light-weight, restrained — premium minimalism (Apple-ish).
const MINIMAL: DesignSystem = {
  name: 'minimal',
  heading: {
    h1: { fontSize: '34px', fontWeight: '600', letterSpacing: '-0.5px', lineHeight: '1.2' },
    h2: { fontSize: '22px', fontWeight: '600', letterSpacing: '-0.2px', lineHeight: '1.3' },
    h3: { fontSize: '17px', fontWeight: '600', letterSpacing: '0px', lineHeight: '1.4' },
  },
  text: {
    lede: { fontSize: '18px', fontWeight: '300', lineHeight: '1.75' },
    body: { fontSize: '15px', fontWeight: '400', lineHeight: '1.8' },
    caption: { fontSize: '12px', lineHeight: '1.6' },
  },
  eyebrow: { fontSize: '11px', fontWeight: '600', letterSpacing: '2px', uppercase: true },
  align: 'left',
  buttonRadius: '6px',
  buttonPill: false,
  sectionPaddingFull: '40px 0',
  sectionPaddingMulti: '28px 0',
  heroPadding: '88px 44px',
  cardRadius: '12px',
  cardBorderWidth: '0',
  cardFillMix: 0.05,
  dividerThickness: '1px',
  likesColorBar: false,
  likesCards: false,
};

// Elegant, centered, serif-leaning — luxury, beauty, events.
const LUXE: DesignSystem = {
  name: 'luxe',
  heading: {
    h1: { fontSize: '36px', fontWeight: '500', letterSpacing: '0.5px', lineHeight: '1.2', fontFamily: 'Georgia, "Times New Roman", serif' },
    h2: { fontSize: '25px', fontWeight: '500', letterSpacing: '0.3px', lineHeight: '1.3', fontFamily: 'Georgia, "Times New Roman", serif' },
    h3: { fontSize: '18px', fontWeight: '600', letterSpacing: '0.2px', lineHeight: '1.4' },
  },
  text: {
    lede: { fontSize: '17px', fontWeight: '400', lineHeight: '1.8' },
    body: { fontSize: '15px', lineHeight: '1.8' },
    caption: { fontSize: '12px', letterSpacing: '0.3px', lineHeight: '1.7' },
  },
  eyebrow: { fontSize: '11px', fontWeight: '600', letterSpacing: '4px', uppercase: true },
  align: 'center',
  buttonRadius: '2px',
  buttonPill: false,
  sectionPaddingFull: '40px 0',
  sectionPaddingMulti: '28px 0',
  heroPadding: '92px 44px',
  cardRadius: '4px',
  cardBorderWidth: '1px',
  cardFillMix: 0.06,
  dividerThickness: '1px',
  likesColorBar: false,
  likesCards: true,
};

// Structured, trustworthy, left-aligned — finance, B2B, SaaS.
const CORPORATE: DesignSystem = {
  name: 'corporate',
  heading: {
    h1: { fontSize: '30px', fontWeight: '700', letterSpacing: '-0.3px', lineHeight: '1.2' },
    h2: { fontSize: '22px', fontWeight: '700', letterSpacing: '0px', lineHeight: '1.3' },
    h3: { fontSize: '17px', fontWeight: '600', letterSpacing: '0px', lineHeight: '1.4' },
  },
  text: {
    lede: { fontSize: '17px', lineHeight: '1.65' },
    body: { fontSize: '15px', lineHeight: '1.7' },
    caption: { fontSize: '13px', lineHeight: '1.6' },
  },
  eyebrow: { fontSize: '11px', fontWeight: '700', letterSpacing: '1.5px', uppercase: true },
  align: 'left',
  buttonRadius: '6px',
  buttonPill: false,
  sectionPaddingFull: '30px 0',
  sectionPaddingMulti: '24px 0',
  heroPadding: '64px 40px',
  cardRadius: '10px',
  cardBorderWidth: '1px',
  cardFillMix: 0.06,
  dividerThickness: '1px',
  likesColorBar: true,
  likesCards: true,
};

const SYSTEMS: Record<DesignSystemName, DesignSystem> = {
  default: DEFAULT,
  editorial: EDITORIAL,
  bold: BOLD,
  minimal: MINIMAL,
  luxe: LUXE,
  corporate: CORPORATE,
};

export function getDesignSystem(name?: string): DesignSystem {
  return (name && SYSTEMS[name as DesignSystemName]) || DEFAULT;
}

export const DESIGN_SYSTEM_NAMES = Object.keys(SYSTEMS).filter((n) => n !== 'default') as DesignSystemName[];
