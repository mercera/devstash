/**
 * Prisma-backed collection queries for the dashboard.
 *
 * No auth/session exists yet, so every query here is scoped to the seeded
 * demo user (see `prisma/seed.ts`) until real sessions land.
 */

import { prisma } from "@/lib/prisma";
import type { CollectionCardData, ItemType } from "@/types";

const DEMO_USER_ID = "seed-user-demo";

/** The columns of `ItemType` the UI renders — nothing else crosses to the client. */
const itemTypeSelect = {
  id: true,
  name: true,
  slug: true,
  icon: true,
  color: true,
  isSystem: true,
} as const;

/** A type tally for one collection. `order` is the tie-break, not rendered. */
interface TypeTally {
  type: ItemType;
  count: number;
  order: number;
}

/**
 * Buckets the `groupBy` rows by collection, most-used type first. Equal counts
 * fall back to `order` — the seeded item-type order — so a card's icon row is
 * stable between requests rather than following whatever order Postgres
 * happened to return the groups in.
 */
function tallyTypesByCollection(
  rows: { collectionId: string | null; typeId: string; _count: number }[],
  types: ItemType[],
): Map<string, TypeTally[]> {
  const typeById = new Map(
    types.map((type, order) => [type.id, { type, order }] as const),
  );
  const byCollection = new Map<string, TypeTally[]>();

  for (const row of rows) {
    const entry = typeById.get(row.typeId);
    if (row.collectionId === null || entry === undefined) continue;

    const tallies = byCollection.get(row.collectionId) ?? [];
    tallies.push({ type: entry.type, count: row._count, order: entry.order });
    byCollection.set(row.collectionId, tallies);
  }

  for (const tallies of byCollection.values()) {
    tallies.sort((a, b) => b.count - a.count || a.order - b.order);
  }

  return byCollection;
}

/**
 * Recent collections, most recently updated first — the dashboard grid takes
 * a limit, the sidebar omits it to list them all.
 *
 * Each collection's accent color and type icons are derived from its items
 * (the most-used item type wins the accent) rather than the collection's own
 * stored `color`, so a collection falls back to that stored color only when
 * it has no items yet.
 *
 * The per-type counts come from a `groupBy` aggregate rather than loading the
 * items themselves: the result is bounded by collections × types, where
 * joining `items` grew with the user's total item count on every request.
 */
export async function getRecentCollections(
  limit?: number,
): Promise<CollectionCardData[]> {
  const [collections, types, typeCounts] = await Promise.all([
    prisma.collection.findMany({
      where: { userId: DEMO_USER_ID },
      orderBy: { updatedAt: "desc" },
      take: limit,
    }),
    prisma.itemType.findMany({
      where: { OR: [{ isSystem: true }, { userId: DEMO_USER_ID }] },
      orderBy: { createdAt: "asc" },
      select: itemTypeSelect,
    }),
    prisma.item.groupBy({
      by: ["collectionId", "typeId"],
      where: { userId: DEMO_USER_ID, collectionId: { not: null } },
      _count: true,
    }),
  ]);

  const byCollection = tallyTypesByCollection(typeCounts, types);

  return collections.map((collection) => {
    const tallies = byCollection.get(collection.id) ?? [];

    return {
      id: collection.id,
      name: collection.name,
      slug: collection.slug,
      description: collection.description,
      isFavorite: collection.isFavorite,
      itemCount: tallies.reduce((total, tally) => total + tally.count, 0),
      accentColor: tallies[0]?.type.color ?? collection.color,
      types: tallies.map((tally) => tally.type),
    };
  });
}

/** Collection counts for the dashboard stat cards. */
export async function getCollectionStats(): Promise<{
  collectionCount: number;
  favoriteCollectionCount: number;
}> {
  const [collectionCount, favoriteCollectionCount] = await Promise.all([
    prisma.collection.count({ where: { userId: DEMO_USER_ID } }),
    prisma.collection.count({
      where: { userId: DEMO_USER_ID, isFavorite: true },
    }),
  ]);

  return { collectionCount, favoriteCollectionCount };
}
