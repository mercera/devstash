/**
 * The user's Monaco editor settings: the options `/settings` offers, their
 * defaults, and the schemas that check a save and read a stored value.
 *
 * Client-safe — no Prisma, no React — so the settings form, the editor and the
 * server action all share one definition.
 */

import { z } from "zod";

export const EDITOR_FONT_SIZES = [12, 13, 14, 16, 18] as const;
export const EDITOR_TAB_SIZES = [2, 4, 8] as const;
export const EDITOR_THEMES = ["vs-dark", "monokai", "github-dark"] as const;

export type EditorFontSize = (typeof EDITOR_FONT_SIZES)[number];
export type EditorTabSize = (typeof EDITOR_TAB_SIZES)[number];
export type EditorTheme = (typeof EDITOR_THEMES)[number];

export const EDITOR_THEME_LABELS: Record<EditorTheme, string> = {
  "vs-dark": "VS Dark",
  monokai: "Monokai",
  "github-dark": "GitHub Dark",
};

export interface EditorPreferences {
  fontSize: EditorFontSize;
  tabSize: EditorTabSize;
  wordWrap: boolean;
  minimap: boolean;
  theme: EditorTheme;
}

/** Font size 13 and tab size 2 are what the editor used before this setting. */
export const DEFAULT_EDITOR_PREFERENCES: EditorPreferences = {
  fontSize: 13,
  tabSize: 2,
  wordWrap: true,
  minimap: false,
  theme: "vs-dark",
};

/** A save: every field required and within the offered options. */
export const editorPreferencesSchema = z.object({
  fontSize: z.literal(EDITOR_FONT_SIZES),
  tabSize: z.literal(EDITOR_TAB_SIZES),
  wordWrap: z.boolean(),
  minimap: z.boolean(),
  theme: z.enum(EDITOR_THEMES),
});

const defaults = DEFAULT_EDITOR_PREFERENCES;

/**
 * A stored value, read leniently: each field that is missing or no longer
 * offered falls back to its default on its own, so dropping one option never
 * resets the others.
 */
const storedEditorPreferencesSchema = z
  .object({
    fontSize: z.literal(EDITOR_FONT_SIZES).catch(defaults.fontSize),
    tabSize: z.literal(EDITOR_TAB_SIZES).catch(defaults.tabSize),
    wordWrap: z.boolean().catch(defaults.wordWrap),
    minimap: z.boolean().catch(defaults.minimap),
    theme: z.enum(EDITOR_THEMES).catch(defaults.theme),
  })
  .catch(() => ({ ...defaults }));

/**
 * The `User.editorPreferences` column as usable settings. Null (never saved),
 * a non-object and any unrecognised field all come back as defaults.
 */
export function parseEditorPreferences(value: unknown): EditorPreferences {
  return storedEditorPreferencesSchema.parse(value ?? {});
}
