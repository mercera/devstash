import { describe, expect, it } from "vitest";

import {
  IDLE_RESULT_LIMIT,
  QUERY_RESULT_LIMIT,
  SEARCH_PREVIEW_LENGTH,
  fuzzyScore,
  searchCollections,
  searchItems,
  toSearchPreview,
} from "@/lib/search";
import type { SearchCollection, SearchItem } from "@/types";

function item(
  id: string,
  title: string,
  overrides: Partial<SearchItem> = {},
): SearchItem {
  return {
    id,
    title,
    type: { name: "Snippets", icon: "Code", color: "blue" },
    preview: null,
    ...overrides,
  };
}

function collection(id: string, name: string): SearchCollection {
  return { id, name, slug: id, itemCount: 0 };
}

const ids = (entries: { id: string }[]) => entries.map((entry) => entry.id);

describe("fuzzyScore", () => {
  it("returns 0 for a blank query or no match", () => {
    expect(fuzzyScore("Docker", "")).toBe(0);
    expect(fuzzyScore("Docker", "   ")).toBe(0);
    expect(fuzzyScore("Docker", "xyz")).toBe(0);
    expect(fuzzyScore("Docker", "rekcod")).toBe(0);
  });

  it("ignores case and accents", () => {
    expect(fuzzyScore("Café Setup", "CAFE")).toBeGreaterThan(0);
    expect(fuzzyScore("cafe setup", "Café")).toBeGreaterThan(0);
  });

  it("ranks an exact match over a prefix over a word start over a mid-word match", () => {
    const exact = fuzzyScore("react", "react");
    const prefix = fuzzyScore("react hooks", "react");
    const wordStart = fuzzyScore("use react", "react");
    const midWord = fuzzyScore("preact", "react");

    expect(exact).toBeGreaterThan(prefix);
    expect(prefix).toBeGreaterThan(wordStart);
    expect(wordStart).toBeGreaterThan(midWord);
  });

  it("matches characters in order with gaps, below any contiguous match", () => {
    const subsequence = fuzzyScore("Docker Compose", "dkr");
    const contiguous = fuzzyScore("xxdockxx", "dock");

    expect(subsequence).toBeGreaterThan(0);
    expect(subsequence).toBeLessThan(contiguous);
  });

  it("prefers a tight subsequence over a spread-out one", () => {
    expect(fuzzyScore("git status", "gst")).toBeGreaterThan(
      fuzzyScore("get the status", "gst"),
    );
  });

  it("rejects letters scattered across the whole text", () => {
    expect(fuzzyScore("go to the end of the list", "gst")).toBe(0);
    expect(fuzzyScore("List and Update Outdated Packages", "dock")).toBe(0);
  });
});

describe("searchItems", () => {
  const items = [
    item("recent", "Docker compose file"),
    item("hooks", "React hooks", { type: { name: "Prompts", icon: "Sparkles", color: "purple" } }),
    item("port", "Kill a process", { preview: "lsof -i :3000 -t | xargs kill -9" }),
    item("react", "React"),
  ];

  it("returns the first few items unchanged for an empty query", () => {
    const many = Array.from({ length: 10 }, (_, i) => item(`i${i}`, `Item ${i}`));

    expect(ids(searchItems(many, ""))).toEqual(
      ids(many.slice(0, IDLE_RESULT_LIMIT)),
    );
  });

  it("orders matches best first and drops non-matches", () => {
    expect(ids(searchItems(items, "react"))).toEqual(["react", "hooks"]);
  });

  it("matches the type name", () => {
    expect(ids(searchItems(items, "prompt"))).toEqual(["hooks"]);
  });

  it("matches a contiguous run in the preview but does not fuzzy-match it", () => {
    expect(ids(searchItems(items, "xargs"))).toEqual(["port"]);
    expect(searchItems(items, "lxk")).toEqual([]);
  });

  it("requires every word of the query to match", () => {
    expect(ids(searchItems(items, "react hooks"))).toEqual(["hooks"]);
    expect(searchItems(items, "react docker")).toEqual([]);
  });

  it("keeps the input order for equal scores", () => {
    const tied = [item("a", "Snippet A"), item("b", "Snippet B")];

    expect(ids(searchItems(tied, "snippet"))).toEqual(["a", "b"]);
  });

  it("caps the number of results", () => {
    const many = Array.from({ length: 40 }, (_, i) => item(`i${i}`, `Note ${i}`));

    expect(searchItems(many, "note")).toHaveLength(QUERY_RESULT_LIMIT.items);
  });
});

describe("searchCollections", () => {
  const collections = [
    collection("devops", "DevOps"),
    collection("react", "React Patterns"),
    collection("ai", "AI Workflows"),
  ];

  it("returns the first few collections for an empty query", () => {
    expect(ids(searchCollections(collections, " "))).toEqual(["devops", "react", "ai"]);
  });

  it("fuzzy-matches the collection name", () => {
    expect(ids(searchCollections(collections, "rpat"))).toEqual(["react"]);
    expect(searchCollections(collections, "zzz")).toEqual([]);
  });
});

describe("toSearchPreview", () => {
  const empty = { content: null, url: null, fileName: null, description: null };

  it("prefers content, then url, then file name, then description", () => {
    expect(toSearchPreview({ ...empty, content: "code", url: "https://x.dev" })).toBe("code");
    expect(toSearchPreview({ ...empty, url: "https://x.dev", fileName: "a.pdf" })).toBe(
      "https://x.dev",
    );
    expect(toSearchPreview({ ...empty, fileName: "a.pdf", description: "d" })).toBe("a.pdf");
    expect(toSearchPreview({ ...empty, description: "d" })).toBe("d");
  });

  it("skips blank values and returns null when nothing is left", () => {
    expect(toSearchPreview({ ...empty, content: "  \n ", description: "d" })).toBe("d");
    expect(toSearchPreview(empty)).toBeNull();
  });

  it("collapses whitespace onto one line", () => {
    expect(toSearchPreview({ ...empty, content: "  a\n\n  b\tc " })).toBe("a b c");
  });

  it("cuts long values to the preview length with an ellipsis", () => {
    const preview = toSearchPreview({ ...empty, content: "word ".repeat(100) });

    expect(preview).toHaveLength(SEARCH_PREVIEW_LENGTH);
    expect(preview?.endsWith("…")).toBe(true);
    expect(toSearchPreview({ ...empty, content: "x".repeat(SEARCH_PREVIEW_LENGTH) })).toBe(
      "x".repeat(SEARCH_PREVIEW_LENGTH),
    );
  });
});
