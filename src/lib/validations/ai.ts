import { z } from "zod";

/**
 * Request rules for the AI features. Client-safe (Zod only), so the forms
 * trim what they send by the same numbers the server enforces.
 */

/** The types tags can be suggested for: every type that carries text. */
export const TAG_SUGGESTION_TYPE_SLUGS = [
  "snippet",
  "prompt",
  "command",
  "note",
  "link",
] as const;

export function canSuggestTagsFor(slug: string): boolean {
  return (TAG_SUGGESTION_TYPE_SLUGS as readonly string[]).includes(slug);
}

/** Content beyond this is cut before it is sent to the model. */
export const TAG_CONTENT_MAX_CHARS = 2_000;

/**
 * Generous caps: the client already trims the content, so these only stop a
 * crafted request from posting something absurd.
 */
const MAX_CONTENT_CHARS = 20_000;
const MAX_EXISTING_TAGS = 50;

export const suggestTagsSchema = z
  .object({
    typeSlug: z.enum(TAG_SUGGESTION_TYPE_SLUGS),
    title: z.string().trim().max(500),
    description: z.string().trim().max(2_000).default(""),
    content: z.string().max(MAX_CONTENT_CHARS).default(""),
    language: z.string().trim().max(100).default(""),
    url: z.string().trim().max(2_048).default(""),
    /** Tags already in the field, so they are not suggested again. */
    tags: z.array(z.string().trim().max(100)).max(MAX_EXISTING_TAGS).default([]),
  })
  .refine((input) => input.title !== "" || input.content.trim() !== "", {
    message: "Add a title or some content first.",
    path: ["title"],
  });

export type SuggestTagsInput = z.infer<typeof suggestTagsSchema>;
