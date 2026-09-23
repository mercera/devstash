import { describe, expect, it } from "vitest";

import { getCopyText } from "@/lib/item-copy";

describe("getCopyText", () => {
  it("copies the body of a text item", () => {
    expect(getCopyText({ content: "git rebase -i main", url: null })).toBe(
      "git rebase -i main",
    );
  });

  it("prefers the body when an item has both a body and a url", () => {
    expect(
      getCopyText({ content: "npm outdated", url: "https://docs.npmjs.com" }),
    ).toBe("npm outdated");
  });

  it("falls back to the url for a link item with no body", () => {
    expect(getCopyText({ content: null, url: "https://lucide.dev" })).toBe(
      "https://lucide.dev",
    );
  });

  it("treats a blank body as absent and falls back to the url", () => {
    expect(getCopyText({ content: "  \n\t ", url: "https://lucide.dev" })).toBe(
      "https://lucide.dev",
    );
  });

  it("returns null when there is nothing worth copying", () => {
    expect(getCopyText({ content: null, url: null })).toBeNull();
    expect(getCopyText({ content: "", url: "   " })).toBeNull();
  });

  it("copies the body verbatim, without trimming its whitespace", () => {
    const content = "  indented()\n  lines()\n";

    expect(getCopyText({ content, url: null })).toBe(content);
  });
});
