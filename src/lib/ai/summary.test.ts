import { describe, expect, it } from "vitest";

import { MAX_SUMMARY_LENGTH, buildSummaryInput, normalizeSummary } from "@/lib/ai/summary";
import { SUMMARY_CONTENT_MAX_CHARS, summarizeItemSchema } from "@/lib/validations/ai";

describe("normalizeSummary", () => {
  it("collapses whitespace and newlines into one line", () => {
    expect(normalizeSummary("  Debounces a value.\n\nUseful for   search.  ")).toBe(
      "Debounces a value. Useful for search.",
    );
  });

  it("drops a label, wrapping quotes and Markdown marks", () => {
    expect(normalizeSummary('Summary: "Runs **docker** `ps -a`."')).toBe("Runs docker ps -a.");
  });

  it("keeps quotes that belong to the text", () => {
    expect(normalizeSummary('"useDebounce" waits until "idle".')).toBe(
      '"useDebounce" waits until "idle".',
    );
  });

  it("cuts an over-long answer at the last sentence end", () => {
    const first = `${"a".repeat(200)}.`;
    const result = normalizeSummary(`${first} ${"b".repeat(200)}.`);

    expect(result).toBe(first);
  });

  it("cuts at a word with an ellipsis when there is no sentence end", () => {
    const result = normalizeSummary("word ".repeat(100));

    expect(result.length).toBeLessThanOrEqual(MAX_SUMMARY_LENGTH);
    expect(result.endsWith("word…")).toBe(true);
  });

  it("returns an empty string for whitespace", () => {
    expect(normalizeSummary(" \n ")).toBe("");
  });
});

describe("buildSummaryInput", () => {
  it("labels only the fields that are set and fences the content", () => {
    const input = buildSummaryInput(
      summarizeItemSchema.parse({
        typeSlug: "snippet",
        title: "useDebounce",
        language: "typescript",
        content: "export function useDebounce() {}",
      }),
    );

    expect(input).toContain("Item type: snippet");
    expect(input).toContain("Language: typescript");
    expect(input).toContain("<content>\nexport function useDebounce() {}\n</content>");
    expect(input).not.toContain("URL:");
    expect(input).not.toContain("File name:");
  });

  it("describes a file from its title and name alone", () => {
    const input = buildSummaryInput(
      summarizeItemSchema.parse({ typeSlug: "file", title: "", fileName: "docker-compose.yml" }),
    );

    expect(input).toContain("File name: docker-compose.yml");
    expect(input).not.toContain("<content>");
  });

  it("cuts the content at the summary limit", () => {
    const input = buildSummaryInput(
      summarizeItemSchema.parse({
        typeSlug: "note",
        title: "Long",
        content: "x".repeat(SUMMARY_CONTENT_MAX_CHARS + 50),
      }),
    );

    expect(input).toContain("x".repeat(SUMMARY_CONTENT_MAX_CHARS));
    expect(input).not.toContain("x".repeat(SUMMARY_CONTENT_MAX_CHARS + 1));
  });
});
