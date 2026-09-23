import { describe, expect, it } from "vitest";

import {
  CREATABLE_TYPE_SLUGS,
  getItemTypeFields,
  isCreatableTypeSlug,
} from "@/lib/item-fields";

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

describe("isCreatableTypeSlug", () => {
  it.each(CREATABLE_TYPE_SLUGS)("accepts %s", (slug) => {
    expect(isCreatableTypeSlug(slug)).toBe(true);
  });

  it.each(["file", "image", "Snippet", "snippets", ""])("rejects %j", (slug) => {
    expect(isCreatableTypeSlug(slug)).toBe(false);
  });
});
