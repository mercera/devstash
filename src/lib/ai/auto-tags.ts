/**
 * Everything behind `POST /api/ai/tags` except HTTP itself, so it can be unit
 * tested. Server only.
 */

import { runAiRequest, type AiRouteResponse, type AiRouteResult } from "@/lib/ai/run-ai-request";
import { suggestTags } from "@/lib/ai/tags";
import type { SessionUser } from "@/lib/session";
import { suggestTagsSchema } from "@/lib/validations/ai";

export type AutoTagsResponse = AiRouteResponse<{ tags: string[] }>;
export type AutoTagsResult = AiRouteResult<{ tags: string[] }>;

const INVALID_REQUEST = "Tags can't be suggested for this item.";

/** See `runAiRequest` for the checks and their order. Null when cancelled. */
export function generateAutoTags(
  user: SessionUser | null,
  body: unknown,
  signal?: AbortSignal,
): Promise<AutoTagsResult | null> {
  return runAiRequest(
    {
      schema: suggestTagsSchema,
      invalidMessage: INVALID_REQUEST,
      generate: async (input, userId, callSignal) => ({
        tags: await suggestTags(input, userId, callSignal),
      }),
    },
    user,
    body,
    signal,
  );
}
