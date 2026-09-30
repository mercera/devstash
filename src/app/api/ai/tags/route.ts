import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { generateAutoTags, type AutoTagsResponse } from "@/lib/ai/auto-tags";

/** Headroom for a slow but healthy call; the client itself times out at ~40s. */
export const maxDuration = 60;

/** The client trims content to 2,000 characters, so a real request is far smaller. */
const MAX_BODY_BYTES = 64 * 1024;

function fail(error: string, status: number): NextResponse<AutoTagsResponse> {
  return NextResponse.json({ success: false, error }, { status });
}

/**
 * POST /api/ai/tags
 *
 * Suggests tags for an item from its form values (JSON), so it works before
 * the item has been saved. Nothing is stored: the user accepts suggestions
 * into the form, then saves as usual.
 *
 * A route handler rather than a server action: server actions from one page
 * run one at a time, so a slow AI call would hold up Save, and they cannot be
 * cancelled. Here `request.signal` reaches OpenAI, so closing the form stops
 * the generation. `/api/*` is outside the proxy, so the session is checked in
 * `generateAutoTags`.
 */
export async function POST(request: Request): Promise<NextResponse<AutoTagsResponse>> {
  if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES) {
    return fail("That item is too large to tag.", 413);
  }

  // Malformed JSON becomes null and fails validation, after the session and
  // plan checks, so an anonymous caller always gets 401.
  const body: unknown = await request.json().catch(() => null);
  const user = (await auth())?.user;
  const result = await generateAutoTags(
    user?.id ? { id: user.id, isPro: user.isPro } : null,
    body,
    request.signal,
  );

  // The client went away; nobody reads this.
  if (!result) return fail("Request cancelled.", 499);

  return NextResponse.json(result.body, {
    status: result.status,
    headers: result.retryAfter ? { "Retry-After": String(result.retryAfter) } : undefined,
  });
}
