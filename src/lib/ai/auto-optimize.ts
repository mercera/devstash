/**
 * Everything behind `POST /api/ai/optimize-prompt` except HTTP itself, so it
 * can be unit tested. Server only.
 */

import { mapAiError } from "@/lib/ai/errors";
import { optimizePrompt } from "@/lib/ai/optimize-prompt";
import {
  aiFailure,
  checkAiRequest,
  consumeAiQuota,
  type AiFailure,
  type AiRouteResult,
} from "@/lib/ai/run-ai-request";
import { getItemCode } from "@/lib/db/items";
import { SOMETHING_WENT_WRONG } from "@/lib/messages";
import type { SessionUser } from "@/lib/session";
import {
  OPTIMIZE_CONTENT_MAX_CHARS,
  canOptimizeType,
  optimizePromptSchema,
} from "@/lib/validations/ai";
import type { PromptOptimization } from "@/types";

const INVALID_REQUEST = "This item can't be optimized.";
const ITEM_NOT_FOUND = "This item could not be found.";
const NOT_PROMPT = "Only prompts can be optimized.";
const NO_PROMPT = "There's no prompt to optimize.";
const TOO_LONG = `This prompt is too long to optimize. The limit is ${OPTIMIZE_CONTENT_MAX_CHARS.toLocaleString("en-US")} characters.`;

/**
 * Checks, in order: session (401), plan (403), configuration (503), input
 * (422), the item (404 when it is not the caller's; 422 when it is not a
 * prompt, is empty or is too long) and the AI rate limit (429), then asks the
 * model. Every check that can refuse for free runs before the limit, so it
 * does not use up quota.
 *
 * Null when the caller cancelled mid-call.
 */
export async function generatePromptOptimization(
  user: SessionUser | null,
  body: unknown,
  signal?: AbortSignal,
): Promise<AiFailure | AiRouteResult<PromptOptimization> | null> {
  const checked = checkAiRequest(optimizePromptSchema, INVALID_REQUEST, user, body);

  if ("failure" in checked) return checked.failure;

  let item;

  try {
    item = await getItemCode(checked.input.itemId, checked.userId);
  } catch (error) {
    console.error("Failed to load item for prompt optimization:", error);
    return aiFailure(500, SOMETHING_WENT_WRONG);
  }

  if (!item) return aiFailure(404, ITEM_NOT_FOUND);
  if (!canOptimizeType(item.typeSlug)) return aiFailure(422, NOT_PROMPT);

  const content = item.content?.trim() ?? "";

  if (!content) return aiFailure(422, NO_PROMPT);
  if (content.length > OPTIMIZE_CONTENT_MAX_CHARS) return aiFailure(422, TOO_LONG);

  const overLimit = await consumeAiQuota(checked.userId);

  if (overLimit) return overLimit;

  try {
    const data = await optimizePrompt(item, checked.userId, signal);

    return { status: 200, body: { success: true, data } };
  } catch (error) {
    const mapped = mapAiError(error);

    return mapped && aiFailure(mapped.status, mapped.message);
  }
}
