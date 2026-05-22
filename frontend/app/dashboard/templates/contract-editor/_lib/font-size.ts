import { Mark, mergeAttributes } from '@tiptap/core';

// Inline mark that wraps selected text in <span style="font-size: …">.
// Why: TipTap Pro provides a FontSize mark, but the OSS build does not — and the
// project intentionally avoids paid licences. Keeping the mark local avoids a new
// runtime dependency.
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (size: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
  }
}

export const FontSize = Mark.create({
  name: 'fontSize',

  addAttributes() {
    return {
      size: {
        default: null,
        parseHTML: (el) => (el as HTMLElement).style.fontSize || null,
        renderHTML: (attrs) => (attrs.size ? { style: `font-size: ${attrs.size}` } : {}),
      },
    };
  },

  parseHTML() {
    return [{ style: 'font-size', getAttrs: (v) => (v ? null : false) }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setFontSize: (size: string) => ({ chain }) =>
        chain().setMark('fontSize', { size }).run(),
      unsetFontSize: () => ({ chain }) =>
        chain().unsetMark('fontSize').run(),
    };
  },
});
