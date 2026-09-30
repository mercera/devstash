/**
 * The checks every AI route runs before and around its model call, so each
 * feature only supplies its schema and its call. Server only.
 */

import type { z } from "zod";

import { isAiConfigured } from "@/lib/ai/client";
import { AI_UNAVAILABLE, mapAiError } from "@/lib/ai/errors";
import { checkRateLimit, rateLimitMessage, retryAfterSeconds } from "@/lib/rate-limit";
import type { SessionUser } from "@/lib/session";
import { PRO_REQUIRED, canUseAi } from "@/lib/usage-limits";

export type AiRouteResponse<TData> =
  | { success: true; data: TData }
  | { success: false; error: string; upgradeRequired?: true };

export interface AiRouteResult<TData> {
  status: number;
  body: AiRouteResponse<TData>;
  /** Seconds, for the `Retry-After` header on a 429. */
  retryAfter?: number;
}

/** A refusal: assignable to every feature's result, since it carries no data. */
export type AiFailure = AiRouteResult<never>;

/** A successful streaming answer: plain text, sent as it is generated. */
export interface AiStreamResult {
  status: 200;
  stream: ReadableStream<Uint8Array>;
}

export interface AiFeature<TSchema extends z.ZodType, TData> {
  schema: TSchema;
  /** Shown when the input fails a rule other than a custom `refine`. */
  invalidMessage: string;
  generate: (input: z.output<TSchema>, userId: string, signal?: AbortSignal) => Promise<TData>;
}

const SESSION_EXPIRED = "Your session has expired. Sign in again to continue.";
const AI_LIMIT_REACHED = "You've reached the hourly AI limit.";

export function aiFailure(status: number, error: string): AiFailure {
  return { status, body: { success: false, error } };
}

/**
 * Checks, in order: session (401), plan (403), configuration (503) and input
 * (422). Returns the parsed input, or the refusal to send.
 */
export function checkAiRequest<TSchema extends z.ZodType>(
  schema: TSchema,
  invalidMessage: string,
  user: SessionUser | null,
  body: unknown,
): { input: z.output<TSchema>; userId: string } | { failure: AiFailure } {
  if (!user) return { failure: aiFailure(401, SESSION_EXPIRED) };

  if (!canUseAi(user.isPro)) {
    return {
      failure: { status: 403, body: { success: false, error: PRO_REQUIRED, upgradeRequired: true } },
    };
  }

  if (!isAiConfigured()) return { failure: aiFailure(503, AI_UNAVAILABLE) };

  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    // Only the "nothing to work with" rule has a message worth showing; the
    // rest can only come from a crafted request.
    const custom = parsed.error.issues.find((issue) => issue.code === "custom");

    return { failure: aiFailure(422, custom?.message ?? invalidMessage) };
  }

  return { input: parsed.data, userId: user.id };
}

/**
 * Takes one call from the user's hourly AI limit (429 when it is spent).
 * Runs last, after every check that could refuse the request for free.
 */
export async function consumeAiQuota(userId: string): Promise<AiFailure | null> {
  const limit = await checkRateLimit("ai", userId);

  if (limit.success) return null;

  const seconds = retryAfterSeconds(limit.reset);

  return { ...aiFailure(429, rateLimitMessage(seconds, AI_LIMIT_REACHED)), retryAfter: seconds };
}

/**
 * Checks, in order: session (401), plan (403), configuration (503), input
 * (422) and the AI rate limit (429), then runs the feature. Input is checked
 * before the limit so a malformed request does not use up the user's quota,
 * and a Free user never reaches the limiter or OpenAI.
 *
 * Returns null when the caller cancelled mid-call.
 */
export async function runAiRequest<TSchema extends z.ZodType, TData>(
  feature: AiFeature<TSchema, TData>,
  user: SessionUser | null,
  body: unknown,
  signal?: AbortSignal,
): Promise<AiRouteResult<TData> | null> {
  const checked = checkAiRequest(feature.schema, feature.invalidMessage, user, body);

  if ("failure" in checked) return checked.failure;

  const overLimit = await consumeAiQuota(checked.userId);

  if (overLimit) return overLimit;

  try {
    const data = await feature.generate(checked.input, checked.userId, signal);

    return { status: 200, body: { success: true, data } };
  } catch (error) {
    const mapped = mapAiError(error);

    return mapped && aiFailure(mapped.status, mapped.message);
  }
}
