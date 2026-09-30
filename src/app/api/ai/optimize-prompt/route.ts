import { generatePromptOptimization } from "@/lib/ai/auto-optimize";
import { handleAiRoute } from "@/lib/ai/route";

/** Headroom for a long rewrite; the OpenAI client itself times out at ~20s per try. */
export const maxDuration = 60;

/**
 * POST /api/ai/optimize-prompt
 *
 * Suggests a rewrite of a saved prompt, taking only `{ itemId }` (JSON): the
 * prompt is read from the caller's own item. Answers
 * `{ optimizedPrompt, changes }`, with `optimizedPrompt` null when nothing
 * needed changing. Nothing is saved; the drawer saves the rewrite only if the
 * user accepts it.
 */
export function POST(request: Request) {
  return handleAiRoute(request, generatePromptOptimization, "That request is too large.");
}
