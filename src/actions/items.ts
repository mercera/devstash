"use server";

import { auth } from "@/auth";
import { updateItem as updateItemRecord } from "@/lib/db/items";
import { updateItemSchema, type UpdateItemInput } from "@/lib/validations/items";
import type { ItemDetail } from "@/types";

/**
 * Item mutations for the drawer.
 *
 * Scoped to the **signed-in** user, resolved from the session on every call,
 * like `GET /api/items/[id]`. The list getters are still demo-scoped; pointing
 * a write at that id would let any signed-in user edit the demo account.
 */

export type UpdateItemField = keyof UpdateItemInput;

export type UpdateItemResult =
  | { success: true; data: ItemDetail }
  | {
      success: false;
      error: string;
      /** Per-field validation messages, keyed by payload field. */
      issues?: Partial<Record<UpdateItemField, string[]>>;
    };

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
    return {
      success: false,
      error: "Your session has expired. Sign in again to continue.",
    };
  }

  if (typeof itemId !== "string" || itemId === "") {
    return { success: false, error: "This item could not be found." };
  }

  const parsed = updateItemSchema.safeParse(data);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please check the details you entered",
      issues: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const item = await updateItemRecord(itemId, userId, parsed.data);

    if (item === null) {
      return { success: false, error: "This item could not be found." };
    }

    return { success: true, data: item };
  } catch (error) {
    console.error("Failed to update item:", error);

    return { success: false, error: "Something went wrong. Please try again." };
  }
}
