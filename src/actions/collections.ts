"use server";

import { invalidInput, isId } from "@/lib/action-helpers";
import {
  countUserCollections,
  createCollection as createCollectionRecord,
  deleteCollection as deleteCollectionRecord,
  setCollectionFavorite as setCollectionFavoriteRecord,
  updateCollection as updateCollectionRecord,
} from "@/lib/db/collections";
import { SESSION_EXPIRED, SOMETHING_WENT_WRONG } from "@/lib/messages";
import { ownedMutation } from "@/lib/owned-mutation";
import { getSessionUser, getSessionUserId } from "@/lib/session";
import { checkCollectionLimit } from "@/lib/usage-limits";
import { isFavoriteSchema } from "@/lib/validations/favorites";
import {
  createCollectionSchema,
  updateCollectionSchema,
  type CreateCollectionInput,
  type UpdateCollectionInput,
} from "@/lib/validations/collections";
import type { Collection } from "@/types";
import type { ActionResult, FieldIssues, UpgradeRequired } from "@/types/actions";

/**
 * Collection mutations for the New and Edit Collection dialogs, the delete
 * confirmation and the Favorite toggles.
 *
 * Scoped to the **signed-in** user, resolved from the session on every call,
 * like the item actions in `src/actions/items.ts`.
 */

const NOT_FOUND = "This collection could not be found.";

export type CreateCollectionField = keyof CreateCollectionInput;

export type CreateCollectionResult = ActionResult<
  Collection,
  FieldIssues<CreateCollectionField> & UpgradeRequired
>;

export type UpdateCollectionField = keyof UpdateCollectionInput;

export type UpdateCollectionResult = ActionResult<
  Collection,
  FieldIssues<UpdateCollectionField>
>;

export type SetCollectionFavoriteResult = ActionResult<{ id: string; isFavorite: boolean }>;

export type DeleteCollectionResult = ActionResult<{ id: string }>;

/**
 * Creates a collection for the signed-in user and returns it. The payload is
 * re-validated here whatever the client checked: a server action is a public
 * endpoint, and its arguments can be anything.
 */
export async function createCollection(
  data: CreateCollectionInput,
): Promise<CreateCollectionResult> {
  const user = await getSessionUser();

  if (!user) {
    return { success: false, error: SESSION_EXPIRED };
  }

  const parsed = createCollectionSchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, ...invalidInput(parsed.error) };
  }

  const { id: userId, isPro } = user;

  try {
    // Pro skips the count. Soft limit: concurrent creates can overshoot it.

    if (!isPro) {
      const limit = checkCollectionLimit(await countUserCollections(userId), isPro);

      if (!limit.allowed) {
        return { success: false, error: limit.error, upgradeRequired: true };
      }
    }

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
  const userId = await getSessionUserId();

  if (!userId) {
    return { success: false, error: SESSION_EXPIRED };
  }

  if (!isId(collectionId)) {
    return { success: false, error: NOT_FOUND };
  }

  const parsed = updateCollectionSchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, ...invalidInput(parsed.error) };
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
 * Favorites or unfavorites one of the signed-in user's collections. Takes the
 * state to set rather than flipping it, so a repeated request is harmless.
 */
export async function setCollectionFavorite(
  collectionId: string,
  isFavorite: boolean,
): Promise<SetCollectionFavoriteResult> {
  return ownedMutation({
    id: collectionId,
    value: isFavorite,
    schema: isFavoriteSchema,
    write: setCollectionFavoriteRecord,
    notFound: NOT_FOUND,
    failureLog: "Failed to update collection favorite:",
  });
}

/**
 * Deletes one of the signed-in user's collections. Its items stay; they only
 * stop belonging to it.
 */
export async function deleteCollection(
  collectionId: string,
): Promise<DeleteCollectionResult> {
  const userId = await getSessionUserId();

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
