import { describe, expect, it } from "vitest";

import {
  MAX_CHANGES,
  buildOptimizeInput,
  findMissingPlaceholders,
  parseOptimizeResponse,
} from "@/lib/ai/optimize-prompt";
import { AiResponseError } from "@/lib/ai/errors";

const original = "Review {{code}} for bugs. Use $LANGUAGE conventions and cite [STYLE_GUIDE].";

function answer(optimizedPrompt: unknown, changes: unknown = ["Clarified the goal"]) {
  return JSON.stringify({ optimizedPrompt, changes });
}

describe("buildOptimizeInput", () => {
  it("sends the title and the trimmed prompt inside <prompt>", () => {
    const input = buildOptimizeInput({
      title: "  Code review ",
      content: "\n  Review this.  \n",
      language: null,
      typeSlug: "prompt",
    });

    expect(input).toBe(
      "Title: Code review\n<prompt>\nReview this.\n</prompt>\nReturn the optimized prompt as JSON.",
    );
  });

  it("leaves out a blank title", () => {
    const input = buildOptimizeInput({ title: " ", content: "Hi", language: null, typeSlug: "prompt" });

    expect(input.startsWith("<prompt>")).toBe(true);
  });
});

describe("findMissingPlaceholders", () => {
  it("finds nothing when every placeholder survives", () => {
    const rewrite = "You are a reviewer. Check {{code}} using $LANGUAGE and [STYLE_GUIDE].";

    expect(findMissingPlaceholders(original, rewrite)).toEqual([]);
  });

  it("lists each dropped placeholder once", () => {
    const withRepeat = `${original} Again: {{code}}.`;

    expect(findMissingPlaceholders(withRepeat, "Review the code.")).toEqual([
      "{{code}}",
      "$LANGUAGE",
      "[STYLE_GUIDE]",
    ]);
  });

  it("recognises ${VAR} and ignores lowercase brackets and prices", () => {
    expect(findMissingPlaceholders("Use ${API_URL} [see docs] for $5", "Use it")).toEqual([
      "${API_URL}",
    ]);
  });
});

describe("parseOptimizeResponse", () => {
  const rewrite = "You are a senior reviewer.\n\nReview {{code}} for bugs using $LANGUAGE and [STYLE_GUIDE].";

  it("returns the rewrite with its changes", () => {
    expect(parseOptimizeResponse(answer(rewrite, ["Added a role", "Split into steps"]), original)).toEqual({
      optimizedPrompt: rewrite,
      changes: ["Added a role", "Split into steps"],
    });
  });

  it("reports an unchanged prompt as null, even if only the whitespace moved", () => {
    const reflowed = original.replace(". ", ".\n\n");

    expect(parseOptimizeResponse(answer(`  ${reflowed}  `, []), original)).toEqual({
      optimizedPrompt: null,
      changes: [],
    });
  });

  it("unwraps a rewrite fenced as a whole", () => {
    const result = parseOptimizeResponse(answer("```markdown\n" + rewrite + "\n```"), original);

    expect(result.optimizedPrompt).toBe(rewrite);
  });

  it("unwraps a rewrite that echoes the <prompt> tags", () => {
    const result = parseOptimizeResponse(answer(`<prompt>\n${rewrite}\n</prompt>`), original);

    expect(result.optimizedPrompt).toBe(rewrite);
  });

  it("cleans the changes: markers stripped, blanks dropped, long ones cut, at most five", () => {
    const long = "x".repeat(250);
    const result = parseOptimizeResponse(
      answer(rewrite, ["- Added a role", "2. Split steps", " ", 7, long, "a", "b", "c"]),
      original,
    );

    expect(result.changes).toHaveLength(MAX_CHANGES);
    expect(result.changes.slice(0, 2)).toEqual(["Added a role", "Split steps"]);
    expect(result.changes[2]).toHaveLength(200);
    expect(result.changes[2].endsWith("…")).toBe(true);
  });

  it("accepts a rewrite with no changes listed", () => {
    const text = JSON.stringify({ optimizedPrompt: rewrite });

    expect(parseOptimizeResponse(text, original).changes).toEqual([]);
  });

  it.each([
    ["output that is not JSON", "Here is your prompt"],
    ["a missing optimizedPrompt", JSON.stringify({ changes: [] })],
    ["an empty optimizedPrompt", answer("   ")],
    ["a JSON null", "null"],
  ])("rejects %s", (_label, text) => {
    expect(() => parseOptimizeResponse(text, original)).toThrow(AiResponseError);
  });

  it("rejects a rewrite that drops a placeholder", () => {
    expect(() =>
      parseOptimizeResponse(answer("Review the code for bugs using $LANGUAGE."), original),
    ).toThrow("dropped placeholders");
  });
});
