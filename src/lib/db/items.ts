/**
 * Prisma-backed item queries for the dashboard.
 *
 * The list and count queries are still scoped to the seeded demo user (see
 * `prisma/seed.ts`) until reads move onto the session. `getItemById` and
 * `updateItem` are the exceptions: they take the caller's user id, because
 * they back an API route and a server action that must never reach another
 * user's item.
 */

import type { ItemGetPayload } from "@/generated/prisma/models";
import { prisma } from "@/lib/prisma";
import type { UpdateItemData } from "@/lib/validations/items";
import type {
  ItemDetail,
  ItemType,
  ItemTypeWithCount,
  ItemWithRelations,
} from "@/types";

const DEMO_USER_ID = "seed-user-demo";

/**
 * Everything `ItemCard` needs: the item's type (icon + accent color) and the
 * tag names behind the `Tag`/`ItemTag` join.
 *
 * The parent `Collection` is deliberately not joined — no card renders it, and
 * including it pulled a full collection row per item. `collectionId` is already
 * on the item for anything that needs to filter.
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
    collectionId: item.collectionId,
    tags: item.tags.map(({ tag }) => tag.name),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    type: item.type,
  };
}

/** The card include plus the parent collection, for the detail drawer. */
const itemDetailInclude = {
  ...itemInclude,
  collection: { select: { id: true, name: true, slug: true } },
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

  return { ...toItemWithRelations(item), collection: item.collection };
}

/**
 * Applies the drawer's edits to one of `userId`'s items and returns the updated
 * detail, or null when no item with that id belongs to `userId`.
 *
 * The item's tags are replaced wholesale: every `ItemTag` row is dropped, the
 * named tags are created where the user does not have them yet, and the item is
 * linked to each. Runs in one transaction so a failure part-way cannot leave the
 * item with its tags stripped. Tags no item uses any more are left in place.
 *
 * The steps are explicit rather than one nested write so their order is not
 * left to Prisma, and the tag writes are batched so the round trips stay the
 * same however many tags there are.
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
  const { tags, ...fields } = data;

  const updated = await prisma.$transaction(async (tx) => {
    // Ownership is part of the write, as in `getItemById`.
    const { count } = await tx.item.updateMany({
      where: { id, userId },
      data: fields,
    });

    if (count === 0) return false;

    await tx.itemTag.deleteMany({ where: { itemId: id } });

    if (tags.length > 0) {
      await tx.tag.createMany({
        data: tags.map((name) => ({ userId, name })),
        skipDuplicates: true,
      });

      const tagRows = await tx.tag.findMany({
        where: { userId, name: { in: tags } },
        select: { id: true },
      });

      await tx.itemTag.createMany({
        data: tagRows.map((tag) => ({ itemId: id, tagId: tag.id })),
      });
    }

    return true;
  });

  return updated ? getItemById(id, userId) : null;
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
 * One item type, looked up by slug, with all of the user's items of that type,
 * most recently updated first. Returns null when no type the user can see has
 * that slug.
 *
 * The type is resolved first rather than filtering items through the relation
 * (`type: { slug }`): a slug is unique only per owner, so a filter could match
 * a system type and a same-slug custom type at once, and an unknown slug must
 * be told apart from a known type with no items.
 */
export async function getItemsByType(
  slug: string,
): Promise<{ type: ItemType; items: ItemWithRelations[] } | null> {
  const type = await prisma.itemType.findFirst({
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

  if (type === null) return null;

  const items = await prisma.item.findMany({
    where: { userId: DEMO_USER_ID, typeId: type.id },
    orderBy: { updatedAt: "desc" },
    include: itemInclude,
  });

  return { type, items: items.map(toItemWithRelations) };
}

/**
 * Item types for the sidebar, in seeded order, each with the number of items
 * the user has of that type.
 *
 * System types are shared by every user (`userId` is null on them), so the
 * count has to be filtered to this user rather than counting the relation.
 */
export async function getItemTypesWithCounts(): Promise<ItemTypeWithCount[]> {
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
}

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
