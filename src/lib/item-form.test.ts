import { describe, expect, it } from "vitest";

import {
  EMPTY_ITEM_FORM_VALUES,
  itemToFormValues,
  toItemFieldsPayload,
  type ItemFormValues,
} from "@/lib/item-form";
import { getItemTypeFields } from "@/lib/item-fields";
import type { ItemDetail } from "@/types";

const values: ItemFormValues = {
  title: "Kill a port",
  description: "Frees a port",
  content: "lsof -ti :3000 | xargs kill",
  language: "bash",
  url: "https://example.com",
  tags: "process, docker, , process ",
};

describe("toItemFieldsPayload", () => {
  it("sends content and language for a command, but no URL", () => {
    expect(toItemFieldsPayload(values, getItemTypeFields("command"))).toEqual({
      title: "Kill a port",
      description: "Frees a port",
      // Duplicates are the schema's to remove, not the form's.
      tags: ["process", "docker", "process"],
      content: "lsof -ti :3000 | xargs kill",
      language: "bash",
    });
  });

  it("sends only content for a note", () => {
    const payload = toItemFieldsPayload(values, getItemTypeFields("note"));

    expect(payload).toHaveProperty("content");
    expect(payload).not.toHaveProperty("language");
    expect(payload).not.toHaveProperty("url");
  });

  it("sends only the URL for a link", () => {
    const payload = toItemFieldsPayload(values, getItemTypeFields("link"));

    expect(payload.url).toBe("https://example.com");
    expect(payload).not.toHaveProperty("content");
    expect(payload).not.toHaveProperty("language");
  });

  it("sends none of the type fields for an upload type", () => {
    const payload = toItemFieldsPayload(values, getItemTypeFields("image"));

    expect(Object.keys(payload).sort()).toEqual(["description", "tags", "title"]);
  });

  it("sends an empty tag list for a blank tag field", () => {
    const payload = toItemFieldsPayload(EMPTY_ITEM_FORM_VALUES, getItemTypeFields("note"));

    expect(payload.tags).toEqual([]);
  });
});

describe("itemToFormValues", () => {
  const base = {
    title: "Lucide Icons",
    description: null,
    content: null,
    language: null,
    url: null,
    tags: [],
  };

  it("turns nulls into empty inputs", () => {
    expect(itemToFormValues(base as unknown as ItemDetail)).toEqual({
      ...EMPTY_ITEM_FORM_VALUES,
      title: "Lucide Icons",
    });
  });

  it("joins tags with a comma and a space", () => {
    const item = { ...base, url: "https://lucide.dev", tags: ["icons", "react"] };

    expect(itemToFormValues(item as unknown as ItemDetail)).toMatchObject({
      url: "https://lucide.dev",
      tags: "icons, react",
    });
  });
});
