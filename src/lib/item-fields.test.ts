import { describe, expect, it } from "vitest";

import {
  CREATABLE_TYPE_SLUGS,
  getCreatableTypes,
  getItemTypeFields,
  isCreatableTypeSlug,
  singularTypeName,
} from "@/lib/item-fields";

describe("getItemTypeFields", () => {
  it.each([
    ["snippet", { content: true, language: true, url: false, code: true, upload: null }],
    ["command", { content: true, language: true, url: false, code: true, upload: null }],
    ["prompt", { content: true, language: false, url: false, code: false, upload: null }],
    ["note", { content: true, language: false, url: false, code: false, upload: null }],
    ["link", { content: false, language: false, url: true, code: false, upload: null }],
    ["file", { content: false, language: false, url: false, code: false, upload: "file" }],
    ["image", { content: false, language: false, url: false, code: false, upload: "image" }],
  ])("%s", (slug, fields) => {
    expect(getItemTypeFields(slug)).toEqual(fields);
  });

  it("gives an unknown type none of the type-specific fields", () => {
    expect(getItemTypeFields("snippets")).toEqual({
      content: false,
      language: false,
      url: false,
      code: false,
      upload: null,
    });
  });
});

describe("getCreatableTypes", () => {
  const systemType = (slug: string) => ({
    id: `seed-type-${slug}`,
    name: `${slug}s`,
    slug,
    icon: "Code",
    color: "blue" as const,
    isSystem: true,
  });

  it("keeps the creatable system types in order, dropping the rest", () => {
    const types = ["snippet", "file", "custom", "image", "link"].map(systemType);

    expect(getCreatableTypes(types).map((type) => type.slug)).toEqual([
      "snippet",
      "file",
      "image",
      "link",
    ]);
  });

  it("drops a custom type that shares a creatable slug", () => {
    const custom = { ...systemType("snippet"), id: "custom", isSystem: false };

    expect(getCreatableTypes([custom])).toEqual([]);
  });

  it("trims each type to the ItemType fields", () => {
    const withCount = { ...systemType("note"), itemCount: 4 };

    expect(getCreatableTypes([withCount])).toEqual([systemType("note")]);
  });
});

describe("singularTypeName", () => {
  it.each([
    ["snippet", "Snippet"],
    ["command", "Command"],
    ["link", "Link"],
  ])("%s → %s", (slug, name) => {
    expect(singularTypeName(slug)).toBe(name);
  });
});

describe("isCreatableTypeSlug", () => {
  it.each(CREATABLE_TYPE_SLUGS)("accepts %s", (slug) => {
    expect(isCreatableTypeSlug(slug)).toBe(true);
  });

  it.each(["custom", "Snippet", "snippets", ""])("rejects %j", (slug) => {
    expect(isCreatableTypeSlug(slug)).toBe(false);
  });
});
