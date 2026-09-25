import { describe, expect, it } from "vitest";

import { slugify, uniqueSlug } from "@/lib/slug";

describe("slugify", () => {
  it.each([
    ["React Patterns", "react-patterns"],
    ["  Python   Snippets  ", "python-snippets"],
    ["Café Notes", "cafe-notes"],
    ["C++ / Rust tips!", "c-rust-tips"],
    ["--AI__Prompts--", "ai-prompts"],
    ["Top 10", "top-10"],
  ])("turns %j into %j", (name, slug) => {
    expect(slugify(name)).toBe(slug);
  });

  it.each(["🚀", "!!!", "日本語"])(
    "falls back to a fixed slug when %j has nothing to keep",
    (name) => {
      expect(slugify(name)).toBe("collection");
    },
  );
});

describe("uniqueSlug", () => {
  it("keeps the base when it is free", () => {
    expect(uniqueSlug("react", new Set(["react-patterns"]))).toBe("react");
  });

  it("appends the first free number when the base is taken", () => {
    expect(uniqueSlug("react", new Set(["react"]))).toBe("react-2");
    expect(uniqueSlug("react", new Set(["react", "react-2", "react-3"]))).toBe(
      "react-4",
    );
  });

  it("fills a gap rather than always counting up", () => {
    expect(uniqueSlug("react", new Set(["react", "react-3"]))).toBe("react-2");
  });
});
