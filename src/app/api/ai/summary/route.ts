import { generateAutoSummary } from "@/lib/ai/auto-summary";
import { handleAiRoute } from "@/lib/ai/route";

/** Headroom for a slow but healthy call; the client itself times out at ~40s. */
export const maxDuration = 60;

/**
 * POST /api/ai/summary
 *
 * Writes a one- or two-sentence description from an item's form values
 * (JSON), so it works before the item has been saved. Nothing is stored: the
 * form fills its Description input, and the user saves as usual.
 */
export function POST(request: Request) {
  return handleAiRoute(
    request,
    generateAutoSummary,
    "That item is too large to summarise.",
  );
}
