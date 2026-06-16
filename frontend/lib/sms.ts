// SMS character + segment counting (client-side preview).
//
// Mirrors the gateway's TemplateRendererService.countSmsSegments so the live
// counter in the editor matches what /templates/:id/render-sms reports.
//
// GSM 03.38 basic charset = 1 septet each. A few chars cost 2 septets (the
// extension table). Any char outside GSM-7 forces the whole message to UCS-2.

const GSM_BASIC =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ ÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM_EXTENDED = String.raw`^{}\[]~|€`;

export type SmsEncoding = "GSM-7" | "UCS-2";

export interface SmsCount {
  encoding: SmsEncoding;
  characters: number;
  segments: number;
  /** Characters remaining in the current segment. */
  remaining: number;
}

export function countSms(text: string): SmsCount {
  const chars = [...text];
  const isGsm = chars.every(
    (c) => GSM_BASIC.includes(c) || GSM_EXTENDED.includes(c),
  );

  if (isGsm) {
    const septets = chars.reduce(
      (n, c) => n + (GSM_EXTENDED.includes(c) ? 2 : 1),
      0,
    );
    const perSegment = septets <= 160 ? 160 : 153;
    const segments = Math.max(1, Math.ceil(septets / 153));
    return {
      encoding: "GSM-7",
      characters: septets,
      segments,
      remaining: segments * perSegment - septets,
    };
  }

  const units = chars.length;
  const perSegment = units <= 70 ? 70 : 67;
  const segments = units <= 70 ? 1 : Math.ceil(units / 67);
  return {
    encoding: "UCS-2",
    characters: units,
    segments,
    remaining: segments * perSegment - units,
  };
}

/** Extract distinct {{variable}} names from a plain-text SMS body. */
export function extractSmsVariables(text: string): string[] {
  const set = new Set<string>();
  for (const m of text.matchAll(/\{\{(\w+)\}\}/g)) set.add(m[1]);
  return [...set].sort((a, b) => a.localeCompare(b));
}
