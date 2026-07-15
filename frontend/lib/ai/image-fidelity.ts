import type { TemplateData } from '@/lib/editor-types';
import type { ImageReport } from './image-report';

/**
 * Post-generation fidelity guards for the image → email pipeline (code, not
 * prompt). Small models occasionally (a) drop the uploaded poster back into the
 * email as an image block instead of rebuilding its content, and (b) alter or
 * omit a price from the analysed offer. These two deterministic checks catch
 * both after generation, so the output stays faithful even when the model drifts.
 */

/** Heuristic name markers for a poster/affiche src the model shouldn't emit. */
const POSTER_NAME_RE = /poster|affiche|uploaded/i;

/**
 * Remove image blocks that re-paste the uploaded poster. When `posterRef` is
 * given (the poster's public URL/id), any image whose src contains it is
 * stripped; regardless, srcs whose filename looks like a poster/affiche/uploaded
 * asset are stripped too. Returns the number of blocks removed so the caller can
 * log when > 0.
 *
 * In poster-URL mode this must run BEFORE ensurePosterBanner: strip every poster
 * occurrence here, then let ensurePosterBanner re-pin exactly one banner at the
 * top — so the poster appears once (as the banner) and never mid-email.
 */
export function stripPosterLeaks(template: TemplateData, posterRef?: string): number {
  const ref = (posterRef || '').trim();
  let removed = 0;
  const isLeak = (src: string): boolean => {
    if (!src) return false;
    if (ref && src.includes(ref)) return true;
    return POSTER_NAME_RE.test(src);
  };
  for (const row of template.rows) {
    for (const col of row.columns) {
      const before = col.blocks.length;
      col.blocks = col.blocks.filter(
        (b) => !(b.type === 'image' && isLeak(String(b.content.src || ''))),
      );
      removed += before - col.blocks.length;
    }
  }
  // Drop rows left empty by the strip so no blank section survives.
  template.rows = template.rows.filter((r) => r.columns.some((c) => c.blocks.length > 0));
  return removed;
}

/** Collect the meaningful prices from the analysed offer (main price + each
 * plan's price), normalised for whitespace. */
function offerPrices(report: ImageReport): string[] {
  const out: string[] = [];
  const push = (v?: string | null) => {
    const s = (v || '').replace(/\s+/g, ' ').trim();
    if (s) out.push(s);
  };
  push(report.content.offer.price);
  for (const p of report.content.offer.plans) push(p.price);
  return [...new Set(out)];
}

/**
 * Return the offer's prices that are ABSENT from the generated template. Each
 * price is string-searched (whitespace-normalised) across all serialized block
 * content. A non-empty result means the model dropped or altered those amounts,
 * so the caller runs one targeted repair pass.
 */
export function findMissingPrices(template: TemplateData, report: ImageReport): string[] {
  const prices = offerPrices(report);
  if (prices.length === 0) return [];
  const haystack = JSON.stringify(template).replace(/\s+/g, ' ');
  return prices.filter((p) => !haystack.includes(p));
}
