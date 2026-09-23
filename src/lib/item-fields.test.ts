import { describe, expect, it } from "vitest";

import { getItemTypeFields } from "@/lib/item-fields";

describe("getItemTypeFields", () => {
  it.each([
    ["snippet", { content: true, language: true, url: false }],
    ["command", { content: true, language: true, url: false }],
    ["prompt", { content: true, language: false, url: false }],
    ["note", { content: true, language: false, url: false }],
    ["link", { content: false, language: false, url: true }],
    ["file", { content: false, language: false, url: false }],
    ["image", { content: false, language: false, url: false }],
  ])("%s", (slug, fields) => {
    expect(getItemTypeFields(slug)).toEqual(fields);
  });

  it("gives an unknown type none of the type-specific fields", () => {
    expect(getItemTypeFields("snippets")).toEqual({
      content: false,
      language: false,
      url: false,
    });
  });
});
