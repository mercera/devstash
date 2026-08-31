/**
 * Prisma-backed item queries for the dashboard.
 *
 * No auth/session exists yet, so every query here is scoped to the seeded
 * demo user (see `prisma/seed.ts`) until real sessions land.
 */

import type { ItemGetPayload } from "@/generated/prisma/models";
import { prisma } from "@/lib/prisma";
import type { ItemTypeWithCount, ItemWithRelations } from "@/types";

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
