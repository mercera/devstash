/**
 * Prisma-backed item queries for the dashboard.
 *
 * The list and count queries are still scoped to the seeded demo user (see
 * `prisma/seed.ts`) until reads move onto the session. `getItemById`,
 * `getItemsByCollection`, `getSearchItems`, `createItem`, `updateItem` and
 * `deleteItem` are the exceptions: they take the caller's user id, because they
 * back an API route, server actions, the collection pages and the command
 * palette, none of which may reach another user's item.
 */

import { cache } from "react";

import type { Prisma } from "@/generated/prisma/client";
import type { ItemGetPayload } from "@/generated/prisma/models";
import { CollectionNotFoundError } from "@/lib/db/errors";
import { ITEMS_PER_PAGE, getPageRange } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { toSearchPreview } from "@/lib/search";
import type { CreateItemData, UpdateItemData } from "@/lib/validations/items";
import type {
  ItemDetail,
  ItemType,
  ItemTypeWithCount,
  ItemWithRelations,
  Paginated,
  SearchItem,
} from "@/types";

const DEMO_USER_ID = "seed-user-demo";

/**
 * Everything `ItemCard` needs: the item's type (icon + accent color) and the
 * tag names behind the `Tag`/`ItemTag` join.
 *
 * The item's collections are deliberately not joined — no card renders them.
 */
const itemInclude = {
  type: true,
  tags: {
    include: { tag: true },
    orderBy: { tag: { name: "asc" } },
  },
} as const;

type ItemRow = ItemGetPayload<{ include: typeof itemInclude }>;

/** Flattens the tag join and drops `userId`, matching the UI's `Item` shape. */
function toItemWithRelations(item: ItemRow): ItemWithRelations {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    contentType: item.contentType,
    content: item.content,
    fileUrl: item.fileUrl,
    fileName: item.fileName,
    fileSize: item.fileSize,
    url: item.url,
    language: item.language,
    isFavorite: item.isFavorite,
    isPinned: item.isPinned,
    typeId: item.typeId,
    tags: item.tags.map(({ tag }) => tag.name),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    type: item.type,
  };
}

/** The card include plus the item's collections, by name, for the detail drawer. */
const itemDetailInclude = {
  ...itemInclude,
  collections: {
    select: { collection: { select: { id: true, name: true, slug: true } } },
    orderBy: { collection: { name: "asc" } },
  },
} as const;

/**
 * One item with everything the detail drawer renders, or null when no item
 * with that id belongs to `userId`.
 *
 * Ownership is part of the lookup rather than checked afterwards, so another
 * user's item is indistinguishable from one that does not exist.
 */
export async function getItemById(
  id: string,
  userId: string,
): Promise<ItemDetail | null> {
  const item = await prisma.item.findFirst({
    where: { id, userId },
    include: itemDetailInclude,
  });

  if (item === null) return null;

  return {
    ...toItemWithRelations(item),
    collections: item.collections.map(({ collection }) => collection),
  };
}

/**
 * Links an item to the given collections, all of which must be `userId`'s.
 *
 * Ownership is checked against the database inside the transaction, so a
 * crafted request cannot put an item into another user's collection. An id
 * that is unknown or foreign throws `CollectionNotFoundError`, rolling back
 * the whole write rather than linking the rest. Expects the item to have no
 * `ItemCollection` rows yet.
 */
async function linkCollections(
  tx: Prisma.TransactionClient,
  itemId: string,
  userId: string,
  collectionIds: string[],
): Promise<void> {
  if (collectionIds.length === 0) return;

  const owned = await tx.collection.findMany({
    where: { id: { in: collectionIds }, userId },
    select: { id: true },
  });

  if (owned.length !== collectionIds.length) {
    throw new CollectionNotFoundError();
  }

  await tx.itemCollection.createMany({
    data: owned.map((collection) => ({ itemId, collectionId: collection.id })),
  });
}

/**
 * Links an item to the named tags, creating any the user does not have yet.
 *
 * Batched, so the round trips stay the same however many tags there are.
 * Expects the item to have no `ItemTag` rows for these tags already.
 */
async function linkTags(
  tx: Prisma.TransactionClient,
  itemId: string,
  userId: string,
  tags: string[],
): Promise<void> {
  if (tags.length === 0) return;

  await tx.tag.createMany({
    data: tags.map((name) => ({ userId, name })),
    skipDuplicates: true,
  });

  const tagRows = await tx.tag.findMany({
    where: { userId, name: { in: tags } },
    select: { id: true },
  });

  await tx.itemTag.createMany({
    data: tagRows.map((tag) => ({ itemId, tagId: tag.id })),
  });
}

/**
 * Creates an item of one of the system types for `userId` and returns its
 * detail, or null when no system type has that slug.
 *
 * The type is resolved by slug before the transaction, keeping the
 * transaction to the writes. System types only: custom types do not exist yet.
 * The item, its tags and its collections are written together, and the result
 * is read back after the commit, as in `updateItem`. Throws
 * `CollectionNotFoundError` when a collection id is not the user's.
 */
export async function createItem(
  userId: string,
  data: CreateItemData,
): Promise<ItemDetail | null> {
  const { typeSlug, tags, collectionIds, ...fields } = data;

  const type = await prisma.itemType.findFirst({
    where: { slug: typeSlug, isSystem: true },
    select: { id: true },
  });

  if (type === null) return null;

  const itemId = await prisma.$transaction(async (tx) => {
    const item = await tx.item.create({
      data: { ...fields, userId, typeId: type.id },
      select: { id: true },
    });

    await linkTags(tx, item.id, userId, tags);
    await linkCollections(tx, item.id, userId, collectionIds);

    return item.id;
  });

  return getItemById(itemId, userId);
}

/**
 * Applies the drawer's edits to one of `userId`'s items and returns the updated
 * detail, or null when no item with that id belongs to `userId`.
 *
 * The item's tags are replaced wholesale: every `ItemTag` row is dropped, the
 * named tags are created where the user does not have them yet, and the item is
 * linked to each. Runs in one transaction so a failure part-way cannot leave the
 * item with its tags stripped. Tags no item uses any more are left in place.
 * The item's collections are replaced the same way, and a collection id that is
 * not the user's throws `CollectionNotFoundError` and rolls the edit back.
 *
 * The steps are explicit rather than one nested write so their order is not
 * left to Prisma.
 *
 * The updated item is read back after the commit, not inside the transaction.
 * That read is five more sequential statements, and at Neon round-trip
 * latency keeping them inside pushed the transaction to ~4s, close to
 * Prisma's 5s interactive-transaction timeout.
 */
export async function updateItem(
  id: string,
  userId: string,
  data: UpdateItemData,
): Promise<ItemDetail | null> {
  const { tags, collectionIds, ...fields } = data;

  const updated = await prisma.$transaction(async (tx) => {
    // Ownership is part of the write, as in `getItemById`.
    const { count } = await tx.item.updateMany({
      where: { id, userId },
      data: fields,
    });

    if (count === 0) return false;

    await tx.itemTag.deleteMany({ where: { itemId: id } });
    await linkTags(tx, id, userId, tags);

    await tx.itemCollection.deleteMany({ where: { itemId: id } });
    await linkCollections(tx, id, userId, collectionIds);

    return true;
  });

  return updated ? getItemById(id, userId) : null;
}

/**
 * Deletes one of `userId`'s items and returns its stored `fileUrl` (null for a
 * text item), so the caller can remove the upload behind it. Returns
 * `{ deleted: false }` when no item with that id belongs to `userId`.
 *
 * Ownership is part of both statements, as in `getItemById`. The item's
 * `ItemTag` rows cascade with it; the tags themselves stay, as they do after an
 * edit. The file URL is read first because `deleteMany` returns only a count.
 */
export async function deleteItem(
  id: string,
  userId: string,
): Promise<{ deleted: false } | { deleted: true; fileUrl: string | null }> {
  const item = await prisma.item.findFirst({
    where: { id, userId },
    select: { fileUrl: true },
  });

  if (item === null) return { deleted: false };

  const { count } = await prisma.item.deleteMany({ where: { id, userId } });

  return count > 0 ? { deleted: true, fileUrl: item.fileUrl } : { deleted: false };
}

/**
 * Whether any item stores this file URL. The upload route checks it before
 * discarding an upload, so an object already backing an item is never removed
 * out from under it.
 */
export async function isFileUrlInUse(fileUrl: string): Promise<boolean> {
  const count = await prisma.item.count({ where: { fileUrl } });

  return count > 0;
}

/** Pinned items for the dashboard's "Pinned" section, most recently updated first. */
export async function getPinnedItems(): Promise<ItemWithRelations[]> {
  const items = await prisma.item.findMany({
    where: { userId: DEMO_USER_ID, isPinned: true },
    orderBy: { updatedAt: "desc" },
    include: itemInclude,
  });

  return items.map(toItemWithRelations);
}

/** Most recently updated items for the dashboard's "Recent" section. */
export async function getRecentItems(limit = 6): Promise<ItemWithRelations[]> {
  const items = await prisma.item.findMany({
    where: { userId: DEMO_USER_ID },
    orderBy: { updatedAt: "desc" },
    take: limit,
    include: itemInclude,
  });

  return items.map(toItemWithRelations);
}

/**
 * One page of `where`'s items, most recently updated first, with the total.
 *
 * The page and the count run side by side, so a page costs one round trip.
 * `id` breaks ties on `updatedAt`, so rows with the same timestamp cannot
 * swap between pages from one request to the next.
 */
async function getItemsPage(
  where: Prisma.ItemWhereInput,
  page: number,
): Promise<Paginated<ItemWithRelations>> {
  const [items, total] = await Promise.all([
    prisma.item.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      ...getPageRange(page, ITEMS_PER_PAGE),
      include: itemInclude,
    }),
    prisma.item.count({ where }),
  ]);

  return { rows: items.map(toItemWithRelations), total };
}

/**
 * One page of the user's items in one collection, most recently updated first.
 *
 * Scoped to `userId` on the item as well as through the caller's collection
 * lookup, so a link to another user's item can never surface here.
 */
export async function getItemsByCollection(
  userId: string,
  collectionId: string,
  page: number,
): Promise<Paginated<ItemWithRelations>> {
  return getItemsPage(
    { userId, collections: { some: { collectionId } } },
    page,
  );
}

/**
 * Every one of the user's items in the slim shape the command palette
 * searches, most recently updated first.
 *
 * Loaded with the app shell on every request, so only the fields the palette
 * shows are selected and the preview is cut short here — the payload that
 * crosses to the client stays bounded per item. The full content still has to
 * be read, since Prisma cannot truncate a column in a `select`.
 */
export async function getSearchItems(userId: string): Promise<SearchItem[]> {
  const items = await prisma.item.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      content: true,
      url: true,
      fileName: true,
      description: true,
      type: { select: { name: true, icon: true, color: true } },
    },
  });

  return items.map((item) => ({
    id: item.id,
    title: item.title,
    type: item.type,
    preview: toSearchPreview(item),
  }));
}

/**
 * The item type with this slug, or null when no type the user can see has it.
 *
 * Looked up on its own rather than by filtering items through the relation
 * (`type: { slug }`): a slug is unique only per owner, so a filter could match
 * a system type and a same-slug custom type at once, and an unknown slug must
 * be told apart from a known type with no items.
 */
export async function getItemTypeBySlug(slug: string): Promise<ItemType | null> {
  return prisma.itemType.findFirst({
    where: { slug, OR: [{ isSystem: true }, { userId: DEMO_USER_ID }] },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      icon: true,
      color: true,
      isSystem: true,
    },
  });
}

/** One page of the user's items of one type, most recently updated first. */
export async function getItemsByType(
  typeId: string,
  page: number,
): Promise<Paginated<ItemWithRelations>> {
  return getItemsPage({ userId: DEMO_USER_ID, typeId }, page);
}

/**
 * Item types for the sidebar, in seeded order, each with the number of items
 * the user has of that type.
 *
 * System types are shared by every user (`userId` is null on them), so the
 * count has to be filtered to this user rather than counting the relation.
 *
 * Memoised per request: the app layout and a type's page both need the list.
 */
export const getItemTypesWithCounts = cache(async (): Promise<
  ItemTypeWithCount[]
> => {
  const types = await prisma.itemType.findMany({
    where: { OR: [{ isSystem: true }, { userId: DEMO_USER_ID }] },
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { items: { where: { userId: DEMO_USER_ID } } } },
    },
  });

  return types.map((type) => ({
    id: type.id,
    name: type.name,
    slug: type.slug,
    icon: type.icon,
    color: type.color,
    isSystem: type.isSystem,
    itemCount: type._count.items,
  }));
});

/** Item counts for the dashboard stat cards. */
export async function getItemStats(): Promise<{
  itemCount: number;
  favoriteItemCount: number;
}> {
  const [itemCount, favoriteItemCount] = await Promise.all([
    prisma.item.count({ where: { userId: DEMO_USER_ID } }),
    prisma.item.count({ where: { userId: DEMO_USER_ID, isFavorite: true } }),
  ]);

  return { itemCount, favoriteItemCount };
}
