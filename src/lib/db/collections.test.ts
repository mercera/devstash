import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The database is mocked, so these tests pin who each query is scoped to and
 * how `createCollection` picks a slug — not Postgres behaviour.
 */

const mocks = vi.hoisted(() => ({
  prisma: {
    collection: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    itemType: { findMany: vi.fn() },
    $queryRaw: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));

import {
  createCollection,
  deleteCollection,
  getCollectionBySlug,
  getCollectionStats,
  getCollectionsPage,
  getFavoriteCollections,
  getRecentCollections,
  setCollectionFavorite,
  updateCollection,
} from "@/lib/db/collections";
import { COLLECTIONS_PER_PAGE } from "@/lib/pagination";

const created = {
  id: "col-1",
  name: "React Patterns",
  slug: "react-patterns",
  description: null,
  color: "gray",
  isFavorite: false,
  createdAt: new Date("2026-09-25T10:00:00Z"),
  updatedAt: new Date("2026-09-25T10:00:00Z"),
};

function uniqueViolation() {
  return Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getRecentCollections", () => {
  it("scopes the collections, custom types and item counts to the user", async () => {
    mocks.prisma.collection.findMany.mockResolvedValue([]);
    mocks.prisma.itemType.findMany.mockResolvedValue([]);
    mocks.prisma.$queryRaw.mockResolvedValue([]);

    await getRecentCollections("user-1", 6);

    expect(mocks.prisma.collection.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1" },
        orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
        take: 6,
      }),
    );
    expect(mocks.prisma.itemType.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { OR: [{ isSystem: true }, { userId: "user-1" }] },
      }),
    );

    // A tagged template: the SQL fragments, then the bound values.
    const [strings, ...values] = mocks.prisma.$queryRaw.mock.calls[0];
    expect(strings.join("?")).toContain('JOIN "Item" i ON i."id" = ic."itemId"');
    expect(strings.join("?")).toContain('WHERE i."userId" = ?');
    expect(values).toEqual(["user-1"]);
  });

  it("counts an item in every collection it belongs to, most-used type first", async () => {
    const snippet = { id: "type-snippet", name: "Snippets", slug: "snippet", icon: "Code", color: "blue", isSystem: true };
    const command = { id: "type-command", name: "Commands", slug: "command", icon: "Terminal", color: "orange", isSystem: true };

    mocks.prisma.collection.findMany.mockResolvedValue([
      { ...created, id: "col-1", color: "gray" },
      { ...created, id: "col-2", name: "Shell", slug: "shell", color: "pink" },
      { ...created, id: "col-3", name: "Empty", slug: "empty", color: "green" },
    ]);
    mocks.prisma.itemType.findMany.mockResolvedValue([snippet, command]);
    // One command item sits in both col-1 and col-2.
    mocks.prisma.$queryRaw.mockResolvedValue([
      { collectionId: "col-1", typeId: "type-snippet", count: 1 },
      { collectionId: "col-1", typeId: "type-command", count: 2 },
      { collectionId: "col-2", typeId: "type-command", count: 1 },
    ]);

    const cards = await getRecentCollections("user-1");

    expect(cards.map(({ id, itemCount, accentColor, types }) => ({
      id,
      itemCount,
      accentColor,
      types: types.map((type) => type.slug),
    }))).toEqual([
      { id: "col-1", itemCount: 3, accentColor: "orange", types: ["command", "snippet"] },
      { id: "col-2", itemCount: 1, accentColor: "orange", types: ["command"] },
      { id: "col-3", itemCount: 0, accentColor: "green", types: [] },
    ]);
  });
});

describe("getCollectionsPage", () => {
  it("fetches one page of the user's collections with the user's total", async () => {
    mocks.prisma.collection.findMany.mockResolvedValue([created]);
    mocks.prisma.collection.count.mockResolvedValue(43);
    mocks.prisma.itemType.findMany.mockResolvedValue([]);
    mocks.prisma.$queryRaw.mockResolvedValue([]);

    const { rows, total } = await getCollectionsPage("user-1", 3);

    expect(mocks.prisma.collection.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1" },
        skip: 2 * COLLECTIONS_PER_PAGE,
        take: COLLECTIONS_PER_PAGE,
      }),
    );
    expect(mocks.prisma.collection.count).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
    expect(rows.map((row) => row.id)).toEqual(["col-1"]);
    expect(total).toBe(43);
  });
});

describe("getCollectionBySlug", () => {
  it("scopes the lookup to both the slug and the owner", async () => {
    mocks.prisma.collection.findFirst.mockResolvedValue(created);

    await expect(getCollectionBySlug("user-1", "react-patterns")).resolves.toBe(
      created,
    );
    expect(mocks.prisma.collection.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1", slug: "react-patterns" },
      }),
    );
  });

  it("returns null when the user has no collection with that slug", async () => {
    mocks.prisma.collection.findFirst.mockResolvedValue(null);

    await expect(getCollectionBySlug("user-1", "missing")).resolves.toBeNull();
  });
});

describe("getFavoriteCollections", () => {
  it("lists only the owner's favorites, newest first, counting only their items", async () => {
    mocks.prisma.collection.findMany.mockResolvedValue([]);

    await getFavoriteCollections("user-1");

    const [args] = mocks.prisma.collection.findMany.mock.calls[0];
    expect(args.where).toEqual({ userId: "user-1", isFavorite: true });
    expect(args.orderBy).toEqual([{ updatedAt: "desc" }, { id: "asc" }]);
    expect(args.select._count).toEqual({
      select: { items: { where: { item: { userId: "user-1" } } } },
    });
  });

  it("flattens the relation count into itemCount", async () => {
    const updatedAt = new Date("2026-09-25T10:00:00Z");
    mocks.prisma.collection.findMany.mockResolvedValue([
      {
        id: "col-1",
        name: "React Patterns",
        slug: "react-patterns",
        updatedAt,
        _count: { items: 4 },
      },
    ]);

    await expect(getFavoriteCollections("user-1")).resolves.toEqual([
      {
        id: "col-1",
        name: "React Patterns",
        slug: "react-patterns",
        updatedAt,
        itemCount: 4,
      },
    ]);
  });
});

describe("getCollectionStats", () => {
  it("counts only the user's collections", async () => {
    mocks.prisma.collection.count.mockResolvedValueOnce(3).mockResolvedValueOnce(1);

    const stats = await getCollectionStats("user-1");

    expect(stats).toEqual({ collectionCount: 3, favoriteCollectionCount: 1 });
    expect(mocks.prisma.collection.count).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
    expect(mocks.prisma.collection.count).toHaveBeenCalledWith({
      where: { userId: "user-1", isFavorite: true },
    });
  });
});

describe("createCollection", () => {
  const data = { name: "React Patterns", description: null };

  it("creates the collection for the user with a slug from its name", async () => {
    mocks.prisma.collection.findMany.mockResolvedValue([]);
    mocks.prisma.collection.create.mockResolvedValue(created);

    const collection = await createCollection("user-1", data);

    expect(collection).toBe(created);
    expect(mocks.prisma.collection.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1", slug: { startsWith: "react-patterns" } },
      select: { slug: true },
    });
    expect(mocks.prisma.collection.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          userId: "user-1",
          slug: "react-patterns",
          name: "React Patterns",
          description: null,
        },
      }),
    );
  });

  it("numbers the slug past the user's existing ones", async () => {
    mocks.prisma.collection.findMany.mockResolvedValue([
      { slug: "react-patterns" },
      { slug: "react-patterns-2" },
      { slug: "react-patterns-old" },
    ]);
    mocks.prisma.collection.create.mockResolvedValue(created);

    await createCollection("user-1", data);

    expect(mocks.prisma.collection.create.mock.calls[0][0].data.slug).toBe(
      "react-patterns-3",
    );
  });

  it("picks again after losing a race for the slug", async () => {
    mocks.prisma.collection.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ slug: "react-patterns" }]);
    mocks.prisma.collection.create
      .mockRejectedValueOnce(uniqueViolation())
      .mockResolvedValueOnce(created);

    await createCollection("user-1", data);

    const slugs = mocks.prisma.collection.create.mock.calls.map(
      ([args]) => args.data.slug,
    );
    expect(slugs).toEqual(["react-patterns", "react-patterns-2"]);
  });

  it("gives up after repeated clashes", async () => {
    mocks.prisma.collection.findMany.mockResolvedValue([]);
    mocks.prisma.collection.create.mockRejectedValue(uniqueViolation());

    await expect(createCollection("user-1", data)).rejects.toMatchObject({
      code: "P2002",
    });
    expect(mocks.prisma.collection.create).toHaveBeenCalledTimes(3);
  });

  it("does not retry any other database error", async () => {
    mocks.prisma.collection.findMany.mockResolvedValue([]);
    mocks.prisma.collection.create.mockRejectedValue(new Error("connection lost"));

    await expect(createCollection("user-1", data)).rejects.toThrow("connection lost");
    expect(mocks.prisma.collection.create).toHaveBeenCalledTimes(1);
  });
});

describe("updateCollection", () => {
  const data = { name: "React Hooks", description: "Custom hooks" };

  function notFoundOnWrite() {
    return Object.assign(new Error("Record not found"), { code: "P2025" });
  }

  it("returns null without writing when the user has no such collection", async () => {
    mocks.prisma.collection.findFirst.mockResolvedValue(null);

    await expect(updateCollection("user-1", "col-1", data)).resolves.toBeNull();
    expect(mocks.prisma.collection.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "col-1", userId: "user-1" } }),
    );
    expect(mocks.prisma.collection.update).not.toHaveBeenCalled();
  });

  it("scopes the write to the owner and moves the slug to the new name", async () => {
    mocks.prisma.collection.findFirst.mockResolvedValue({ slug: "react-patterns" });
    mocks.prisma.collection.findMany.mockResolvedValue([{ slug: "react-hooks" }]);
    mocks.prisma.collection.update.mockResolvedValue(created);

    await expect(updateCollection("user-1", "col-1", data)).resolves.toBe(created);

    // The collection's own row is left out of the clash check.
    expect(mocks.prisma.collection.findMany).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        slug: { startsWith: "react-hooks" },
        id: { not: "col-1" },
      },
      select: { slug: true },
    });
    expect(mocks.prisma.collection.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "col-1", userId: "user-1" },
        data: { slug: "react-hooks-2", name: "React Hooks", description: "Custom hooks" },
      }),
    );
  });

  it("keeps a numbered slug when the name is unchanged", async () => {
    mocks.prisma.collection.findFirst.mockResolvedValue({ slug: "react-patterns-2" });
    mocks.prisma.collection.update.mockResolvedValue(created);

    await updateCollection("user-1", "col-1", {
      name: "React Patterns",
      description: null,
    });

    expect(mocks.prisma.collection.findMany).not.toHaveBeenCalled();
    expect(mocks.prisma.collection.update.mock.calls[0][0].data.slug).toBe(
      "react-patterns-2",
    );
  });

  it("picks again after losing a race for the slug", async () => {
    mocks.prisma.collection.findFirst.mockResolvedValue({ slug: "react-patterns" });
    mocks.prisma.collection.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ slug: "react-hooks" }]);
    mocks.prisma.collection.update
      .mockRejectedValueOnce(uniqueViolation())
      .mockResolvedValueOnce(created);

    await updateCollection("user-1", "col-1", data);

    const slugs = mocks.prisma.collection.update.mock.calls.map(
      ([args]) => args.data.slug,
    );
    expect(slugs).toEqual(["react-hooks", "react-hooks-2"]);
  });

  it("returns null when the collection is deleted before the write", async () => {
    mocks.prisma.collection.findFirst.mockResolvedValue({ slug: "react-patterns" });
    mocks.prisma.collection.findMany.mockResolvedValue([]);
    mocks.prisma.collection.update.mockRejectedValue(notFoundOnWrite());

    await expect(updateCollection("user-1", "col-1", data)).resolves.toBeNull();
  });

  it("rethrows any other database error", async () => {
    mocks.prisma.collection.findFirst.mockResolvedValue({ slug: "react-patterns" });
    mocks.prisma.collection.findMany.mockResolvedValue([]);
    mocks.prisma.collection.update.mockRejectedValue(new Error("connection lost"));

    await expect(updateCollection("user-1", "col-1", data)).rejects.toThrow(
      "connection lost",
    );
  });
});

describe("deleteCollection", () => {
  it("deletes only the owner's collection", async () => {
    mocks.prisma.collection.deleteMany.mockResolvedValue({ count: 1 });

    await expect(deleteCollection("user-1", "col-1")).resolves.toBe(true);
    expect(mocks.prisma.collection.deleteMany).toHaveBeenCalledWith({
      where: { id: "col-1", userId: "user-1" },
    });
  });

  it("reports a missing or foreign collection", async () => {
    mocks.prisma.collection.deleteMany.mockResolvedValue({ count: 0 });

    await expect(deleteCollection("user-1", "col-2")).resolves.toBe(false);
  });
});

describe("setCollectionFavorite", () => {
  it("writes only the owner's collection and returns the stored state", async () => {
    mocks.prisma.collection.update.mockResolvedValue({ isFavorite: true });

    await expect(setCollectionFavorite("user-1", "col-1", true)).resolves.toEqual({
      isFavorite: true,
    });
    expect(mocks.prisma.collection.update).toHaveBeenCalledWith({
      where: { id: "col-1", userId: "user-1" },
      data: { isFavorite: true },
      select: { isFavorite: true },
    });
  });

  it("returns null for a missing or foreign collection", async () => {
    mocks.prisma.collection.update.mockRejectedValue(
      Object.assign(new Error("Record not found"), { code: "P2025" }),
    );

    await expect(setCollectionFavorite("user-1", "col-2", false)).resolves.toBeNull();
  });

  it("rethrows any other database error", async () => {
    mocks.prisma.collection.update.mockRejectedValue(new Error("connection lost"));

    await expect(setCollectionFavorite("user-1", "col-1", true)).rejects.toThrow(
      "connection lost",
    );
  });
});
