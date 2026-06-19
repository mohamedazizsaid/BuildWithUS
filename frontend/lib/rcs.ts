// RCS helpers (client-side). RCS templates are stored as a JSON payload string
// in `content`; variables can appear in any text field, so we scan the whole
// serialized payload — same {{variable}} convention as SMS/email.

/** Extract distinct {{variable}} names from a serialized RCS payload (or any string). */
export function extractRcsVariables(content: string): string[] {
  const set = new Set<string>();
  for (const m of content.matchAll(/\{\{(\w+)\}\}/g)) set.add(m[1]);
  return [...set].sort((a, b) => a.localeCompare(b));
}

// RBM limits we surface as soft hints in the editor.
export const RCS_LIMITS = {
  messageSuggestions: 11, // suggested replies + actions attached to a message
  cardSuggestions: 4, // buttons inside a single rich card
  carouselMin: 2,
  carouselMax: 10,
  cardTitle: 200,
  cardDescription: 2000,
};
