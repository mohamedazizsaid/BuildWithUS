import { v4 as uuid } from 'uuid';
import {
  BlockData,
  BlockType,
  Row,
  Column,
  RowLayout,
  TemplateData,
  GlobalStyles,
  DEFAULT_BLOCK_CONTENT,
  DEFAULT_GLOBAL_STYLES,
  LAYOUT_OPTIONS,
} from '@/lib/editor-types';
import {
  Palette,
  Tone,
  ToneStyle,
  derivePalette,
  toneStyle,
  parseHex,
  contrastRatio,
  mix,
  luminance,
  readableInk,
} from './theme';

/**
 * Tone- and palette-aware email assembler. Block tools call the `addX` methods
 * below; the builder owns the design system, so every block comes out with a
 * readable color for its section's tone, an editorial type scale, and spacing
 * that matches the column width. The model never picks raw styles — it picks
 * content + an accent + a section tone, and the design quality lives here.
 *
 * Output is plain `BlockData` / `TemplateData` — the exact same shape the manual
 * editor produces — so the canvas, preview, and MJML export render it unchanged.
 */

type Styles = BlockData['styles'];

/** Editorial heading scale (size / weight / tracking / leading). */
const HEADING: Record<'h1' | 'h2' | 'h3', Styles> = {
  h1: { fontSize: '32px', fontWeight: '800', letterSpacing: '-0.5px', lineHeight: '1.15' },
  h2: { fontSize: '23px', fontWeight: '700', letterSpacing: '0px', lineHeight: '1.3' },
  h3: { fontSize: '18px', fontWeight: '700', letterSpacing: '0px', lineHeight: '1.4' },
};

/** Body-text roles. */
const TEXT_ROLE: Record<'lede' | 'body' | 'caption', Styles> = {
  lede: { fontSize: '17px', lineHeight: '1.7' },
  body: { fontSize: '15px', lineHeight: '1.7' },
  caption: { fontSize: '13px', lineHeight: '1.6' },
};

/** Drop undefined / empty values so we never clobber a computed default. */
function clean<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined && v !== '') out[k] = v;
  return out as Partial<T>;
}

/**
 * Strip model control-token leakage from copy the model writes into block
 * content (e.g. gemma emits a trailing "<|"|>" or "<|channel>"; sometimes a
 * stray </h5>). Leaves legitimate inline HTML (<strong>, <br>, <a>) untouched.
 */
function sanitizeText(s?: string): string {
  if (!s) return '';
  let out = s
    .replaceAll(/<\|[^|>]*\|?>/g, '')
    .replaceAll('<|', '')
    .replaceAll('|>', '')
    .replaceAll(/<\/?h[1-6][^>]*>/gi, '')
    // stray block-level closing tags the model sometimes appends (</div>, </p>…)
    .replaceAll(/<\/?(div|span|p|td|tr|table|section)[^>]*>/gi, '')
    .trim();
  // The model sometimes prefixes a stray "=" or wraps the whole string in
  // quotes (e.g. ="..." or "-40% ..."). Strip those without touching quotes
  // that appear mid-sentence.
  out = out.replace(/^[=\s]+/, '').trim();
  const wrapped = /^["«»“”]([\s\S]*)["«»“”]$/.exec(out);
  if (wrapped) out = wrapped[1].trim();
  // Strip a lone unmatched wrapping quote (the model often splits a quoted
  // sentence across two blocks, leaving "…  on one and  …" on the next).
  const quoteCount = (out.match(/["“”«»]/g) || []).length;
  if (quoteCount === 1) out = out.replace(/^["“”«»]\s*/, '').replace(/\s*["“”«»]$/, '');
  return out;
}

const escHtml = (s: string) =>
  s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

export class TemplateBuilder {
  private rows: Row[] = [];
  private curRow = -1;
  private curCol = 0;
  private tones: Tone[] = []; // tone per row, indexed by row position
  private palette: Palette = derivePalette();
  private globalStyles: GlobalStyles = { ...DEFAULT_GLOBAL_STYLES };
  private loaded = false; // edit mode: preserve the existing template's globals
  private readonly meta: { title?: string; preview?: string } = {};
  private inCard = false; // blocks currently land inside a bordered card column
  // When set (edit mode), the NEXT started section is inserted at this row index
  // instead of being appended — then the anchor clears. Lets the model place a
  // new section before/after an existing one in a single pass.
  private insertAnchor: number | null = null;

  // ── Theme ────────────────────────────────────────────────────────────────

  setTheme(opts: {
    accentColor?: string;
    backgroundColor?: string;
    textColor?: string;
    linkColor?: string;
    fontFamily?: string;
    mood?: 'light' | 'dark';
    title?: string;
    previewText?: string;
  }): void {
    // In edit mode, keep the email's existing brand accent / font unless the
    // user explicitly overrides them — so "passe en mode sombre" only flips the
    // mood and doesn't reset the brand color.
    this.palette = derivePalette({
      accent: opts.accentColor || opts.linkColor || (this.loaded ? this.globalStyles.btnBackgroundColor : undefined),
      body: opts.backgroundColor,
      ink: opts.textColor,
      font: opts.fontFamily || (this.loaded ? this.globalStyles.fontFamily : undefined),
      mood: opts.mood,
    });
    if (opts.title) this.meta.title = sanitizeText(opts.title);
    if (opts.previewText) this.meta.preview = sanitizeText(opts.previewText);
    // Edit mode: a theme change must re-style the EXISTING email (body, section
    // backgrounds, every text color) — not just future blocks. Without this,
    // "passe tout l'email en mode sombre" would silently do nothing.
    if (this.loaded) this.applyThemeToExisting();
  }

  /**
   * Re-theme the already-loaded template to the current palette: update globals,
   * snap section/card backgrounds that clash with the new mood, and recompute
   * every text color so it stays readable on its (possibly new) background.
   */
  private applyThemeToExisting(): void {
    const p = this.palette;
    const dark = luminance(p.body) < 0.5; // mood inferred from the resolved body
    this.globalStyles = {
      ...this.globalStyles,
      bodyColor: p.body,
      backgroundColor: p.page,
      textColor: p.ink,
      linkColor: p.accent,
      fontFamily: p.font,
      btnFontFamily: p.font,
      btnBackgroundColor: p.accent,
      btnFontColor: p.accentInk,
    };

    for (const row of this.rows) {
      let bg = row.styles.backgroundColor || 'transparent';
      // Going dark: a light band should reveal the dark body. Going light: a
      // dark band should reveal the light body. Keep brand-colored bands.
      if (bg !== 'transparent' && parseHex(bg)) {
        const isLightBand = luminance(bg) > 0.5;
        if ((dark && isLightBand) || (!dark && !isLightBand && contrastRatio(bg, p.accent) < 1.25)) {
          bg = 'transparent';
          row.styles.backgroundColor = 'transparent';
        }
      }
      const sectionEff = bg === 'transparent' ? p.body : bg;

      for (const col of row.columns) {
        // Card columns carry their own background — re-tone it to match the mood
        // (a light card on a dark email becomes a dark elevated card).
        if (col.styles?.backgroundColor && parseHex(col.styles.backgroundColor)) {
          const cardLight = luminance(col.styles.backgroundColor) > 0.5;
          if (dark && cardLight) col.styles.backgroundColor = mix(p.body, p.ink, 0.1);
          else if (!dark && !cardLight) col.styles.backgroundColor = mix(p.body, p.ink, 0.06);
        }
        const colEff =
          col.styles?.backgroundColor && parseHex(col.styles.backgroundColor)
            ? col.styles.backgroundColor
            : sectionEff;
        for (const b of col.blocks) this.retoneBlock(b, colEff);
      }
    }
  }

  /** Recompute a block's text color so it reads on `bg` — but keep an existing
   * color that's already readable (preserves brand/accent emphasis). */
  private retoneBlock(b: BlockData, bg: string): void {
    // A block with its own background (e.g. a color-bar cell) is read against
    // that, not the section.
    const eff =
      b.styles.backgroundColor && b.styles.backgroundColor !== 'transparent' && parseHex(b.styles.backgroundColor)
        ? b.styles.backgroundColor
        : bg;
    const ink = readableInk(eff);
    const keepIfReadable = (cur?: string) =>
      cur && parseHex(cur) && contrastRatio(cur, eff) >= 3 ? cur : ink;

    switch (b.type) {
      case 'heading':
      case 'text':
      case 'icon-list':
      case 'menu':
      case 'signature':
      case 'table':
        b.styles.color = keepIfReadable(b.styles.color || this.globalStyles.textColor);
        break;
      default:
        break; // images / buttons / dividers / video / social manage their own colors
    }
  }

  setMeta(opts: { title?: string; previewText?: string }): void {
    if (opts.title) this.meta.title = sanitizeText(opts.title);
    if (opts.previewText) this.meta.preview = sanitizeText(opts.previewText);
  }

  // ── Sections / columns ─────────────────────────────────────────────────────

  startSection(layout: RowLayout, opts: { tone?: Tone; backgroundColor?: string } = {}): void {
    const opt = LAYOUT_OPTIONS.find((o) => o.value === layout) ?? LAYOUT_OPTIONS[0];
    const tone: Tone = opts.tone ?? 'default';
    const ts = toneStyle(tone, this.palette);
    const bg = opts.backgroundColor && parseHex(opts.backgroundColor) ? opts.backgroundColor : ts.bg;
    const isFull = opt.value === '100';
    const row: Row = {
      id: uuid(),
      layout: opt.value,
      columns: opt.widths.map((w) => ({ id: uuid(), width: w, blocks: [] as BlockData[] })),
      // Generous vertical rhythm; tighter for plain default sections.
      styles: { backgroundColor: bg, padding: isFull ? '28px 0' : '24px 0' },
    };
    // Honor a pending insertion anchor (edit mode) so the new section lands at a
    // chosen position; otherwise append. Keep `tones` aligned with `rows`.
    if (this.insertAnchor !== null) {
      const at = Math.max(0, Math.min(this.insertAnchor, this.rows.length));
      this.rows.splice(at, 0, row);
      this.tones.splice(at, 0, tone);
      this.curRow = at;
      this.insertAnchor = null;
    } else {
      this.rows.push(row);
      this.curRow = this.rows.length - 1;
      this.tones[this.curRow] = tone;
    }
    this.curCol = 0;
    this.inCard = false;
  }

  /**
   * Edit mode: queue the NEXT started section (startSection/startCard/startHero/
   * addColorBar) to be inserted before/after an existing section instead of
   * appended. One-shot — clears as soon as a section is started.
   */
  setInsertAnchor(targetSectionId: string, position: 'before' | 'after'): boolean {
    const i = this.rows.findIndex((r) => r.id === targetSectionId);
    if (i < 0) return false;
    this.insertAnchor = position === 'before' ? i : i + 1;
    return true;
  }

  /**
   * Start a single-column bordered "card" section (e.g. a price box / offer
   * highlight). Blocks added next land inside the card with tight padding until
   * the next startSection/startCard. Mirrors BleuFix's price card.
   */
  startCard(opts: { borderColor?: string; backgroundColor?: string } = {}): void {
    this.startSection('100');
    const row = this.rows[this.curRow];
    row.styles.padding = '12px 40px'; // outer gutter so the card doesn't touch the edges
    const bg = opts.backgroundColor && parseHex(opts.backgroundColor)
      ? opts.backgroundColor
      : mix(this.palette.body, this.palette.ink, 0.08);
    // Border must be visible against the card background — reject a near-invisible
    // choice (e.g. white on a light card) and fall back to the accent / a hairline.
    let border = opts.borderColor && parseHex(opts.borderColor) ? opts.borderColor : this.palette.accent;
    if (contrastRatio(border, bg) < 1.18) {
      border = contrastRatio(this.palette.accent, bg) >= 1.18 ? this.palette.accent : mix(bg, this.palette.ink, 0.28);
    }
    row.columns[0].styles = {
      backgroundColor: bg,
      border: `1px solid ${border}`,
      borderRadius: '18px',
      padding: '24px',
    };
    this.inCard = true;
  }

  /**
   * A multi-color brand accent bar (BleuFix-style). Rendered as a SINGLE
   * full-width block whose content is an email-safe HTML table of equal colored
   * cells — so it supports any number of colors (2-8), unlike the old
   * column-based version that maxed out at 4. No canvas/parser change needed:
   * the text block's HTML renders identically in the editor canvas, the preview,
   * and the compiled MJML (mj-text passes the markup through, like icon-list).
   */
  addColorBar(colors: string[], height = '8px'): void {
    const valid = colors.filter((c) => parseHex(c)).slice(0, 8);
    if (valid.length < 2) return;
    const w = (100 / valid.length).toFixed(4);
    const cells = valid
      .map(
        (c) =>
          `<td bgcolor="${c}" style="background-color:${c};width:${w}%;height:${height};font-size:0;line-height:0;mso-line-height-rule:exactly">&nbsp;</td>`,
      )
      .join('');
    const tableHtml = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;table-layout:fixed;width:100%"><tbody><tr>${cells}</tr></tbody></table>`;
    this.startSection('100');
    this.rows[this.curRow].styles.padding = '0';
    this.push(this.make('text', { text: tableHtml }, { padding: '0', lineHeight: '0' }));
    this.inCard = false;
  }

  /**
   * Pure vertical breathing room — an empty fixed-height block. Reuses the
   * "spacer bar" convention (empty text + explicit height) that the canvas,
   * preview, and MJML export all already special-case, so no new block type is
   * needed. Lets the model control rhythm between elements.
   */
  addSpacer(height = '24px'): void {
    this.push(this.make('text', { text: '&nbsp;' }, { height, padding: '0', lineHeight: '0' }));
  }

  /**
   * A full-bleed hero section with a background photo and text laid OVER it
   * (instead of stacked above/below). The section carries a `backgroundUrl`
   * (resolved post-generation from `query`, like addImage) plus a dark scrim for
   * legibility; blocks added next (eyebrow / h1 / lede / button) render on top
   * with light, readable text. Closes the "text-over-image hero" gap.
   */
  startHero(opts: { query?: string; src?: string } = {}): void {
    this.startSection('100', { tone: 'dark' });
    const row = this.rows[this.curRow];
    row.styles.padding = '72px 40px';
    row.styles.backgroundColor = '#0b0b0e'; // base / fallback behind the photo
    if (opts.src && /^https?:/i.test(opts.src)) {
      row.styles.backgroundUrl = opts.src;
    } else if (opts.query) {
      // Stashed query; resolveStockImages swaps in a real photo, then drops this.
      row.styles.backgroundUrlQuery = sanitizeText(opts.query);
    }
    this.inCard = false;
  }

  nextColumn(): void {
    if (this.curRow < 0) return;
    const row = this.rows[this.curRow];
    this.curCol = Math.min(this.curCol + 1, row.columns.length - 1);
  }

  private ensureColumn(): Column {
    if (this.curRow < 0) this.startSection('100');
    const row = this.rows[this.curRow];
    if (this.curCol >= row.columns.length) this.curCol = row.columns.length - 1;
    return row.columns[this.curCol];
  }

  private push(block: BlockData): void {
    this.ensureColumn().blocks.push(block);
  }

  private currentTone(): Tone {
    return this.curRow >= 0 ? this.tones[this.curRow] ?? 'default' : 'default';
  }

  private toneCtx(): ToneStyle {
    return toneStyle(this.currentTone(), this.palette);
  }

  private isWide(): boolean {
    if (this.curRow < 0) return true;
    const row = this.rows[this.curRow];
    const col = row.columns[Math.min(this.curCol, row.columns.length - 1)];
    return (col?.width || '100%') === '100%';
  }

  /** Horizontal breathing room — none inside a card (the card has its own
   * padding), roomy in full-width, tight in multi-column. */
  private sidePad(): string {
    if (this.inCard) return '0';
    return this.isWide() ? '40px' : '14px';
  }

  /**
   * Resolve a text color: honor the model's choice only if it's actually
   * readable on this section's background; otherwise fall back to the tone's
   * ink/muted. This is the contrast guard that kills white-on-white output.
   */
  private resolveTextColor(explicit: string | undefined, fallback: string): string {
    const ctx = this.toneCtx();
    const bg = ctx.bg === 'transparent' ? this.palette.body : ctx.bg;
    if (explicit && parseHex(explicit)) {
      return contrastRatio(explicit, bg) >= 2.8 ? explicit : fallback;
    }
    return fallback;
  }

  private make(type: BlockType, content: BlockData['content'], styles: Styles): BlockData {
    const def = DEFAULT_BLOCK_CONTENT[type];
    return {
      id: uuid(),
      type,
      content: { ...def.content, ...content },
      styles: { ...def.styles, ...styles },
    };
  }

  // ── Blocks ──────────────────────────────────────────────────────────────

  addEyebrow(p: { text: string; align?: string }): void {
    const ctx = this.toneCtx();
    // On dark/accent tones the accent may not pop — fall back to muted ink.
    const accentReadable = contrastRatio(this.palette.accent, ctx.bg === 'transparent' ? this.palette.body : ctx.bg) >= 2.8;
    this.push(
      this.make('text', { text: sanitizeText(p.text).toUpperCase() }, {
        fontSize: '11px',
        fontWeight: '700',
        letterSpacing: '3px',
        lineHeight: '1.5',
        color: accentReadable ? this.palette.accent : ctx.muted,
        textAlign: p.align || 'left',
        padding: `4px ${this.sidePad()}`,
      }),
    );
  }

  addHeading(p: {
    text: string;
    level?: 'h1' | 'h2' | 'h3';
    color?: string;
    align?: string;
    fontWeight?: string;
  }): void {
    const ctx = this.toneCtx();
    const scale = HEADING[p.level || 'h2'];
    this.push(
      this.make('heading', { text: sanitizeText(p.text) }, {
        ...scale,
        ...clean({ fontWeight: p.fontWeight }),
        color: this.resolveTextColor(p.color, ctx.ink),
        textAlign: p.align || 'left',
        padding: `10px ${this.sidePad()}`,
      }),
    );
  }

  addText(p: {
    text: string;
    role?: 'lede' | 'body' | 'caption';
    color?: string;
    align?: string;
    fontSize?: string;
  }): void {
    const ctx = this.toneCtx();
    const role = p.role || 'body';
    const fallback = role === 'lede' || role === 'caption' ? ctx.muted : ctx.ink;
    this.push(
      this.make('text', { text: sanitizeText(p.text) }, {
        ...TEXT_ROLE[role],
        ...clean({ fontSize: p.fontSize }),
        color: this.resolveTextColor(p.color, fallback),
        textAlign: p.align || 'left',
        padding: `6px ${this.sidePad()}`,
      }),
    );
  }

  addButton(p: {
    text: string;
    url: string;
    backgroundColor?: string;
    color?: string;
    align?: string;
    borderRadius?: string;
    pill?: boolean;
  }): void {
    const bg = p.backgroundColor && parseHex(p.backgroundColor) ? p.backgroundColor : this.palette.accent;
    const radius = p.borderRadius || (p.pill ? '28px' : this.palette.radius);
    this.push(
      this.make('button', { text: sanitizeText(p.text), href: p.url }, {
        backgroundColor: bg,
        color: p.color && parseHex(p.color) ? p.color : this.palette.accentInk,
        textAlign: p.align || 'left',
        borderRadius: radius,
        fontFamily: this.palette.font,
        padding: `18px ${this.sidePad()}`,
      }),
    );
  }

  addImage(p: {
    src?: string;
    alt?: string;
    width?: string;
    align?: string;
    href?: string;
    borderRadius?: string;
  }): void {
    // Full-width heroes bleed flush with square corners; in-content / card /
    // column images get a small gutter and rounded corners (BleuFix style).
    const heroFlush = this.isWide() && !this.inCard;
    this.push(
      this.make(
        'image',
        clean({ src: p.src, alt: sanitizeText(p.alt) || 'Image', href: p.href }),
        clean({
          width: p.width || '100%',
          textAlign: p.align || 'center',
          borderRadius: p.borderRadius || (heroFlush ? '0' : '12px'),
          padding: this.inCard ? '0' : heroFlush ? '0' : '0 8px',
        }),
      ),
    );
  }

  addDivider(p: { color?: string; thickness?: string }): void {
    this.push(
      this.make('divider', {}, clean({
        borderColor: p.color && parseHex(p.color) ? p.color : this.palette.border,
        borderWidth: p.thickness,
        padding: `8px ${this.sidePad()}`,
      })),
    );
  }

  addTable(p: { headers: string[]; rows: string[][] }): void {
    this.push(this.make('table', {
      headers: p.headers.map(sanitizeText),
      rows: p.rows.map((r) => r.map(sanitizeText)),
    }, {
      color: this.toneCtx().ink,
      padding: `10px ${this.sidePad()}`,
    }));
  }

  addIconList(p: {
    items: { icon?: string; text: string; color?: string }[];
    align?: string;
    iconColor?: string;
  }): void {
    const ctx = this.toneCtx();
    const items: string[][] = p.items.map((it) =>
      it.color ? [it.icon || '✓', sanitizeText(it.text), it.color] : [it.icon || '✓', sanitizeText(it.text)],
    );
    this.push(
      this.make('icon-list', clean({ items, align: p.align }), {
        color: ctx.ink,
        iconColor: p.iconColor && parseHex(p.iconColor) ? p.iconColor : this.palette.accent,
        padding: `8px ${this.sidePad()}`,
      }),
    );
  }

  addSocial(p: { links: { platform: string; url: string }[]; align?: string }): void {
    const links: string[][] = p.links.map((l) => [l.platform, l.url]);
    this.push(this.make('social', clean({ links, align: p.align || 'center' }), {}));
  }

  addMenu(p: { items: { label: string; url: string }[]; layout?: string; align?: string }): void {
    const items: string[][] = p.items.map((i) => [sanitizeText(i.label), i.url]);
    this.push(
      this.make('menu', clean({ items, layout: p.layout, align: p.align }), {
        color: this.toneCtx().ink,
        padding: `8px ${this.sidePad()}`,
      }),
    );
  }

  addSignature(p: { name: string; title?: string }): void {
    this.push(this.make('signature', clean({ name: sanitizeText(p.name), title: sanitizeText(p.title) }), {
      color: this.toneCtx().ink,
      padding: `20px ${this.sidePad()}`,
    }));
  }

  addVideo(p: { url: string; width?: string; align?: string }): void {
    this.push(
      this.make('video', { src: p.url, type: 'upload' }, clean({
        width: p.width || '100%',
        textAlign: p.align || 'center',
        padding: this.isWide() ? '0' : '0 8px',
      })),
    );
  }

  // ── Edit mode ──────────────────────────────────────────────────────────────

  /**
   * Pre-load an existing template so edits only apply the requested delta. The
   * palette is recovered from the template's globals so any NEW blocks match the
   * existing look. Existing globals are preserved verbatim on build().
   */
  loadTemplate(t: TemplateData): void {
    this.rows = t.rows.map((r) => ({
      ...r,
      columns: r.columns.map((c) => ({ ...c, blocks: c.blocks.map((b) => ({ ...b })) })),
    }));
    this.tones = this.rows.map(() => 'default');
    this.globalStyles = { ...DEFAULT_GLOBAL_STYLES, ...t.globalStyles };
    this.palette = derivePalette({
      accent: t.globalStyles.btnBackgroundColor,
      body: t.globalStyles.bodyColor,
      ink: t.globalStyles.textColor,
      font: t.globalStyles.fontFamily,
    });
    this.loaded = true;
    this.inCard = false;
    this.curRow = this.rows.length - 1;
    this.curCol = this.curRow >= 0 ? this.rows[this.curRow].columns.length - 1 : 0;
  }

  findBlock(id: string): BlockData | null {
    for (const r of this.rows) for (const c of r.columns) for (const b of c.blocks) if (b.id === id) return b;
    return null;
  }

  updateBlock(id: string, patch: { content?: Record<string, string>; styles?: Record<string, string> }): boolean {
    const b = this.findBlock(id);
    if (!b) return false;
    if (patch.content) b.content = { ...b.content, ...patch.content };
    if (patch.styles) b.styles = { ...b.styles, ...patch.styles };
    return true;
  }

  removeBlock(id: string): boolean {
    for (const r of this.rows)
      for (const c of r.columns) {
        const i = c.blocks.findIndex((b) => b.id === id);
        if (i >= 0) {
          c.blocks.splice(i, 1);
          return true;
        }
      }
    return false;
  }

  private locateBlock(id: string): { col: Column; idx: number } | null {
    for (const r of this.rows)
      for (const c of r.columns) {
        const idx = c.blocks.findIndex((b) => b.id === id);
        if (idx >= 0) return { col: c, idx };
      }
    return null;
  }

  /** Reorder: move a block before/after another block (into that block's column). */
  moveBlock(id: string, targetId: string, position: 'before' | 'after'): boolean {
    if (id === targetId) return false;
    const src = this.locateBlock(id);
    const tgt = this.locateBlock(targetId);
    if (!src || !tgt) return false;
    const [blk] = src.col.blocks.splice(src.idx, 1);
    // Recompute the target index after removal (it may have shifted).
    const tIdx = tgt.col.blocks.findIndex((b) => b.id === targetId);
    tgt.col.blocks.splice(position === 'before' ? tIdx : tIdx + 1, 0, blk);
    return true;
  }

  /** Edit a SECTION (row) style: vertical padding and/or background. */
  updateSection(id: string, patch: { padding?: string; backgroundColor?: string; borderRadius?: string }): boolean {
    const r = this.rows.find((row) => row.id === id);
    if (!r) return false;
    r.styles = { ...r.styles, ...clean(patch) };
    return true;
  }

  /** Edit the CARD/box of a section — the first column's inner padding, fill,
   * border and corners. This is what "du padding à l'intérieur de la boîte" means. */
  updateCard(
    id: string,
    patch: { padding?: string; backgroundColor?: string; borderColor?: string; borderRadius?: string },
  ): boolean {
    const r = this.rows.find((row) => row.id === id);
    const col = r?.columns[0];
    if (!col) return false;
    const next = { ...(col.styles || {}) };
    if (patch.padding) next.padding = patch.padding;
    if (patch.backgroundColor && parseHex(patch.backgroundColor)) next.backgroundColor = patch.backgroundColor;
    if (patch.borderRadius) next.borderRadius = patch.borderRadius;
    if (patch.borderColor && parseHex(patch.borderColor)) next.border = `1px solid ${patch.borderColor}`;
    col.styles = next;
    return true;
  }

  /** Remove a whole section (row) by id — e.g. a duplicated block of content. */
  removeSection(id: string): boolean {
    const i = this.rows.findIndex((r) => r.id === id);
    if (i < 0) return false;
    this.rows.splice(i, 1);
    return true;
  }

  /** Reorder a whole section (row) before/after another section. */
  moveSection(id: string, targetId: string, position: 'before' | 'after'): boolean {
    if (id === targetId) return false;
    const si = this.rows.findIndex((r) => r.id === id);
    const ti = this.rows.findIndex((r) => r.id === targetId);
    if (si < 0 || ti < 0) return false;
    const [row] = this.rows.splice(si, 1);
    const t = this.rows.findIndex((r) => r.id === targetId);
    this.rows.splice(position === 'before' ? t : t + 1, 0, row);
    return true;
  }

  /**
   * Replace an existing image's source. With a real `src` (http URL) it's set
   * directly; with a `query` we blank the src and stash the keywords in `alt`
   * so the post-generation stock-image step fetches a fresh photo. The dedicated
   * path stops the model from mistargeting an image edit onto the theme/body.
   */
  setImage(id: string, opts: { query?: string; src?: string }): boolean {
    const b = this.findBlock(id);
    if (!b || b.type !== 'image') return false;
    if (opts.src && /^https?:/i.test(opts.src)) {
      b.content.src = opts.src;
      return true;
    }
    if (opts.query) {
      b.content.alt = sanitizeText(opts.query);
      b.content.src = ''; // re-resolved by resolveStockImages using alt as the query
      return true;
    }
    return false;
  }

  // ── Output ──────────────────────────────────────────────────────────────

  get blockCount(): number {
    return this.rows.reduce((n, r) => n + r.columns.reduce((m, c) => m + c.blocks.length, 0), 0);
  }

  /** Pending hero background queries → resolved to real photos post-generation. */
  heroQueriesNeedingPhoto(): string[] {
    const out: string[] = [];
    for (const r of this.rows) {
      const q = r.styles.backgroundUrlQuery;
      if (q) out.push(q);
    }
    return [...new Set(out)];
  }

  /** Apply resolved hero photos (query → url) and drop the temporary query key. */
  applyHeroPhotos(map: Record<string, string>): void {
    for (const r of this.rows) {
      const q = r.styles.backgroundUrlQuery;
      if (!q) continue;
      if (map[q]) r.styles.backgroundUrl = map[q];
      delete r.styles.backgroundUrlQuery;
    }
  }

  /** Image blocks still missing a real (http) src — resolved post-generation. */
  imageBlocksNeedingSrc(): BlockData[] {
    const out: BlockData[] = [];
    for (const r of this.rows)
      for (const c of r.columns)
        for (const b of c.blocks)
          if (b.type === 'image' && !String(b.content.src || '').startsWith('http')) out.push(b);
    return out;
  }

  build(): TemplateData {
    const rows = this.rows.filter((r) => r.columns.some((c) => c.blocks.length > 0));
    if (this.loaded) return { rows, globalStyles: this.globalStyles };

    const p = this.palette;
    const head: string[] = [];
    if (this.meta.title) head.push(`<mj-title>${escHtml(this.meta.title)}</mj-title>`);
    if (this.meta.preview) head.push(`<mj-preview>${escHtml(this.meta.preview)}</mj-preview>`);

    const globalStyles: GlobalStyles = {
      ...DEFAULT_GLOBAL_STYLES,
      bodyColor: p.body,
      backgroundColor: p.page,
      fontFamily: p.font,
      textColor: p.ink,
      lineHeight: '1.6',
      linkColor: p.accent,
      btnFontFamily: p.font,
      btnBackgroundColor: p.accent,
      btnFontColor: p.accentInk,
      btnBorderRadius: p.radius,
      customHead: head.join('\n'),
    };
    return { rows, globalStyles };
  }
}

/**
 * Round the email's outer corners — top of the first section, bottom of the last
 * — so it reads as a single framed card against the page background. Applied as
 * the FINAL step (after any critic pass) so late-added sections are framed
 * correctly. Mutates and returns the template; skips rows already rounded.
 */
/**
 * Drop sections that are exact duplicates of an earlier one (same block types +
 * content). Small models — especially the critic pass — sometimes re-emit a
 * whole section; this removes the copy deterministically so the user never has
 * to ask "enlève le doublon". Mutates and returns the template.
 */
export function dedupeTemplate(t: TemplateData): TemplateData {
  const seen = new Set<string>();
  const sig = (r: Row) =>
    r.columns
      .flatMap((c) => c.blocks)
      .map((b) => `${b.type}:${JSON.stringify(b.content)}`)
      .join('|');
  t.rows = t.rows.filter((r) => {
    const hasContent = r.columns.some((c) => c.blocks.length > 0);
    if (!hasContent) return true; // leave structural/empty rows to other steps
    const s = sig(r);
    if (seen.has(s)) return false;
    seen.add(s);
    return true;
  });
  return t;
}

export function frameTemplate(t: TemplateData): TemplateData {
  const rows = t.rows;
  if (rows.length === 0) return t;
  const first = rows[0];
  const last = rows[rows.length - 1];
  if (!first.styles.borderRadius) {
    first.styles.borderRadius = first === last ? '20px' : '20px 20px 0 0';
  }
  if (first !== last && !last.styles.borderRadius) {
    last.styles.borderRadius = '0 0 20px 20px';
  }
  return t;
}
