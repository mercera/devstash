import { describe, expect, it } from "vitest";

import { AiResponseError } from "@/lib/ai/errors";
import { buildTagInput, normalizeSuggestedTags, parseTagResponse } from "@/lib/ai/tags";
import { TAG_CONTENT_MAX_CHARS, suggestTagsSchema } from "@/lib/validations/ai";

describe("parseTagResponse", () => {
  it("reads an object with a tags array", () => {
    expect(parseTagResponse('{"tags": ["react", "hooks"]}')).toEqual(["react", "hooks"]);
  });

  it("reads a bare array", () => {
    expect(parseTagResponse('["react", "hooks"]')).toEqual(["react", "hooks"]);
  });

  it.each(['{"labels": ["react"]}', '"react"', "null", "react, hooks"])(
    "rejects %j",
    (text) => {
      expect(() => parseTagResponse(text)).toThrow(AiResponseError);
    },
  );
});

describe("normalizeSuggestedTags", () => {
  it("lowercases, strips # and commas, and hyphenates spaces", () => {
    expect(normalizeSuggestedTags(["React", "#TypeScript", " Error  Handling ", "a,b"], [])).toEqual(
      ["react", "typescript", "error-handling", "ab"],
    );
  });

  it("drops non-strings, blanks, over-long tags and duplicates", () => {
    expect(
      normalizeSuggestedTags([42, "", "  ", "x".repeat(31), "docker", "Docker"], []),
    ).toEqual(["docker"]);
  });

  it("leaves out tags already in the field, in any case", () => {
    expect(normalizeSuggestedTags(["react", "hooks", "state"], ["React", " hooks "])).toEqual([
      "state",
    ]);
  });

  it("keeps at most five", () => {
    expect(normalizeSuggestedTags(["a", "b", "c", "d", "e", "f", "g"], [])).toEqual([
      "a",
      "b",
      "c",
      "d",
      "e",
    ]);
  });
});

describe("buildTagInput", () => {
  it("labels what is set, wraps the content and truncates it", () => {
    const input = suggestTagsSchema.parse({
      typeSlug: "snippet",
      title: "useDebounce",
      language: "typescript",
      content: "x".repeat(TAG_CONTENT_MAX_CHARS + 500),
      tags: ["react"],
    });
    const text = buildTagInput(input);

    expect(text).toContain("Item type: snippet");
    expect(text).toContain("Title: useDebounce");
    expect(text).toContain("Language: typescript");
    expect(text).toContain("Existing tags: react");
    expect(text).not.toContain("URL:");
    expect(text).not.toContain("Description:");
    expect(text).toContain(`<content>\n${"x".repeat(TAG_CONTENT_MAX_CHARS)}\n</content>`);
    expect(text).not.toContain("x".repeat(TAG_CONTENT_MAX_CHARS + 1));
  });

  it("omits the content block when there is no content", () => {
    const input = suggestTagsSchema.parse({ typeSlug: "link", title: "Docs", url: "https://x.dev" });

    expect(buildTagInput(input)).not.toContain("<content>");
  });
});
