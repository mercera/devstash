import { generateExplanation } from "@/lib/ai/auto-explain";
import { handleAiRoute } from "@/lib/ai/route";

/** Headroom for a long explanation; the client itself times out at ~40s per call. */
export const maxDuration = 60;

/**
 * POST /api/ai/explain
 *
 * Explains a saved snippet or command, taking only `{ itemId }` (JSON): the
 * code is read from the caller's own item. Answers with the explanation as a
 * `text/plain` stream of Markdown, or a JSON refusal. Nothing is stored; each
 * call is a new explanation.
 */
export function POST(request: Request) {
  return handleAiRoute(request, generateExplanation, "That request is too large.");
}
