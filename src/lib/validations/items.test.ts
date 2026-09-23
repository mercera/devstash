import { describe, expect, it } from "vitest";

import { parseTagInput, updateItemSchema } from "@/lib/validations/items";

const base = { title: "Title", tags: [] };

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
    expect(updateItemSchema.safeParse({ title: "Title" }).success).toBe(false);
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
