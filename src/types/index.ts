/**
 * Core data model types.
 *
 * These mirror the Prisma draft in `context/project-overview.md` and are the
 * shapes the UI codes against until the real database lands.
 */

/** Semantic accent color name — the UI maps this to Tailwind classes. */
export type AccentColor =
  | "blue"
  | "purple"
  | "orange"
  | "yellow"
  | "green"
  | "pink"
  | "gray";

/** Text items store `content`; file items store `fileUrl`/`fileName`/`fileSize`. */
export type ContentType = "text" | "file";

export interface User {
  id: string;
  name: string;
  email: string;
  image: string | null;
  isPro: boolean;
  createdAt: Date;
}

export interface ItemType {
  id: string;
  name: string;
  /** URL-safe identifier used for filter routes, e.g. `/items?type=snippet`. */
  slug: string;
  /** lucide-react icon name. */
  icon: string;
  color: AccentColor;
  isSystem: boolean;
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: AccentColor;
  isFavorite: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Item {
  id: string;
  title: string;
  description: string | null;
  contentType: ContentType;
  content: string | null;
  fileUrl: string | null;
  fileName: string | null;
  /** Size in bytes. */
  fileSize: number | null;
  url: string | null;
  /** Syntax highlighting hint for code content, e.g. `typescript`. */
  language: string | null;
  isFavorite: boolean;
  isPinned: boolean;
  typeId: string;
  collectionId: string | null;
  /**
   * Flattened tag names. The database models these through `Tag`/`ItemTag`,
   * but the UI only ever renders the names.
   */
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

/** An item type with the number of items that belong to it. */
export interface ItemTypeWithCount extends ItemType {
  itemCount: number;
}

/** A collection with its item count and the types of items it holds. */
export interface CollectionWithCount extends Collection {
  itemCount: number;
  /** Distinct type ids present in the collection, for the icon row on cards. */
  typeIds: string[];
}

/** Headline counts for the dashboard stat cards. */
export interface DashboardStats {
  itemCount: number;
  collectionCount: number;
  favoriteItemCount: number;
  favoriteCollectionCount: number;
}

/** An item joined with its type and collection, ready to render. */
export interface ItemWithRelations extends Item {
  type: ItemType;
  collection: Collection | null;
}
