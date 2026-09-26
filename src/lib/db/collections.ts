/**
 * Prisma-backed collection queries.
 *
 * Every query is scoped to a caller-supplied user — the signed-in one, resolved
 * from the session by the page or action. The item getters in `items.ts` are
 * still scoped to the seeded demo user.
 */

import { isRecordNotFoundError, isUniqueConstraintError } from "@/lib/db/errors";
import { COLLECTIONS_PER_PAGE, getPageRange } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { isSlugFor, slugify, uniqueSlug } from "@/lib/slug";
import type {
  CreateCollectionData,
  UpdateCollectionData,
} from "@/lib/validations/collections";
import type {
  Collection,
  CollectionCardData,
  FavoriteCollection,
  ItemType,
  Paginated,
} from "@/types";

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

/** How many of a collection's items are of one type. */
interface CollectionTypeCount {
  collectionId: string;
  typeId: string;
  count: number;
}

/**
 * The user's items counted per collection and type, through the
 * `ItemCollection` join. Raw SQL because Prisma's `groupBy` cannot group by a
 * column of a related model (`Item.typeId`), and the alternative — loading
 * every link with its item — grows with the user's item count. An item in two
 * collections counts once in each.
 */
function countItemsByCollectionAndType(
  userId: string,
): Promise<CollectionTypeCount[]> {
  return prisma.$queryRaw<CollectionTypeCount[]>`
    SELECT ic."collectionId", i."typeId", COUNT(*)::int AS "count"
    FROM "ItemCollection" ic
    JOIN "Item" i ON i."id" = ic."itemId"
    WHERE i."userId" = ${userId}
    GROUP BY ic."collectionId", i."typeId"
  `;
}

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
  rows: CollectionTypeCount[],
  types: ItemType[],
): Map<string, TypeTally[]> {
  const typeById = new Map(
    types.map((type, order) => [type.id, { type, order }] as const),
  );
  const byCollection = new Map<string, TypeTally[]>();

  for (const row of rows) {
    const entry = typeById.get(row.typeId);
    if (entry === undefined) continue;

    const tallies = byCollection.get(row.collectionId) ?? [];
    tallies.push({ type: entry.type, count: row.count, order: entry.order });
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
 * The per-type counts come from a grouped aggregate rather than loading the
 * items themselves: the result is bounded by collections × types, where
 * joining `items` grew with the user's total item count on every request.
 */
export async function getRecentCollections(
  userId: string,
  limit?: number,
): Promise<CollectionCardData[]> {
  return getCollectionCards(userId, { take: limit });
}

/**
 * One page of the user's collections for `/collections`, built the same way as
 * `getRecentCollections`, with the total for the pagination controls.
 */
export async function getCollectionsPage(
  userId: string,
  page: number,
): Promise<Paginated<CollectionCardData>> {
  const [rows, total] = await Promise.all([
    getCollectionCards(userId, getPageRange(page, COLLECTIONS_PER_PAGE)),
    prisma.collection.count({ where: { userId } }),
  ]);

  return { rows, total };
}

/**
 * A slice of the user's collections as cards, most recently updated first.
 * `id` breaks ties on `updatedAt`, so a page boundary cannot fall differently
 * between requests.
 *
 * The per-type counts cover every collection, not just the slice. Filtering
 * them to the slice's ids would make the aggregate wait on the collections
 * query, and its result is bounded by collections × types either way.
 */
async function getCollectionCards(
  userId: string,
  range: { skip?: number; take?: number },
): Promise<CollectionCardData[]> {
  const [collections, types, typeCounts] = await Promise.all([
    prisma.collection.findMany({
      where: { userId },
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      ...range,
    }),
    prisma.itemType.findMany({
      where: { OR: [{ isSystem: true }, { userId }] },
      orderBy: { createdAt: "asc" },
      select: itemTypeSelect,
    }),
    countItemsByCollectionAndType(userId),
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

/**
 * One of the user's collections, by slug, or null when the user has none with
 * that slug. Another user's collection is indistinguishable from a missing one.
 */
export async function getCollectionBySlug(
  userId: string,
  slug: string,
): Promise<Collection | null> {
  return prisma.collection.findFirst({
    where: { userId, slug },
    select: collectionSelect,
  });
}

/**
 * Every one of the user's favorited collections, most recently updated first,
 * each with how many of the user's items it holds. `id` breaks ties on
 * `updatedAt`, as the paged lists do.
 */
export async function getFavoriteCollections(
  userId: string,
): Promise<FavoriteCollection[]> {
  const collections = await prisma.collection.findMany({
    where: { userId, isFavorite: true },
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      updatedAt: true,
      _count: { select: { items: { where: { item: { userId } } } } },
    },
  });

  return collections.map(({ _count, ...collection }) => ({
    ...collection,
    itemCount: _count.items,
  }));
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
    const slug = await pickFreeSlug(userId, base);

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

/**
 * The first free slug for `base` among the user's collections, leaving out
 * `excludeId` — the collection being renamed, whose own slug is not a clash.
 */
async function pickFreeSlug(
  userId: string,
  base: string,
  excludeId?: string,
): Promise<string> {
  const existing = await prisma.collection.findMany({
    where: {
      userId,
      slug: { startsWith: base },
      ...(excludeId && { id: { not: excludeId } }),
    },
    select: { slug: true },
  });

  return uniqueSlug(base, new Set(existing.map((row) => row.slug)));
}

/**
 * Updates one of the user's collections and returns it, or null when the user
 * has no collection with that id.
 *
 * The slug follows the name: a rename picks a new one the same way a create
 * does, while a save that leaves the name alone keeps the current slug. Like
 * `createCollection`, a lost race on the unique index re-picks.
 */
export async function updateCollection(
  userId: string,
  id: string,
  data: UpdateCollectionData,
): Promise<Collection | null> {
  const current = await prisma.collection.findFirst({
    where: { id, userId },
    select: { slug: true },
  });

  if (current === null) return null;

  const base = slugify(data.name);

  for (let attempt = 1; ; attempt += 1) {
    const slug = isSlugFor(current.slug, base)
      ? current.slug
      : await pickFreeSlug(userId, base, id);

    try {
      return await prisma.collection.update({
        where: { id, userId },
        data: { slug, name: data.name, description: data.description },
        select: collectionSelect,
      });
    } catch (error) {
      // Deleted between the read and the write.
      if (isRecordNotFoundError(error)) return null;

      if (!isUniqueConstraintError(error) || attempt >= MAX_SLUG_ATTEMPTS) {
        throw error;
      }
    }
  }
}

/**
 * Deletes one of the user's collections, returning whether a row went. Its
 * items are not touched: `ItemCollection` cascades from `Collection`, so only
 * the links go.
 */
export async function deleteCollection(
  userId: string,
  id: string,
): Promise<boolean> {
  const { count } = await prisma.collection.deleteMany({
    where: { id, userId },
  });

  return count > 0;
}
