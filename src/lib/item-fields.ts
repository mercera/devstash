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

export interface ItemTypeFields {
  content: boolean;
  language: boolean;
  url: boolean;
}

export function getItemTypeFields(slug: string): ItemTypeFields {
  return {
    content: CONTENT_TYPE_SLUGS.has(slug),
    language: LANGUAGE_TYPE_SLUGS.has(slug),
    url: URL_TYPE_SLUGS.has(slug),
  };
}
