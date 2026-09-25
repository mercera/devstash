/**
 * Prisma-backed collection queries.
 *
 * Every query is scoped to a caller-supplied user — the signed-in one, resolved
 * from the session by the page or action. The item getters in `items.ts` are
 * still scoped to the seeded demo user.
 */

import { isUniqueConstraintError } from "@/lib/db/errors";
import { prisma } from "@/lib/prisma";
import { slugify, uniqueSlug } from "@/lib/slug";
import type { CreateCollectionData } from "@/lib/validations/collections";
import type { Collection, CollectionCardData, ItemType } from "@/types";

/**
 * How many times a create re-picks its slug after losing a race to another
 * create of the same name. More than one clash in a row is not a race.
 */
const MAX_SLUG_ATTEMPTS = 3;

const collectionSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  color: true,
  isFavorite: true,
  createdAt: true,
  updatedAt: true,
} as const;

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
  userId: string,
  limit?: number,
): Promise<CollectionCardData[]> {
  const [collections, types, typeCounts] = await Promise.all([
    prisma.collection.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: limit,
    }),
    prisma.itemType.findMany({
      where: { OR: [{ isSystem: true }, { userId }] },
      orderBy: { createdAt: "asc" },
      select: itemTypeSelect,
    }),
    prisma.item.groupBy({
      by: ["collectionId", "typeId"],
      where: { userId, collectionId: { not: null } },
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
export async function getCollectionStats(userId: string): Promise<{
  collectionCount: number;
  favoriteCollectionCount: number;
}> {
  const [collectionCount, favoriteCollectionCount] = await Promise.all([
    prisma.collection.count({ where: { userId } }),
    prisma.collection.count({ where: { userId, isFavorite: true } }),
  ]);

  return { collectionCount, favoriteCollectionCount };
}

/**
 * Creates a collection for `userId`, with a slug built from its name that is
 * unique among that user's collections (`react-patterns`, then
 * `react-patterns-2`, …).
 *
 * The free slug is picked by reading the user's existing ones, so two creates
 * of the same name at once can pick the same slug. The unique index decides;
 * the loser re-reads and picks again rather than failing.
 */
export async function createCollection(
  userId: string,
  data: CreateCollectionData,
): Promise<Collection> {
  const base = slugify(data.name);

  for (let attempt = 1; ; attempt += 1) {
    const existing = await prisma.collection.findMany({
      where: { userId, slug: { startsWith: base } },
      select: { slug: true },
    });
    const slug = uniqueSlug(base, new Set(existing.map((row) => row.slug)));

    try {
      return await prisma.collection.create({
        data: { userId, slug, name: data.name, description: data.description },
        select: collectionSelect,
      });
    } catch (error) {
      if (!isUniqueConstraintError(error) || attempt >= MAX_SLUG_ATTEMPTS) {
        throw error;
      }
    }
  }
}
