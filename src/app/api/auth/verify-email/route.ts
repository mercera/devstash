import { NextResponse } from "next/server";

import { verifyEmailWithToken } from "@/lib/email-verification";

/** Where each outcome sends the browser. */
const SIGN_IN_VERIFIED = "/sign-in?verified=1";
const VERIFY_EMAIL_PATH = "/verify-email";

/**
 * GET /api/auth/verify-email?token=…
 *
 * The target of the link in the verification email. A route handler rather than
 * a page because clicking the link has to *change* something: a server
 * component that consumed the token during render would burn it on any RSC
 * re-fetch, and there would be no clean way to end on a different URL.
 *
 * Always ends in a redirect, so the token never stays in the address bar or
 * leaks through a `Referer` header to whatever the user visits next.
 *
 * Deliberately **not** gated on `EMAIL_VERIFICATION_ENABLED`. Turning the flag
 * off stops the app requiring and sending verification; it should not strand a
 * link already sitting in someone's inbox from when it was on. Honouring one is
 * harmless — the address really was confirmed — and the alternative is a dead
 * link with no explanation.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const token = new URL(request.url).searchParams.get("token");

  if (!token) {
    return redirectTo(`${VERIFY_EMAIL_PATH}?error=invalid`, request);
  }

  const result = await verifyEmailWithToken(token);

  if (result.status === "verified") {
    return redirectTo(SIGN_IN_VERIFIED, request);
  }

  if (result.status === "expired") {
    // The address is carried through so the resend form is already filled in.
    const params = new URLSearchParams({ error: "expired", email: result.email });

    return redirectTo(`${VERIFY_EMAIL_PATH}?${params}`, request);
  }

  return redirectTo(`${VERIFY_EMAIL_PATH}?error=invalid`, request);
}

function redirectTo(path: string, request: Request): NextResponse {
  return NextResponse.redirect(new URL(path, request.url));
}
