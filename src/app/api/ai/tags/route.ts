import { generateAutoTags } from "@/lib/ai/auto-tags";
import { handleAiRoute } from "@/lib/ai/route";

/** Headroom for a slow but healthy call; the client itself times out at ~40s. */
export const maxDuration = 60;

/**
 * POST /api/ai/tags
 *
 * Suggests tags for an item from its form values (JSON), so it works before
 * the item has been saved. Nothing is stored: the user accepts suggestions
 * into the form, then saves as usual.
 */
export function POST(request: Request) {
  return handleAiRoute(request, generateAutoTags, "That item is too large to tag.");
}
