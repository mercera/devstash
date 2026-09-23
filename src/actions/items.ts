"use server";

import { auth } from "@/auth";
import {
  createItem as createItemRecord,
  deleteItem as deleteItemRecord,
  updateItem as updateItemRecord,
} from "@/lib/db/items";
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
 * Permanently deletes one of the signed-in user's items. Another user's item
 * is reported as not found, never as forbidden.
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
    const deleted = await deleteItemRecord(itemId, userId);

    if (!deleted) {
      return { success: false, error: NOT_FOUND };
    }

    return { success: true, data: { id: itemId } };
  } catch (error) {
    console.error("Failed to delete item:", error);

    return { success: false, error: SOMETHING_WENT_WRONG };
  }
}
