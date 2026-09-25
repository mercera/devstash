"use server";

import { auth } from "@/auth";
import {
  createCollection as createCollectionRecord,
  deleteCollection as deleteCollectionRecord,
  updateCollection as updateCollectionRecord,
} from "@/lib/db/collections";
import {
  createCollectionSchema,
  updateCollectionSchema,
  type CreateCollectionInput,
  type UpdateCollectionInput,
} from "@/lib/validations/collections";
import type { Collection } from "@/types";

/**
 * Collection mutations for the New and Edit Collection dialogs and the delete
 * confirmation.
 *
 * Scoped to the **signed-in** user, resolved from the session on every call,
 * like the item actions in `src/actions/items.ts`.
 */

const SESSION_EXPIRED = "Your session has expired. Sign in again to continue.";
const SOMETHING_WENT_WRONG = "Something went wrong. Please try again.";
const INVALID_INPUT = "Please check the details you entered";
const NOT_FOUND = "This collection could not be found.";

export type CreateCollectionField = keyof CreateCollectionInput;

export type CreateCollectionResult =
  | { success: true; data: Collection }
  | {
      success: false;
      error: string;
      /** Per-field validation messages, keyed by payload field. */
      issues?: Partial<Record<CreateCollectionField, string[]>>;
    };

export type UpdateCollectionField = keyof UpdateCollectionInput;

export type UpdateCollectionResult =
  | { success: true; data: Collection }
  | {
      success: false;
      error: string;
      /** Per-field validation messages, keyed by payload field. */
      issues?: Partial<Record<UpdateCollectionField, string[]>>;
    };

export type DeleteCollectionResult =
  | { success: true; data: { id: string } }
  | { success: false; error: string };

/** Whether a server action argument is usable as an id. */
function isId(value: unknown): value is string {
  return typeof value === "string" && value !== "";
}

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

/**
 * Updates the name and description of one of the signed-in user's collections
 * and returns it. A rename changes the slug, so the caller reads the new one
 * off `data` to follow it. Another user's collection is "not found".
 */
export async function updateCollection(
  collectionId: string,
  data: UpdateCollectionInput,
): Promise<UpdateCollectionResult> {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return { success: false, error: SESSION_EXPIRED };
  }

  if (!isId(collectionId)) {
    return { success: false, error: NOT_FOUND };
  }

  const parsed = updateCollectionSchema.safeParse(data);

  if (!parsed.success) {
    return {
      success: false,
      error: INVALID_INPUT,
      issues: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const collection = await updateCollectionRecord(userId, collectionId, parsed.data);

    if (collection === null) {
      return { success: false, error: NOT_FOUND };
    }

    return { success: true, data: collection };
  } catch (error) {
    console.error("Failed to update collection:", error);

    return { success: false, error: SOMETHING_WENT_WRONG };
  }
}

/**
 * Deletes one of the signed-in user's collections. Its items stay; they only
 * stop belonging to it.
 */
export async function deleteCollection(
  collectionId: string,
): Promise<DeleteCollectionResult> {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return { success: false, error: SESSION_EXPIRED };
  }

  if (!isId(collectionId)) {
    return { success: false, error: NOT_FOUND };
  }

  try {
    const deleted = await deleteCollectionRecord(userId, collectionId);

    if (!deleted) {
      return { success: false, error: NOT_FOUND };
    }

    return { success: true, data: { id: collectionId } };
  } catch (error) {
    console.error("Failed to delete collection:", error);

    return { success: false, error: SOMETHING_WENT_WRONG };
  }
}
