import type { ItemType } from "@/types";

/**
 * Which type-specific fields an item of a given type carries, keyed on the
 * type's slug like every other per-type decision in the app.
 *
 * Title, description and tags apply to every type, so they are not listed.
 * File and image items have none of these; their payload is the upload.
 */
const CONTENT_TYPE_SLUGS = new Set(["snippet", "prompt", "command", "note"]);
const LANGUAGE_TYPE_SLUGS = new Set(["snippet", "command"]);
const URL_TYPE_SLUGS = new Set(["link"]);

/**
 * The system types the New Item dialog can create. File and image are left
 * out: their payload is an upload, which does not exist yet.
 */
export const CREATABLE_TYPE_SLUGS = [
  "snippet",
  "prompt",
  "command",
  "note",
  "link",
] as const;

export type CreatableTypeSlug = (typeof CREATABLE_TYPE_SLUGS)[number];

export function isCreatableTypeSlug(slug: string): slug is CreatableTypeSlug {
  return (CREATABLE_TYPE_SLUGS as readonly string[]).includes(slug);
}

/**
 * `snippet` → `Snippet`. Type names are plural ("Snippets"), which reads oddly
 * on the type picker and in "New Snippet".
 */
export function singularTypeName(slug: string): string {
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

/**
 * The types the New Item dialog offers, in the order given. Only system types:
 * a user's custom type with a creatable slug is not one of them.
 *
 * Each is trimmed to the `ItemType` fields, since the list is passed to a
 * client component and anything extra (such as a count) would be serialized.
 */
export function getCreatableTypes(types: readonly ItemType[]): ItemType[] {
  return types
    .filter((type) => type.isSystem && isCreatableTypeSlug(type.slug))
    .map(({ id, name, slug, icon, color, isSystem }) => ({
      id,
      name,
      slug,
      icon,
      color,
      isSystem,
    }));
}

export interface ItemTypeFields {
  content: boolean;
  language: boolean;
  url: boolean;
  /** The content is code, edited and shown in the code editor. */
  code: boolean;
}

export function getItemTypeFields(slug: string): ItemTypeFields {
  return {
    content: CONTENT_TYPE_SLUGS.has(slug),
    language: LANGUAGE_TYPE_SLUGS.has(slug),
    url: URL_TYPE_SLUGS.has(slug),
    // A type that records a language is code; the rest are prose.
    code: LANGUAGE_TYPE_SLUGS.has(slug),
  };
}
