/**
 * Prisma-backed collection queries for the dashboard.
 *
 * No auth/session exists yet, so every query here is scoped to the seeded
 * demo user (see `prisma/seed.ts`) until real sessions land.
 */

import { prisma } from "@/lib/prisma";
import type { CollectionCardData, ItemType } from "@/types";

const DEMO_USER_ID = "seed-user-demo";

/**
 * Recent collections, most recently updated first — the dashboard grid takes
 * a limit, the sidebar omits it to list them all.
 *
 * Each collection's accent color and type icons are derived from its items
 * (the most-used item type wins the accent) rather than the collection's own
 * stored `color`, so a collection falls back to that stored color only when
 * it has no items yet.
 */
export async function getRecentCollections(
  limit?: number,
): Promise<CollectionCardData[]> {
  const collections = await prisma.collection.findMany({
    where: { userId: DEMO_USER_ID },
    orderBy: { updatedAt: "desc" },
    take: limit,
    include: {
      items: {
        select: { type: true },
      },
    },
  });

  return collections.map((collection) => {
    const typeCounts = new Map<string, { type: ItemType; count: number }>();
    for (const { type } of collection.items) {
      const entry = typeCounts.get(type.id);
      if (entry) entry.count += 1;
      else typeCounts.set(type.id, { type, count: 1 });
    }

    const types = [...typeCounts.values()].sort((a, b) => b.count - a.count);

    return {
      id: collection.id,
      name: collection.name,
      slug: collection.slug,
      description: collection.description,
      isFavorite: collection.isFavorite,
      itemCount: collection.items.length,
      accentColor: types[0]?.type.color ?? collection.color,
      types: types.map((entry) => entry.type),
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
