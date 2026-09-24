"use server";

import { auth } from "@/auth";
import {
  createItem as createItemRecord,
  deleteItem as deleteItemRecord,
  updateItem as updateItemRecord,
} from "@/lib/db/items";
import { deleteUpload, getOwnedUploadKey } from "@/lib/r2";
import {
  createItemSchema,
  updateItemSchema,
  type CreateItemInput,
  type UpdateItemInput,
} from "@/lib/validations/items";
import type { ItemDetail } from "@/types";

/**
 * Item mutations for the drawer and the New Item dialog.
 *
 * Scoped to the **signed-in** user, resolved from the session on every call,
 * like `GET /api/items/[id]`. The list getters are still demo-scoped; pointing
 * a write at that id would let any signed-in user edit the demo account.
 */

const SESSION_EXPIRED = "Your session has expired. Sign in again to continue.";
const NOT_FOUND = "This item could not be found.";
const SOMETHING_WENT_WRONG = "Something went wrong. Please try again.";
const INVALID_INPUT = "Please check the details you entered";

export type CreateItemField = keyof CreateItemInput;

export type CreateItemResult =
  | { success: true; data: ItemDetail }
  | {
      success: false;
      error: string;
      /** Per-field validation messages, keyed by payload field. */
      issues?: Partial<Record<CreateItemField, string[]>>;
    };

export type UpdateItemField = keyof UpdateItemInput;

export type UpdateItemResult =
  | { success: true; data: ItemDetail }
  | {
      success: false;
      error: string;
      /** Per-field validation messages, keyed by payload field. */
      issues?: Partial<Record<UpdateItemField, string[]>>;
    };

export type DeleteItemResult =
  | { success: true; data: { id: string } }
  | { success: false; error: string };

/**
 * Creates an item for the signed-in user from the New Item dialog and returns
 * it.
 *
 * The payload is re-validated here whatever the client checked, the chosen
 * type included: only the creatable system types are accepted.
 */
export async function createItem(
  data: CreateItemInput,
): Promise<CreateItemResult> {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return { success: false, error: SESSION_EXPIRED };
  }

  const parsed = createItemSchema.safeParse(data);

  if (!parsed.success) {
    return {
      success: false,
      error: INVALID_INPUT,
      issues: parsed.error.flatten().fieldErrors,
    };
  }

  // Only one of the caller's own uploads may be attached. Otherwise deleting
  // this item would delete someone else's object from R2.
  if (
    parsed.data.fileUrl !== null &&
    getOwnedUploadKey(parsed.data.fileUrl, userId) === null
  ) {
    return {
      success: false,
      error: INVALID_INPUT,
      issues: { file: ["Upload the file again."] },
    };
  }

  try {
    const item = await createItemRecord(userId, parsed.data);

    if (item === null) {
      return { success: false, error: "This item type is not available." };
    }

    return { success: true, data: item };
  } catch (error) {
    console.error("Failed to create item:", error);

    return { success: false, error: SOMETHING_WENT_WRONG };
  }
}

/**
 * Saves the drawer's edits and returns the updated item, so the drawer can
 * show it without fetching again.
 *
 * The payload is re-validated here whatever the client checked: a server
 * action is a public endpoint, and its arguments can be anything.
 */
export async function updateItem(
  itemId: string,
  data: UpdateItemInput,
): Promise<UpdateItemResult> {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return { success: false, error: SESSION_EXPIRED };
  }

  if (typeof itemId !== "string" || itemId === "") {
    return { success: false, error: NOT_FOUND };
  }

  const parsed = updateItemSchema.safeParse(data);

  if (!parsed.success) {
    return {
      success: false,
      error: INVALID_INPUT,
      issues: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const item = await updateItemRecord(itemId, userId, parsed.data);

    if (item === null) {
      return { success: false, error: NOT_FOUND };
    }

    return { success: true, data: item };
  } catch (error) {
    console.error("Failed to update item:", error);

    return { success: false, error: SOMETHING_WENT_WRONG };
  }
}

/**
 * Permanently deletes one of the signed-in user's items, and the uploaded file
 * behind a file or image item. Another user's item is reported as not found,
 * never as forbidden.
 */
export async function deleteItem(itemId: string): Promise<DeleteItemResult> {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return { success: false, error: SESSION_EXPIRED };
  }

  if (typeof itemId !== "string" || itemId === "") {
    return { success: false, error: NOT_FOUND };
  }

  try {
    const result = await deleteItemRecord(itemId, userId);

    if (!result.deleted) {
      return { success: false, error: NOT_FOUND };
    }

    if (result.fileUrl !== null) {
      await removeUpload(result.fileUrl, userId);
    }

    return { success: true, data: { id: itemId } };
  } catch (error) {
    console.error("Failed to delete item:", error);

    return { success: false, error: SOMETHING_WENT_WRONG };
  }
}

/**
 * Deletes a deleted item's file from R2. Best effort: the item is already
 * gone, so a storage failure is logged and leaves an orphaned object rather
 * than failing a delete that has in fact happened.
 */
async function removeUpload(fileUrl: string, userId: string): Promise<void> {
  const key = getOwnedUploadKey(fileUrl, userId);

  if (key === null) {
    console.error(`Not deleting ${fileUrl} from R2: not one of the user's uploads.`);
    return;
  }

  try {
    await deleteUpload(key);
  } catch (error) {
    console.error(`Failed to delete ${key} from R2:`, error);
  }
}
