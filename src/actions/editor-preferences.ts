"use server";

import { auth } from "@/auth";
import { updateEditorPreferences as updateEditorPreferencesRecord } from "@/lib/db/user";
import {
  editorPreferencesSchema,
  type EditorPreferences,
} from "@/lib/editor-preferences";

/**
 * The editor preferences section on `/settings` saves every change through
 * this action. Scoped to the **signed-in** user, resolved from the session on
 * every call.
 */

export type UpdateEditorPreferencesResult =
  | { success: true; data: EditorPreferences }
  | { success: false; error: string };

/**
 * Replaces the signed-in user's editor preferences. The whole set is sent on
 * each change, so the stored value is always complete and the last save wins.
 */
export async function updateEditorPreferences(
  data: unknown,
): Promise<UpdateEditorPreferencesResult> {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return {
      success: false,
      error: "Your session has expired. Sign in again to continue.",
    };
  }

  const parsed = editorPreferencesSchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: "Those editor settings are not available." };
  }

  try {
    const updated = await updateEditorPreferencesRecord(userId, parsed.data);

    if (!updated) {
      return { success: false, error: "This account no longer exists." };
    }
  } catch (error) {
    console.error("Failed to update editor preferences:", error);

    return { success: false, error: "Something went wrong. Please try again." };
  }

  return { success: true, data: parsed.data };
}
