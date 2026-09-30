/**
 * Everything behind `POST /api/ai/summary` except HTTP itself, so it can be
 * unit tested. Server only.
 */

import { runAiRequest, type AiRouteResponse, type AiRouteResult } from "@/lib/ai/run-ai-request";
import { summarizeItem } from "@/lib/ai/summary";
import type { SessionUser } from "@/lib/session";
import { summarizeItemSchema } from "@/lib/validations/ai";

export type AutoSummaryResponse = AiRouteResponse<{ summary: string }>;
export type AutoSummaryResult = AiRouteResult<{ summary: string }>;

const INVALID_REQUEST = "A description can't be generated for this item.";

/** See `runAiRequest` for the checks and their order. Null when cancelled. */
export function generateAutoSummary(
  user: SessionUser | null,
  body: unknown,
  signal?: AbortSignal,
): Promise<AutoSummaryResult | null> {
  return runAiRequest(
    {
      schema: summarizeItemSchema,
      invalidMessage: INVALID_REQUEST,
      generate: async (input, userId, callSignal) => ({
        summary: await summarizeItem(input, userId, callSignal),
      }),
    },
    user,
    body,
    signal,
  );
}
