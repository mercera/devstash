/**
 * Monaco themes for each editor theme preference. Only `vs-dark` ships with
 * Monaco; Monokai and GitHub Dark are defined here from their published
 * palettes.
 *
 * Every theme leaves the editor's own background transparent. The frame around
 * it paints the theme's background instead (`surfaceClass`), so the rounded
 * corners and the header match, and Monaco's suggest box — which can overflow
 * the editor — is never clipped by a rounded, overflow-hidden editor.
 */

import type { editor } from "monaco-editor";

import type { EditorTheme } from "@/lib/editor-preferences";

interface MonacoTheme {
  /** The name registered with `monaco.editor.defineTheme`. */
  name: string;
  data: editor.IStandaloneThemeData;
  /** Tailwind background for the editor frame. */
  surfaceClass: string;
}

const TRANSPARENT = "#00000000";

/** Colours every theme shares: the transparent surface and the thin scrollbars. */
const SHARED_COLORS: editor.IColors = {
  "editor.background": TRANSPARENT,
  "editorGutter.background": TRANSPARENT,
  "editor.lineHighlightBorder": TRANSPARENT,
  "scrollbar.shadow": TRANSPARENT,
  "scrollbarSlider.background": "#ffffff1f",
  "scrollbarSlider.hoverBackground": "#ffffff33",
  "scrollbarSlider.activeBackground": "#ffffff47",
  "minimap.background": TRANSPARENT,
};

export const MONACO_THEMES: Record<EditorTheme, MonacoTheme> = {
  // Monaco's own dark theme, on the app's muted surface — what the editor
  // looked like before themes were selectable.
  "vs-dark": {
    name: "devstash-dark",
    surfaceClass: "bg-muted/30",
    data: {
      base: "vs-dark",
      inherit: true,
      rules: [],
      colors: {
        ...SHARED_COLORS,
        "editor.lineHighlightBackground": "#ffffff08",
        "editorLineNumber.foreground": "#525252",
        "editorLineNumber.activeForeground": "#a3a3a3",
        "editorWidget.background": "#171717",
        "editorWidget.border": "#ffffff1a",
        "editorSuggestWidget.background": "#171717",
        "editorSuggestWidget.border": "#ffffff1a",
      },
    },
  },
  monokai: {
    name: "devstash-monokai",
    surfaceClass: "bg-[#272822]",
    data: {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "", foreground: "f8f8f2" },
        { token: "comment", foreground: "75715e", fontStyle: "italic" },
        { token: "string", foreground: "e6db74" },
        { token: "number", foreground: "ae81ff" },
        { token: "constant", foreground: "ae81ff" },
        { token: "regexp", foreground: "e6db74" },
        { token: "keyword", foreground: "f92672" },
        { token: "operator", foreground: "f92672" },
        { token: "type", foreground: "66d9ef", fontStyle: "italic" },
        { token: "type.identifier", foreground: "a6e22e" },
        { token: "predefined", foreground: "66d9ef" },
        { token: "variable", foreground: "f8f8f2" },
        { token: "identifier", foreground: "f8f8f2" },
        { token: "delimiter", foreground: "f8f8f2" },
        { token: "tag", foreground: "f92672" },
        { token: "attribute.name", foreground: "a6e22e" },
        { token: "attribute.value", foreground: "e6db74" },
      ],
      colors: {
        ...SHARED_COLORS,
        "editor.foreground": "#f8f8f2",
        "editor.lineHighlightBackground": "#3e3d3280",
        "editor.selectionBackground": "#49483e",
        "editorCursor.foreground": "#f8f8f0",
        "editorWhitespace.foreground": "#464741",
        "editorLineNumber.foreground": "#90908a",
        "editorLineNumber.activeForeground": "#f8f8f2",
        "editorWidget.background": "#1e1f1c",
        "editorWidget.border": "#ffffff1a",
        "editorSuggestWidget.background": "#1e1f1c",
        "editorSuggestWidget.border": "#ffffff1a",
        "editorSuggestWidget.selectedBackground": "#49483e",
      },
    },
  },
  "github-dark": {
    name: "devstash-github-dark",
    surfaceClass: "bg-[#0d1117]",
    data: {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "", foreground: "e6edf3" },
        { token: "comment", foreground: "8b949e", fontStyle: "italic" },
        { token: "string", foreground: "a5d6ff" },
        { token: "number", foreground: "79c0ff" },
        { token: "constant", foreground: "79c0ff" },
        { token: "regexp", foreground: "7ee787" },
        { token: "keyword", foreground: "ff7b72" },
        { token: "operator", foreground: "ff7b72" },
        { token: "type", foreground: "ffa657" },
        { token: "type.identifier", foreground: "ffa657" },
        { token: "predefined", foreground: "d2a8ff" },
        { token: "variable", foreground: "ffa657" },
        { token: "identifier", foreground: "e6edf3" },
        { token: "delimiter", foreground: "e6edf3" },
        { token: "tag", foreground: "7ee787" },
        { token: "attribute.name", foreground: "79c0ff" },
        { token: "attribute.value", foreground: "a5d6ff" },
      ],
      colors: {
        ...SHARED_COLORS,
        "editor.foreground": "#e6edf3",
        "editor.lineHighlightBackground": "#6e76811a",
        "editor.selectionBackground": "#264f78",
        "editorCursor.foreground": "#2f81f7",
        "editorWhitespace.foreground": "#484f58",
        "editorLineNumber.foreground": "#6e7681",
        "editorLineNumber.activeForeground": "#e6edf3",
        "editorWidget.background": "#161b22",
        "editorWidget.border": "#30363d",
        "editorSuggestWidget.background": "#161b22",
        "editorSuggestWidget.border": "#30363d",
        "editorSuggestWidget.selectedBackground": "#6e768166",
      },
    },
  },
};
