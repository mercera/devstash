import { z } from "zod";

/**
 * The drawer's edit payload.
 *
 * A blank optional field is stored as null, so clearing an input clears the
 * column rather than writing an empty string. A field that is absent
 * (`undefined`) is left untouched — the drawer only sends the fields shown for
 * the item's type.
 */

/** Trimmed; blank becomes null. */
const optionalText = z
  .string()
  .trim()
  .transform((value) => value || null)
  .nullable()
  .optional();

/**
 * Not trimmed: leading indentation is part of a snippet. A value that is only
 * whitespace still counts as blank.
 */
const optionalContent = z
  .string()
  .transform((value) => (value.trim() === "" ? null : value))
  .nullable()
  .optional();

/**
 * http(s) only. The drawer renders the URL as a link, and `z.url()` on its own
 * accepts any scheme, `javascript:` included.
 */
const optionalUrl = z
  .string()
  .trim()
  .transform((value) => value || null)
  .pipe(
    z
      .url({
        protocol: /^https?$/,
        error: "Enter a valid URL starting with http:// or https://",
      })
      .nullable(),
  )
  .nullable()
  .optional();

export const updateItemSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: optionalText,
  content: optionalContent,
  url: optionalUrl,
  language: optionalText,
  // De-duplicated here so a repeated name cannot collide on the `ItemTag`
  // primary key when the tags are written.
  tags: z
    .array(z.string().trim().min(1, "Tags cannot be blank"))
    .transform((tags) => [...new Set(tags)]),
});

/** What the drawer sends. */
export type UpdateItemInput = z.input<typeof updateItemSchema>;

/** What the database layer receives, after trimming and null-ing blanks. */
export type UpdateItemData = z.output<typeof updateItemSchema>;

/** Splits the drawer's comma-separated tag field into tag names. */
export function parseTagInput(input: string): string[] {
  return input
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag !== "");
}
