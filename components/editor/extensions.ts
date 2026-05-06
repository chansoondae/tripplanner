import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import { EditorView } from "@codemirror/view";

// 커스텀 하이라이팅: 시간(**HH:MM**), 장소(@...), 이모지
export const itineraryHighlight = HighlightStyle.define([
  { tag: tags.strong, color: "var(--cm-time-color, #2563eb)", fontWeight: "600" },
  { tag: tags.heading, color: "var(--cm-heading-color, #111827)", fontWeight: "700" },
  { tag: tags.meta, color: "var(--cm-meta-color, #6b7280)" },
  { tag: tags.keyword, color: "var(--cm-keyword-color, #7c3aed)" },
]);

export const baseTheme = EditorView.theme({
  "&": {
    height: "100%",
    fontSize: "14px",
    fontFamily: "var(--font-mono, monospace)",
  },
  ".cm-content": {
    padding: "1rem",
    caretColor: "var(--foreground)",
  },
  ".cm-focused": {
    outline: "none",
  },
  ".cm-line": {
    lineHeight: "1.7",
  },
  ".cm-scroller": {
    overflow: "auto",
  },
});

export const editorExtensions = [
  syntaxHighlighting(itineraryHighlight),
  baseTheme,
  EditorView.lineWrapping,
];
