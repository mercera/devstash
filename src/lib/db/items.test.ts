import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Only `getItemById`, `updateItem` and `deleteItem` are covered here: they are
 * the queries in this module scoped to a caller-supplied user, backing a public
 * API route and server actions. The database is mocked, so these tests pin the
 * queries' shape and the mapping, not Postgres behaviour.
 */

const mocks = vi.hoisted(() => {
  const tx = {
    item: { updateMany: vi.fn() },
    itemTag: { deleteMany: vi.fn(), createMany: vi.fn() },
    tag: { createMany: vi.fn(), findMany: vi.fn() },
  };

  return {
    tx,
    prisma: {
      item: { findFirst: vi.fn(), deleteMany: vi.fn() },
      $transaction: vi.fn(async (run: (client: typeof tx) => Promise<unknown>) =>
        run(tx),
      ),
    },
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));

import { deleteItem, getItemById, updateItem } from "@/lib/db/items";

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

describe("updateItem", () => {
  const { tx } = mocks;

  const edits = {
    title: "Renamed",
    description: null,
    content: "lsof -i :4000",
    tags: ["process", "ports"],
  };

  beforeEach(() => {
    tx.item.updateMany.mockResolvedValue({ count: 1 });
    tx.tag.findMany.mockResolvedValue([{ id: "tag-1" }, { id: "tag-3" }]);
    mocks.prisma.item.findFirst.mockResolvedValue(itemRow({ title: "Renamed" }));
  });

  it("writes the fields scoped to both the item id and the owner", async () => {
    await updateItem("item-1", "user-1", edits);

    expect(tx.item.updateMany).toHaveBeenCalledWith({
      where: { id: "item-1", userId: "user-1" },
      data: { title: "Renamed", description: null, content: "lsof -i :4000" },
    });
  });

  it("returns null and writes no tags when the item is not the user's", async () => {
    tx.item.updateMany.mockResolvedValue({ count: 0 });

    await expect(updateItem("someone-elses-item", "user-1", edits)).resolves.toBeNull();
    expect(tx.itemTag.deleteMany).not.toHaveBeenCalled();
    expect(tx.tag.createMany).not.toHaveBeenCalled();
    expect(mocks.prisma.item.findFirst).not.toHaveBeenCalled();
  });

  it("replaces the tags: clears the links, creates missing tags, then relinks", async () => {
    await updateItem("item-1", "user-1", edits);

    expect(tx.itemTag.deleteMany).toHaveBeenCalledWith({ where: { itemId: "item-1" } });
    expect(tx.tag.createMany).toHaveBeenCalledWith({
      data: [
        { userId: "user-1", name: "process" },
        { userId: "user-1", name: "ports" },
      ],
      skipDuplicates: true,
    });
    expect(tx.tag.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1", name: { in: ["process", "ports"] } },
      select: { id: true },
    });
    expect(tx.itemTag.createMany).toHaveBeenCalledWith({
      data: [
        { itemId: "item-1", tagId: "tag-1" },
        { itemId: "item-1", tagId: "tag-3" },
      ],
    });
    expect(tx.itemTag.deleteMany.mock.invocationCallOrder[0]).toBeLessThan(
      tx.itemTag.createMany.mock.invocationCallOrder[0],
    );
  });

  it("clears every tag when none are given", async () => {
    await updateItem("item-1", "user-1", { ...edits, tags: [] });

    expect(tx.itemTag.deleteMany).toHaveBeenCalledWith({ where: { itemId: "item-1" } });
    expect(tx.tag.createMany).not.toHaveBeenCalled();
    expect(tx.itemTag.createMany).not.toHaveBeenCalled();
  });

  it("reads the updated detail back after the transaction commits", async () => {
    const item = await updateItem("item-1", "user-1", edits);

    expect(mocks.prisma.item.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "item-1", userId: "user-1" } }),
    );
    expect(mocks.prisma.item.findFirst.mock.invocationCallOrder[0]).toBeGreaterThan(
      tx.itemTag.createMany.mock.invocationCallOrder[0],
    );
    expect(item).toMatchObject({
      id: "item-1",
      title: "Renamed",
      tags: ["process", "terminal"],
      collection: { id: "col-1", name: "Terminal Commands", slug: "terminal-commands" },
    });
    expect(item).not.toHaveProperty("userId");
  });

  it("lets a database failure propagate for the action to handle", async () => {
    tx.tag.createMany.mockRejectedValue(new Error("deadlock"));

    await expect(updateItem("item-1", "user-1", edits)).rejects.toThrow("deadlock");
    expect(mocks.prisma.item.findFirst).not.toHaveBeenCalled();
  });
});

describe("deleteItem", () => {
  it("deletes scoped to both the item id and the owner", async () => {
    mocks.prisma.item.deleteMany.mockResolvedValue({ count: 1 });

    await expect(deleteItem("item-1", "user-1")).resolves.toBe(true);
    expect(mocks.prisma.item.deleteMany).toHaveBeenCalledWith({
      where: { id: "item-1", userId: "user-1" },
    });
  });

  it("returns false when the item is missing or not the user's", async () => {
    mocks.prisma.item.deleteMany.mockResolvedValue({ count: 0 });

    await expect(deleteItem("someone-elses-item", "user-1")).resolves.toBe(false);
  });

  it("lets a database failure propagate for the action to handle", async () => {
    mocks.prisma.item.deleteMany.mockRejectedValue(new Error("connection reset"));

    await expect(deleteItem("item-1", "user-1")).rejects.toThrow("connection reset");
  });
});
