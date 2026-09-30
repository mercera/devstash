/**
 * The HTTP half every AI route shares: body size, JSON, session and headers.
 * The feature logic stays in a plain function that can be unit tested.
 * Server only.
 */

import { NextResponse } from "next/server";

import { auth } from "@/auth";
import type { AiRouteResponse, AiRouteResult } from "@/lib/ai/run-ai-request";
import type { SessionUser } from "@/lib/session";

/** Every AI client trims what it sends, so a real request is far smaller. */
const MAX_BODY_BYTES = 64 * 1024;

type AiHandler<TData> = (
  user: SessionUser | null,
  body: unknown,
  signal: AbortSignal,
) => Promise<AiRouteResult<TData> | null>;

function fail<TData>(error: string, status: number): NextResponse<AiRouteResponse<TData>> {
  return NextResponse.json({ success: false, error }, { status });
}

/**
 * Route handlers rather than server actions: server actions from one page run
 * one at a time, so a slow AI call would hold up Save, and they cannot be
 * cancelled. Here `request.signal` reaches OpenAI, so closing the form stops
 * the generation. `/api/*` is outside the proxy, so the handler checks the
 * session.
 */
export async function handleAiRoute<TData>(
  request: Request,
  handler: AiHandler<TData>,
  tooLargeMessage: string,
): Promise<NextResponse<AiRouteResponse<TData>>> {
  if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES) {
    return fail(tooLargeMessage, 413);
  }

  // Malformed JSON becomes null and fails validation, after the session and
  // plan checks, so an anonymous caller always gets 401.
  const body: unknown = await request.json().catch(() => null);
  const user = (await auth())?.user;
  const result = await handler(
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
