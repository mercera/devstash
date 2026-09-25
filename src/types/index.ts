/**
 * Core data model types.
 *
 * The shapes the UI codes against. The `src/lib/db/*` getters map Prisma rows
 * onto them, so components never import the generated Prisma types.
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

export interface ItemType {
  id: string;
  name: string;
  /** Singular, URL-safe identifier used in routes, e.g. `/items/snippet`. */
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

/**
 * A collection ready for the dashboard card. `accentColor` and `types` are
 * derived from the collection's items (most-used type first) rather than the
 * collection's own stored `color`.
 */
export interface CollectionCardData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isFavorite: boolean;
  itemCount: number;
  accentColor: AccentColor;
  types: ItemType[];
}

/** The signed-in user as the sidebar footer renders them. */
export interface CurrentUser {
  name: string | null;
  email: string;
  image: string | null;
}

/**
 * An item joined with its type, ready to render. Its collections are not
 * joined — no card renders them.
 */
export interface ItemWithRelations extends Item {
  type: ItemType;
}

/** A collection as the item drawer renders it, and as the item forms offer it. */
export interface ItemCollectionSummary {
  id: string;
  name: string;
  slug: string;
}

/**
 * An item with everything the detail drawer shows. Unlike the card shape, this
 * joins the item's collections (by name) — the drawer is the one place that
 * renders them.
 */
export interface ItemDetail extends ItemWithRelations {
  collections: ItemCollectionSummary[];
}

/**
 * The signed-in user as the profile page renders them.
 *
 * `hasPassword` stands in for the password column itself — the page needs to
 * know whether a credentials login exists (a GitHub-only account has none and
 * gets no change-password section), and the hash must never leave the server.
 */
export interface ProfileUser extends CurrentUser {
  createdAt: Date;
  hasPassword: boolean;
}
