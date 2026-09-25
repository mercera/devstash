import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The database is mocked, so these tests pin who each query is scoped to and
 * how `createCollection` picks a slug — not Postgres behaviour.
 */

const mocks = vi.hoisted(() => ({
  prisma: {
    collection: { findMany: vi.fn(), count: vi.fn(), create: vi.fn() },
    itemType: { findMany: vi.fn() },
    item: { groupBy: vi.fn() },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));

import {
  createCollection,
  getCollectionStats,
  getRecentCollections,
} from "@/lib/db/collections";

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
    mocks.prisma.item.groupBy.mockResolvedValue([]);

    await getRecentCollections("user-1", 6);

    expect(mocks.prisma.collection.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1" }, take: 6 }),
    );
    expect(mocks.prisma.itemType.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { OR: [{ isSystem: true }, { userId: "user-1" }] },
      }),
    );
    expect(mocks.prisma.item.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1", collectionId: { not: null } },
      }),
    );
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
