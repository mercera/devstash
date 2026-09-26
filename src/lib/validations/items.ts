import { z } from "zod";

import { CREATABLE_TYPE_SLUGS, getItemTypeFields } from "@/lib/item-fields";

/**
 * The drawer's edit payload, and the New Item dialog's create payload built on
 * it.
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
  // The item's full collection set, replacing whatever it had. Whether each id
  // is one of the caller's collections needs the database, so the write checks
  // that; this only checks the shape. De-duplicated for the same reason as tags.
  collectionIds: z
    .array(z.string().min(1, "Choose a collection"))
    .transform((ids) => [...new Set(ids)]),
});

/** What the drawer sends. */
export type UpdateItemInput = z.input<typeof updateItemSchema>;

/** What the database layer receives, after trimming and null-ing blanks. */
export type UpdateItemData = z.output<typeof updateItemSchema>;

/**
 * What `POST /api/uploads` returned for the file. Whether the URL really is one
 * of the caller's uploads needs the session, so the `createItem` action checks
 * that; this only checks the shape.
 */
const uploadedFileSchema = z.object({
  fileUrl: z.url({ protocol: /^https$/ }),
  fileName: z.string().trim().min(1).max(255),
  fileSize: z.number().int().positive(),
});

/**
 * The New Item dialog's payload: the edit fields plus the chosen type's slug,
 * and the uploaded file for a file or image item.
 *
 * Only the fields the chosen type carries are kept — any other is stored as
 * null whatever was sent, so a crafted request cannot put content on a link or
 * a file on a snippet. A link must have a URL, and a file or image item must
 * have its upload.
 */
export const createItemSchema = updateItemSchema
  .extend({
    typeSlug: z.enum(CREATABLE_TYPE_SLUGS, { error: "Choose an item type" }),
    file: uploadedFileSchema.optional(),
  })
  .superRefine((data, ctx) => {
    const fields = getItemTypeFields(data.typeSlug);

    if (fields.url && !data.url) {
      ctx.addIssue({ code: "custom", path: ["url"], message: "URL is required" });
    }

    if (fields.upload && !data.file) {
      ctx.addIssue({
        code: "custom",
        path: ["file"],
        message: fields.upload === "image" ? "Upload an image" : "Upload a file",
      });
    }
  })
  .transform(({ typeSlug, content, language, url, file, ...rest }) => {
    const fields = getItemTypeFields(typeSlug);
    const upload = fields.upload ? file : undefined;

    return {
      ...rest,
      typeSlug,
      description: rest.description ?? null,
      content: fields.content ? (content ?? null) : null,
      language: fields.language ? (language ?? null) : null,
      url: fields.url ? (url ?? null) : null,
      contentType: upload ? ("file" as const) : ("text" as const),
      fileUrl: upload?.fileUrl ?? null,
      fileName: upload?.fileName ?? null,
      fileSize: upload?.fileSize ?? null,
    };
  });

/** What the dialog sends. */
export type CreateItemInput = z.input<typeof createItemSchema>;

/** What the database layer receives: every column set, unused ones null. */
export type CreateItemData = z.output<typeof createItemSchema>;

/**
 * The drawer's pin toggle payload: the state to set, never a bare flip, like
 * `isFavoriteSchema`.
 */
export const isPinnedSchema = z.boolean();

/** Splits the drawer's comma-separated tag field into tag names. */
export function parseTagInput(input: string): string[] {
  return input
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag !== "");
}
