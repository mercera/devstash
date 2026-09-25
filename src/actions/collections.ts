"use server";

import { auth } from "@/auth";
import { createCollection as createCollectionRecord } from "@/lib/db/collections";
import {
  createCollectionSchema,
  type CreateCollectionInput,
} from "@/lib/validations/collections";
import type { Collection } from "@/types";

/**
 * Collection mutations for the New Collection dialog.
 *
 * Scoped to the **signed-in** user, resolved from the session on every call,
 * like the item actions in `src/actions/items.ts`.
 */

const SESSION_EXPIRED = "Your session has expired. Sign in again to continue.";
const SOMETHING_WENT_WRONG = "Something went wrong. Please try again.";
const INVALID_INPUT = "Please check the details you entered";

export type CreateCollectionField = keyof CreateCollectionInput;

export type CreateCollectionResult =
  | { success: true; data: Collection }
  | {
      success: false;
      error: string;
      /** Per-field validation messages, keyed by payload field. */
      issues?: Partial<Record<CreateCollectionField, string[]>>;
    };

/**
 * Creates a collection for the signed-in user and returns it. The payload is
 * re-validated here whatever the client checked: a server action is a public
 * endpoint, and its arguments can be anything.
 */
export async function createCollection(
  data: CreateCollectionInput,
): Promise<CreateCollectionResult> {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return { success: false, error: SESSION_EXPIRED };
  }

  const parsed = createCollectionSchema.safeParse(data);

  if (!parsed.success) {
    return {
      success: false,
      error: INVALID_INPUT,
      issues: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const collection = await createCollectionRecord(userId, parsed.data);

    return { success: true, data: collection };
  } catch (error) {
    console.error("Failed to create collection:", error);

    return { success: false, error: SOMETHING_WENT_WRONG };
  }
}
