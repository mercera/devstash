import { describe, expect, it } from "vitest";

import {
  DEFAULT_EDITOR_PREFERENCES,
  editorPreferencesSchema,
  parseEditorPreferences,
} from "@/lib/editor-preferences";

const custom = {
  fontSize: 16,
  tabSize: 4,
  wordWrap: false,
  minimap: true,
  theme: "monokai",
} as const;

describe("parseEditorPreferences", () => {
  it("returns the defaults for a user who never saved any", () => {
    expect(parseEditorPreferences(null)).toEqual(DEFAULT_EDITOR_PREFERENCES);
    expect(parseEditorPreferences(undefined)).toEqual(DEFAULT_EDITOR_PREFERENCES);
  });

  it("returns the defaults for a value that is not an object", () => {
    expect(parseEditorPreferences("vs-dark")).toEqual(DEFAULT_EDITOR_PREFERENCES);
    expect(parseEditorPreferences([1, 2])).toEqual(DEFAULT_EDITOR_PREFERENCES);
  });

  it("reads a complete stored value as it is", () => {
    expect(parseEditorPreferences(custom)).toEqual(custom);
  });

  it("falls back per field, keeping the valid ones", () => {
    expect(
      parseEditorPreferences({ fontSize: 15, theme: "solarized", minimap: true }),
    ).toEqual({ ...DEFAULT_EDITOR_PREFERENCES, minimap: true });
  });

  it("does not hand out the shared defaults object", () => {
    const parsed = parseEditorPreferences("not an object");
    parsed.fontSize = 18;

    expect(DEFAULT_EDITOR_PREFERENCES.fontSize).toBe(13);
  });
});

describe("editorPreferencesSchema", () => {
  it("accepts a complete set of offered options", () => {
    expect(editorPreferencesSchema.safeParse(custom).success).toBe(true);
  });

  it.each([
    ["a font size that is not offered", { fontSize: 15 }],
    ["a tab size that is not offered", { tabSize: 3 }],
    ["an unknown theme", { theme: "solarized" }],
    ["a string for a toggle", { wordWrap: "true" }],
    ["a number sent as a string", { fontSize: "14" }],
  ])("rejects %s", (_name, change) => {
    expect(editorPreferencesSchema.safeParse({ ...custom, ...change }).success).toBe(
      false,
    );
  });

  it("rejects a partial set", () => {
    const partial: Record<string, unknown> = { ...custom };
    delete partial.theme;

    expect(editorPreferencesSchema.safeParse(partial).success).toBe(false);
  });

  it("drops fields it does not know", () => {
    const parsed = editorPreferencesSchema.parse({ ...custom, cursorStyle: "block" });

    expect(parsed).toEqual(custom);
  });
});
