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
