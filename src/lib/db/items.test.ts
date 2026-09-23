import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Only `getItemById` is covered here: it is the one query in this module that
 * is scoped to a caller-supplied user and backs a public API route. The
 * database is mocked, so these tests pin the query's shape and the mapping,
 * not Postgres behaviour.
 */

const mocks = vi.hoisted(() => ({
  prisma: { item: { findFirst: vi.fn() } },
}));

vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));

import { getItemById } from "@/lib/db/items";

const createdAt = new Date("2026-08-26T10:00:00Z");
const updatedAt = new Date("2026-09-04T10:00:00Z");

const type = {
  id: "type-command",
  name: "Commands",
  slug: "command",
  icon: "Terminal",
  color: "orange",
  isSystem: true,
};

/** A row shaped like the Prisma result for `itemDetailInclude`. */
function itemRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "item-1",
    title: "Find and Kill a Process on a Port",
    description: "Locate whatever is bound to a port, then stop it",
    contentType: "text",
    content: "lsof -i :3000 -t | xargs kill -9",
    fileUrl: null,
    fileName: null,
    fileSize: null,
    url: null,
    language: "bash",
    isFavorite: false,
    isPinned: true,
    userId: "user-1",
    typeId: type.id,
    collectionId: "col-1",
    createdAt,
    updatedAt,
    type,
    tags: [
      { itemId: "item-1", tagId: "tag-1", tag: { id: "tag-1", name: "process" } },
      { itemId: "item-1", tagId: "tag-2", tag: { id: "tag-2", name: "terminal" } },
    ],
    collection: { id: "col-1", name: "Terminal Commands", slug: "terminal-commands" },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getItemById", () => {
  it("scopes the lookup to both the item id and the owner", async () => {
    mocks.prisma.item.findFirst.mockResolvedValue(null);

    await getItemById("item-1", "user-1");

    expect(mocks.prisma.item.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "item-1", userId: "user-1" } }),
    );
  });

  it("joins the parent collection by its display fields only", async () => {
    mocks.prisma.item.findFirst.mockResolvedValue(null);

    await getItemById("item-1", "user-1");

    const [{ include }] = mocks.prisma.item.findFirst.mock.calls[0];

    expect(include.collection).toEqual({
      select: { id: true, name: true, slug: true },
    });
    expect(include.type).toBe(true);
  });

  it("returns null when no item with that id belongs to the user", async () => {
    mocks.prisma.item.findFirst.mockResolvedValue(null);

    await expect(getItemById("someone-elses-item", "user-1")).resolves.toBeNull();
  });

  it("flattens the tags, keeps the collection and drops the owner id", async () => {
    mocks.prisma.item.findFirst.mockResolvedValue(itemRow());

    const item = await getItemById("item-1", "user-1");

    expect(item).toMatchObject({
      id: "item-1",
      title: "Find and Kill a Process on a Port",
      content: "lsof -i :3000 -t | xargs kill -9",
      language: "bash",
      isPinned: true,
      tags: ["process", "terminal"],
      type,
      collection: { id: "col-1", name: "Terminal Commands", slug: "terminal-commands" },
      createdAt,
      updatedAt,
    });
    expect(item).not.toHaveProperty("userId");
  });

  it("returns a null collection for an item outside any collection", async () => {
    mocks.prisma.item.findFirst.mockResolvedValue(
      itemRow({ collectionId: null, collection: null, tags: [] }),
    );

    const item = await getItemById("item-1", "user-1");

    expect(item?.collection).toBeNull();
    expect(item?.tags).toEqual([]);
  });

  it("lets a database failure propagate for the route to handle", async () => {
    mocks.prisma.item.findFirst.mockRejectedValue(new Error("connection reset"));

    await expect(getItemById("item-1", "user-1")).rejects.toThrow(
      "connection reset",
    );
  });
});
