import { z } from "zod";

/**
 * What has to be typed to confirm account deletion.
 *
 * Lives here rather than in `src/actions/profile.ts` because both sides need
 * it: the dialog renders it and arms its button on it, and the action checks
 * it. A `"use server"` module may only export async functions, so a constant
 * could not be shared from there.
 */
export const DELETE_CONFIRMATION_WORD = "DELETE";

/**
 * The confirmation is re-checked on the server. The dialog's disabled button is
 * a convenience, not the gate — a form post that skips the UI entirely must not
 * be able to delete an account.
 */
export const deleteAccountSchema = z.object({
  confirmation: z
    .string()
    .refine(
      (value) => value === DELETE_CONFIRMATION_WORD,
      `Type ${DELETE_CONFIRMATION_WORD} to confirm`,
    ),
});
