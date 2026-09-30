import { z } from "zod";

import { CREATABLE_TYPE_SLUGS } from "@/lib/item-fields";

/**
 * Request rules for the AI features. Client-safe (no server imports), so the forms
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

/**
 * Every creatable type can be summarised from what it has: files and images
 * from their title and file name, links from their title and URL.
 */
export const SUMMARY_TYPE_SLUGS = CREATABLE_TYPE_SLUGS;

/** Content beyond this is cut before it is sent to the model. */
export const SUMMARY_CONTENT_MAX_CHARS = 8_000;

export const summarizeItemSchema = z
  .object({
    typeSlug: z.enum(SUMMARY_TYPE_SLUGS),
    title: z.string().trim().max(500),
    content: z.string().max(MAX_CONTENT_CHARS).default(""),
    language: z.string().trim().max(100).default(""),
    url: z.string().trim().max(2_048).default(""),
    fileName: z.string().trim().max(500).default(""),
  })
  .refine(
    (input) =>
      input.title !== "" ||
      input.content.trim() !== "" ||
      input.url !== "" ||
      input.fileName !== "",
    { message: "Add a title or some content first.", path: ["title"] },
  );

export type SummarizeItemInput = z.infer<typeof summarizeItemSchema>;

/**
 * The types that can be explained: actual code and terminal commands. The
 * rest are already prose, or not text at all.
 */
export const EXPLAIN_TYPE_SLUGS = ["snippet", "command"] as const;

export function canExplainType(slug: string): boolean {
  return (EXPLAIN_TYPE_SLUGS as readonly string[]).includes(slug);
}

/** Code beyond this is cut, at a line end, before it is sent to the model. */
export const EXPLAIN_CONTENT_MAX_CHARS = 16_000;

/**
 * Only the item's id: the server reads the code itself, so the route can only
 * explain the caller's own saved snippets and commands, never arbitrary text.
 */
export const explainCodeSchema = z.object({
  itemId: z.string().trim().min(1).max(100),
});
