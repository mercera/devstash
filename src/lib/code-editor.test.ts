import { describe, expect, it } from "vitest";

import {
  CODE_EDITOR_LINE_HEIGHT,
  CODE_EDITOR_MAX_HEIGHT,
  estimateContentHeight,
  getCodeEditorHeight,
  getEditorLineHeight,
  resolveMonacoLanguage,
  type MonacoLanguageInfo,
} from "@/lib/code-editor";

/** A slice of what `monaco.languages.getLanguages()` returns. */
const LANGUAGES: MonacoLanguageInfo[] = [
  { id: "plaintext", aliases: ["Plain Text", "text"], extensions: [".txt"] },
  {
    id: "typescript",
    aliases: ["TypeScript", "ts", "typescript"],
    extensions: [".ts", ".tsx", ".cts", ".mts"],
  },
  {
    id: "javascript",
    aliases: ["JavaScript", "javascript", "js"],
    extensions: [".js", ".jsx", ".mjs", ".cjs"],
  },
  { id: "shell", aliases: ["Shell", "sh"], extensions: [".sh", ".bash"] },
  { id: "dockerfile", aliases: ["Dockerfile"], extensions: [".dockerfile"] },
  { id: "yaml", aliases: ["YAML", "yaml", "YML", "yml"], extensions: [".yaml", ".yml"] },
  { id: "go", aliases: ["Go"], extensions: [".go"] },
];

describe("resolveMonacoLanguage", () => {
  it.each([
    ["typescript", "typescript"],
    ["dockerfile", "dockerfile"],
    ["TypeScript", "typescript"],
    ["  typescript  ", "typescript"],
  ])("matches the id %j", (language, id) => {
    expect(resolveMonacoLanguage(language, LANGUAGES)).toBe(id);
  });

  it.each([
    ["ts", "typescript"],
    ["js", "javascript"],
    ["sh", "shell"],
    ["Dockerfile", "dockerfile"],
  ])("matches the alias %j", (language, id) => {
    expect(resolveMonacoLanguage(language, LANGUAGES)).toBe(id);
  });

  it.each([
    ["bash", "shell"],
    ["tsx", "typescript"],
    ["jsx", "javascript"],
    ["yml", "yaml"],
  ])("matches the extension %j", (language, id) => {
    expect(resolveMonacoLanguage(language, LANGUAGES)).toBe(id);
  });

  it.each([
    ["zsh", "shell"],
    ["docker", "dockerfile"],
    ["golang", "go"],
  ])("maps the common name %j", (language, id) => {
    expect(resolveMonacoLanguage(language, LANGUAGES)).toBe(id);
  });

  it.each([null, undefined, "", "   ", "banana"])(
    "falls back to plain text for %j",
    (language) => {
      expect(resolveMonacoLanguage(language, LANGUAGES)).toBe("plaintext");
    },
  );

  it("falls back to plain text when Monaco reports no languages", () => {
    expect(resolveMonacoLanguage("typescript", [])).toBe("plaintext");
  });
});

describe("getCodeEditorHeight", () => {
  it("follows the content between the bounds", () => {
    expect(getCodeEditorHeight(164)).toBe(164);
  });

  it("stops at the maximum", () => {
    expect(getCodeEditorHeight(2000)).toBe(CODE_EDITOR_MAX_HEIGHT);
    expect(getCodeEditorHeight(2000, 144)).toBe(CODE_EDITOR_MAX_HEIGHT);
  });

  it("grows to the minimum", () => {
    expect(getCodeEditorHeight(44, 144)).toBe(144);
  });
});

describe("estimateContentHeight", () => {
  it("counts one line for an empty value", () => {
    expect(estimateContentHeight("")).toBe(20 + 24);
  });

  it("counts every line, including a trailing empty one", () => {
    expect(estimateContentHeight("a\nb\nc\n")).toBe(4 * 20 + 24);
  });

  it("uses the line height it is given", () => {
    expect(estimateContentHeight("a\nb", 27)).toBe(2 * 27 + 24);
  });
});

describe("getEditorLineHeight", () => {
  it("keeps the original 20px line for the default 13px font", () => {
    expect(getEditorLineHeight(13)).toBe(CODE_EDITOR_LINE_HEIGHT);
  });

  it.each([
    [12, 18],
    [14, 21],
    [16, 24],
    [18, 27],
  ])("gives a %ipx font a %ipx line", (fontSize, lineHeight) => {
    expect(getEditorLineHeight(fontSize)).toBe(lineHeight);
  });
});
