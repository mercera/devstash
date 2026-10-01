"use server";

import { invalidInput, isId } from "@/lib/action-helpers";
import { CollectionNotFoundError } from "@/lib/db/errors";
import {
  countUserItems,
  createItem as createItemRecord,
  deleteItem as deleteItemRecord,
  setItemFavorite as setItemFavoriteRecord,
  setItemContent as setItemContentRecord,
  setItemPinned as setItemPinnedRecord,
  updateItem as updateItemRecord,
} from "@/lib/db/items";
import {
  INVALID_INPUT,
  SESSION_EXPIRED,
  SOMETHING_WENT_WRONG,
} from "@/lib/messages";
import { deleteUpload, getOwnedUploadKey } from "@/lib/r2";
import { ownedMutation } from "@/lib/owned-mutation";
import { getSessionUser, getSessionUserId } from "@/lib/session";
import {
  PRO_REQUIRED,
  canCreateTypeSlug,
  checkItemLimit,
} from "@/lib/usage-limits";
import { isFavoriteSchema } from "@/lib/validations/favorites";
import {
  createItemSchema,
  isPinnedSchema,
  itemContentSchema,
  updateItemSchema,
  type CreateItemInput,
  type UpdateItemInput,
} from "@/lib/validations/items";
import type { ItemDetail } from "@/types";
import type { ActionResult, FieldIssues, UpgradeRequired } from "@/types/actions";

/**
 * Item mutations for the drawer and the New Item dialog.
 *
 * Scoped to the **signed-in** user, resolved from the session on every call,
 * like `GET /api/items/[id]`.
 */

const NOT_FOUND = "This item could not be found.";
const COLLECTION_NOT_FOUND = "A chosen collection no longer exists. Reload and try again.";

/**
 * A collection that was deleted after the form loaded, or a crafted id. Either
 * way the item write was rolled back and nothing was saved.
 */
function collectionNotFound() {
  return {
    success: false as const,
    error: INVALID_INPUT,
    issues: { collectionIds: [COLLECTION_NOT_FOUND] },
  };
}

export type CreateItemField = keyof CreateItemInput;

export type CreateItemResult = ActionResult<
  ItemDetail,
  FieldIssues<CreateItemField> & UpgradeRequired
>;

export type UpdateItemField = keyof UpdateItemInput;

export type UpdateItemResult = ActionResult<ItemDetail, FieldIssues<UpdateItemField>>;

export type SetItemFavoriteResult = ActionResult<{
  id: string;
  isFavorite: boolean;
  updatedAt: Date;
}>;

export type SetItemPinnedResult = ActionResult<{
  id: string;
  isPinned: boolean;
  updatedAt: Date;
}>;

export type SetItemContentResult = ActionResult<{
  id: string;
  content: string | null;
  updatedAt: Date;
}>;

export type DeleteItemResult = ActionResult<{ id: string }>;

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
  const user = await getSessionUser();

  if (!user) {
    return { success: false, error: SESSION_EXPIRED };
  }

  const parsed = createItemSchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, ...invalidInput(parsed.error) };
  }

  // `isPro` is refreshed from the database on every `auth()` call, so an
  // upgrade or downgrade applies from the next request.
  const { id: userId, isPro } = user;

  if (!canCreateTypeSlug(parsed.data.typeSlug, isPro)) {
    return { success: false, error: PRO_REQUIRED, upgradeRequired: true };
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
    // Pro skips the count entirely. Not atomic: two creates at 49 can both
    // pass, which is acceptable for a soft plan limit.
    if (!isPro) {
      const limit = checkItemLimit(await countUserItems(userId), isPro);

      if (!limit.allowed) {
        return { success: false, error: limit.error, upgradeRequired: true };
      }
    }

    const item = await createItemRecord(userId, parsed.data);

    if (item === null) {
      return { success: false, error: "This item type is not available." };
    }

    return { success: true, data: item };
  } catch (error) {
    if (error instanceof CollectionNotFoundError) return collectionNotFound();

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
  const userId = await getSessionUserId();

  if (!userId) {
    return { success: false, error: SESSION_EXPIRED };
  }

  if (!isId(itemId)) {
    return { success: false, error: NOT_FOUND };
  }

  const parsed = updateItemSchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, ...invalidInput(parsed.error) };
  }

  try {
    const item = await updateItemRecord(itemId, userId, parsed.data);

    if (item === null) {
      return { success: false, error: NOT_FOUND };
    }

    return { success: true, data: item };
  } catch (error) {
    if (error instanceof CollectionNotFoundError) return collectionNotFound();

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
  const userId = await getSessionUserId();

  if (!userId) {
    return { success: false, error: SESSION_EXPIRED };
  }

  if (!isId(itemId)) {
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
 * Favorites or unfavorites one of the signed-in user's items. Takes the state
 * to set rather than flipping it, so a repeated request is harmless. Another
 * user's item is "not found".
 */
export async function setItemFavorite(
  itemId: string,
  isFavorite: boolean,
): Promise<SetItemFavoriteResult> {
  return ownedMutation({
    id: itemId,
    value: isFavorite,
    schema: isFavoriteSchema,
    write: (userId, id, value) => setItemFavoriteRecord(id, userId, value),
    notFound: NOT_FOUND,
    failureLog: "Failed to update item favorite:",
  });
}

/**
 * Pins or unpins one of the signed-in user's items. Takes the state to set
 * rather than flipping it, so a repeated request is harmless. Another user's
 * item is "not found".
 */
export async function setItemPinned(
  itemId: string,
  isPinned: boolean,
): Promise<SetItemPinnedResult> {
  return ownedMutation({
    id: itemId,
    value: isPinned,
    schema: isPinnedSchema,
    write: (userId, id, value) => setItemPinnedRecord(id, userId, value),
    notFound: NOT_FOUND,
    failureLog: "Failed to update item pin:",
  });
}

/**
 * Replaces the content of one of the signed-in user's items. Used by the
 * drawer when the user accepts an AI-optimized prompt, so it touches the
 * content alone and leaves tags and collections as they are. Another user's
 * item is "not found".
 */
export async function setItemContent(
  itemId: string,
  content: string,
): Promise<SetItemContentResult> {
  return ownedMutation({
    id: itemId,
    value: content,
    schema: itemContentSchema,
    write: (userId, id, value) => setItemContentRecord(id, userId, value),
    notFound: NOT_FOUND,
    failureLog: "Failed to update item content:",
  });
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
