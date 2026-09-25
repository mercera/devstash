import { z } from "zod";

/**
 * The New Collection dialog's payload. The name is trimmed and required; a
 * blank description is stored as null rather than an empty string.
 */
export const createCollectionSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  description: z
    .string()
    .trim()
    .transform((value) => value || null)
    .nullable()
    .optional()
    .transform((value) => value ?? null),
});

/** What the dialog sends. */
export type CreateCollectionInput = z.input<typeof createCollectionSchema>;

/** What the database layer receives. */
export type CreateCollectionData = z.output<typeof createCollectionSchema>;
