/**
 * Everything behind `POST /api/ai/explain` except HTTP itself, so it can be
 * unit tested. Server only.
 */

import { mapAiError } from "@/lib/ai/errors";
import { streamExplanation } from "@/lib/ai/explain";
import {
  aiFailure,
  checkAiRequest,
  consumeAiQuota,
  type AiFailure,
  type AiStreamResult,
} from "@/lib/ai/run-ai-request";
import { getItemCode } from "@/lib/db/items";
import type { SessionUser } from "@/lib/session";
import { canExplainType, explainCodeSchema } from "@/lib/validations/ai";

const INVALID_REQUEST = "This item can't be explained.";
const ITEM_NOT_FOUND = "This item could not be found.";
const NOT_CODE = "Only snippets and commands can be explained.";
const NO_CODE = "There's no code to explain.";
const SOMETHING_WENT_WRONG = "Something went wrong. Please try again.";

/**
 * Checks, in order: session (401), plan (403), configuration (503), input
 * (422), the item (404 when it is not the caller's, 422 when it is not code or
 * is empty) and the AI rate limit (429), then starts the stream. Every check
 * that can refuse for free runs before the limit, so it does not use up quota.
 *
 * Null when the caller cancelled before the stream started.
 */
export async function generateExplanation(
  user: SessionUser | null,
  body: unknown,
  signal?: AbortSignal,
): Promise<AiFailure | AiStreamResult | null> {
  const checked = checkAiRequest(explainCodeSchema, INVALID_REQUEST, user, body);

  if ("failure" in checked) return checked.failure;

  let item;

  try {
    item = await getItemCode(checked.input.itemId, checked.userId);
  } catch (error) {
    console.error("Failed to load item for explanation:", error);
    return aiFailure(500, SOMETHING_WENT_WRONG);
  }

  if (!item) return aiFailure(404, ITEM_NOT_FOUND);
  if (!canExplainType(item.typeSlug)) return aiFailure(422, NOT_CODE);
  if (!item.content?.trim()) return aiFailure(422, NO_CODE);

  const overLimit = await consumeAiQuota(checked.userId);

  if (overLimit) return overLimit;

  try {
    return { status: 200, stream: await streamExplanation(item, checked.userId, signal) };
  } catch (error) {
    const mapped = mapAiError(error);

    return mapped && aiFailure(mapped.status, mapped.message);
  }
}
