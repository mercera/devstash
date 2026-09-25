import { describe, expect, it } from "vitest";

import {
  createItemSchema,
  parseTagInput,
  updateItemSchema,
} from "@/lib/validations/items";

const base = { title: "Title", tags: [], collectionIds: [] };

describe("updateItemSchema", () => {
  it("trims the title and rejects a blank one", () => {
    expect(updateItemSchema.parse({ ...base, title: "  Hooks  " }).title).toBe("Hooks");

    const result = updateItemSchema.safeParse({ ...base, title: "   " });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.title).toEqual(["Title is required"]);
  });

  it("stores blank optional text as null so a cleared field clears the column", () => {
    const data = updateItemSchema.parse({
      ...base,
      description: "   ",
      language: "",
      content: " \n\t ",
      url: "  ",
    });

    expect(data).toMatchObject({
      description: null,
      language: null,
      content: null,
      url: null,
    });
  });

  it("accepts an explicit null for every optional field", () => {
    const data = updateItemSchema.parse({
      ...base,
      description: null,
      content: null,
      url: null,
      language: null,
    });

    expect(data).toMatchObject({
      description: null,
      content: null,
      url: null,
      language: null,
    });
  });

  it("leaves absent fields undefined so they are not written", () => {
    const data = updateItemSchema.parse(base);

    expect(data.content).toBeUndefined();
    expect(data.url).toBeUndefined();
    expect(data.language).toBeUndefined();
    expect(data.description).toBeUndefined();
  });

  it("keeps the content's indentation", () => {
    const content = "  if (x) {\n    run();\n  }\n";

    expect(updateItemSchema.parse({ ...base, content }).content).toBe(content);
  });

  it("trims description and language", () => {
    const data = updateItemSchema.parse({
      ...base,
      description: "  Useful  ",
      language: " typescript ",
    });

    expect(data.description).toBe("Useful");
    expect(data.language).toBe("typescript");
  });

  it.each(["https://react.dev/reference", "http://localhost:3000/a?b=c"])(
    "accepts the URL %s",
    (url) => {
      expect(updateItemSchema.parse({ ...base, url: ` ${url} ` }).url).toBe(url);
    },
  );

  it.each(["not a url", "javascript:alert(1)", "ftp://files.example.com"])(
    "rejects the URL %j",
    (url) => {
      const result = updateItemSchema.safeParse({ ...base, url });

      expect(result.success).toBe(false);
      expect(result.error?.flatten().fieldErrors.url).toBeDefined();
    },
  );

  it("trims and de-duplicates tags", () => {
    const data = updateItemSchema.parse({
      ...base,
      tags: [" react ", "hooks", "react"],
    });

    expect(data.tags).toEqual(["react", "hooks"]);
  });

  it("rejects a blank tag", () => {
    const result = updateItemSchema.safeParse({ ...base, tags: ["react", "  "] });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.tags).toBeDefined();
  });

  it("requires the tags array", () => {
    expect(
      updateItemSchema.safeParse({ title: "Title", collectionIds: [] }).success,
    ).toBe(false);
  });

  it("de-duplicates collection ids", () => {
    const data = updateItemSchema.parse({
      ...base,
      collectionIds: ["col-1", "col-2", "col-1"],
    });

    expect(data.collectionIds).toEqual(["col-1", "col-2"]);
  });

  it("rejects a blank collection id", () => {
    const result = updateItemSchema.safeParse({ ...base, collectionIds: ["col-1", ""] });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.collectionIds).toBeDefined();
  });

  it("requires the collection ids array, so an edit never clears them by omission", () => {
    expect(updateItemSchema.safeParse({ title: "Title", tags: [] }).success).toBe(false);
  });
});

describe("parseTagInput", () => {
  it("splits on commas and trims each tag", () => {
    expect(parseTagInput("react,  hooks , state")).toEqual(["react", "hooks", "state"]);
  });

  it("drops empty entries from stray commas", () => {
    expect(parseTagInput(" , react,,hooks, ")).toEqual(["react", "hooks"]);
  });

  it("returns no tags for an empty field", () => {
    expect(parseTagInput("   ")).toEqual([]);
  });
});

describe("createItemSchema", () => {
  const base = { title: "Title", tags: [], collectionIds: [] };

  it.each(["snippet", "prompt", "command", "note"] as const)(
    "accepts a %s without a URL",
    (typeSlug) => {
      expect(createItemSchema.safeParse({ ...base, typeSlug }).success).toBe(true);
    },
  );

  it.each(["custom", "Snippet", "snippets", ""])("rejects the type %j", (typeSlug) => {
    const result = createItemSchema.safeParse({ ...base, typeSlug });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.typeSlug).toEqual(["Choose an item type"]);
  });

  it.each([undefined, "", "   ", null])("requires a URL for a link (%j)", (url) => {
    const result = createItemSchema.safeParse({ ...base, typeSlug: "link", url });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.url).toEqual(["URL is required"]);
  });

  it("accepts a link with an http(s) URL and rejects any other scheme", () => {
    expect(
      createItemSchema.parse({ ...base, typeSlug: "link", url: " https://nextjs.org " }).url,
    ).toBe("https://nextjs.org");

    const result = createItemSchema.safeParse({
      ...base,
      typeSlug: "link",
      url: "javascript:alert(1)",
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.url).toBeDefined();
  });

  it("sets every column, storing the ones the type does not carry as null", () => {
    const data = createItemSchema.parse({
      ...base,
      typeSlug: "link",
      url: "https://nextjs.org",
      content: "smuggled",
      language: "ts",
      file: {
        fileUrl: "https://files.example/uploads/user-1/a.png",
        fileName: "a.png",
        fileSize: 10,
      },
    });

    expect(data).toEqual({
      typeSlug: "link",
      title: "Title",
      description: null,
      content: null,
      language: null,
      url: "https://nextjs.org",
      contentType: "text",
      fileUrl: null,
      fileName: null,
      fileSize: null,
      tags: [],
      collectionIds: [],
    });
  });

  it("keeps a snippet's content and language and drops a URL", () => {
    const data = createItemSchema.parse({
      ...base,
      typeSlug: "snippet",
      content: "  return x;",
      language: " ts ",
      url: "https://nextjs.org",
    });

    expect(data).toMatchObject({ content: "  return x;", language: "ts", url: null });
  });

  it("keeps a prompt's content but not a language", () => {
    const data = createItemSchema.parse({
      ...base,
      typeSlug: "prompt",
      content: "Explain this code",
      language: "en",
    });

    expect(data).toMatchObject({ content: "Explain this code", language: null });
  });

  it("de-duplicates tags and requires a title, as on edit", () => {
    expect(
      createItemSchema.parse({ ...base, typeSlug: "note", tags: ["a", " a ", "b"] }).tags,
    ).toEqual(["a", "b"]);

    const result = createItemSchema.safeParse({ ...base, typeSlug: "note", title: " " });

    expect(result.error?.flatten().fieldErrors.title).toEqual(["Title is required"]);
  });
});
