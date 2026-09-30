/**
 * Everything behind `POST /api/ai/tags` except HTTP itself, so it can be unit
 * tested. Server only.
 */

import { isAiConfigured } from "@/lib/ai/client";
import { AI_UNAVAILABLE, mapAiError } from "@/lib/ai/errors";
import { suggestTags } from "@/lib/ai/tags";
import { checkRateLimit, rateLimitMessage, retryAfterSeconds } from "@/lib/rate-limit";
import type { SessionUser } from "@/lib/session";
import { PRO_REQUIRED, canUseAi } from "@/lib/usage-limits";
import { suggestTagsSchema } from "@/lib/validations/ai";

export type AutoTagsResponse =
  | { success: true; data: { tags: string[] } }
  | { success: false; error: string; upgradeRequired?: true };

export interface AutoTagsResult {
  status: number;
  body: AutoTagsResponse;
  /** Seconds, for the `Retry-After` header on a 429. */
  retryAfter?: number;
}

const SESSION_EXPIRED = "Your session has expired. Sign in again to continue.";
const INVALID_REQUEST = "Tags can't be suggested for this item.";
const AI_LIMIT_REACHED = "You've reached the hourly AI limit.";

function failure(status: number, error: string): AutoTagsResult {
  return { status, body: { success: false, error } };
}

/**
 * Checks, in order: session (401), plan (403), configuration (503), input
 * (422) and the AI rate limit (429), then asks the model. Input is checked
 * before the limit so a malformed request does not use up the user's quota,
 * and a Free user never reaches the limiter or OpenAI.
 *
 * Returns null when the caller cancelled mid-call.
 */
export async function generateAutoTags(
  user: SessionUser | null,
  body: unknown,
  signal?: AbortSignal,
): Promise<AutoTagsResult | null> {
  if (!user) return failure(401, SESSION_EXPIRED);

  if (!canUseAi(user.isPro)) {
    return { status: 403, body: { success: false, error: PRO_REQUIRED, upgradeRequired: true } };
  }

  if (!isAiConfigured()) return failure(503, AI_UNAVAILABLE);

  const parsed = suggestTagsSchema.safeParse(body);

  if (!parsed.success) {
    // Only the "nothing to work with" rule has a message worth showing; the
    // rest can only come from a crafted request.
    const custom = parsed.error.issues.find((issue) => issue.code === "custom");

    return failure(422, custom?.message ?? INVALID_REQUEST);
  }

  const limit = await checkRateLimit("ai", user.id);

  if (!limit.success) {
    const seconds = retryAfterSeconds(limit.reset);

    return { ...failure(429, rateLimitMessage(seconds, AI_LIMIT_REACHED)), retryAfter: seconds };
  }

  try {
    const tags = await suggestTags(parsed.data, user.id, signal);

    return { status: 200, body: { success: true, data: { tags } } };
  } catch (error) {
    const mapped = mapAiError(error);

    return mapped && failure(mapped.status, mapped.message);
  }
}
