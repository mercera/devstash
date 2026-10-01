import type { z } from "zod";

import { isId } from "@/lib/action-helpers";
import { SESSION_EXPIRED, SOMETHING_WENT_WRONG } from "@/lib/messages";
import { getSessionUserId } from "@/lib/session";
import type { ActionResult } from "@/types/actions";

interface OwnedMutation<V, R extends object> {
  /** The record's id, as the client sent it. */
  id: unknown;
  /** The value to write, as the client sent it. */
  value: unknown;
  /** Validates `value`. A value that fails it never came from the UI. */
  schema: z.ZodType<V>;
  /**
   * Writes the value, scoped to the user. Returns null when the record is
   * missing or not theirs.
   */
  write: (userId: string, id: string, value: V) => Promise<R | null>;
  /** The message for a missing or foreign record. */
  notFound: string;
  /** Prefix for the server log when the write throws. */
  failureLog: string;
}

/**
 * Sets one field on one of the signed-in user's records: a favorite, a pin,
 * an item's content. Shared by the single-field server actions, which differ
 * only in what they validate and write.
 *
 * Another user's record is reported as not found, never as forbidden, because
 * `write` scopes the query to the user. Returns the record's id with whatever
 * `write` returned.
 */
export async function ownedMutation<V, R extends object>({
  id,
  value,
  schema,
  write,
  notFound,
  failureLog,
}: OwnedMutation<V, R>): Promise<ActionResult<{ id: string } & R>> {
  const userId = await getSessionUserId();

  if (!userId) {
    return { success: false, error: SESSION_EXPIRED };
  }

  if (!isId(id)) {
    return { success: false, error: notFound };
  }

  const parsed = schema.safeParse(value);

  if (!parsed.success) {
    return { success: false, error: SOMETHING_WENT_WRONG };
  }

  try {
    const result = await write(userId, id, parsed.data);

    if (result === null) {
      return { success: false, error: notFound };
    }

    return { success: true, data: { id, ...result } };
  } catch (error) {
    console.error(failureLog, error);

    return { success: false, error: SOMETHING_WENT_WRONG };
  }
}
