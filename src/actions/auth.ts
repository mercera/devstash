"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";

import { signIn, signOut } from "@/auth";
import { CREDENTIALS_PROVIDER_ID, SIGN_IN_PATH } from "@/auth.config";
import { isEmailNotVerifiedError, isRateLimitedError } from "@/lib/auth-errors";
import {
  resendEmailVerification,
  VERIFICATION_TOKEN_TTL_HOURS,
} from "@/lib/email-verification";
import { isEmailVerificationEnabled } from "@/lib/flags";
import { formatHours } from "@/lib/format";
import {
  PASSWORD_RESET_TOKEN_TTL_HOURS,
  requestPasswordReset,
  resetPasswordWithToken,
} from "@/lib/password-reset";
import {
  checkRateLimit,
  getClientIp,
  ipAndEmailKey,
  rateLimitMessage,
  retryAfterSeconds,
  type RateLimitName,
} from "@/lib/rate-limit";
import { FORGOT_PASSWORD_PATH } from "@/lib/routes";
import { resetPasswordSchema, signInSchema } from "@/lib/validations/auth";

/** Where a successful sign-in lands when no callback URL was supplied. */
const DEFAULT_REDIRECT = "/dashboard";

/**
 * Rate limits an action, returning the message to show if the caller is over
 * the limit and `null` if they are not.
 *
 * A Server Action has no response of its own, so unlike
 * `POST /api/auth/register` it cannot answer 429 or set `Retry-After`. The
 * refusal travels back through the same result shape as every other failure,
 * flagged with `rateLimited` so the form can raise a toast for it.
 *
 * `headers()` are those of the request the action was invoked from, so the
 * address is the browser's rather than the server's.
 */
async function rateLimitFailure(
  name: RateLimitName,
  identify: (ip: string) => string = (ip) => ip,
): Promise<string | null> {
  const ip = getClientIp(await headers());
  const limit = await checkRateLimit(name, identify(ip));

  return limit.success ? null : rateLimitMessage(retryAfterSeconds(limit.reset));
}

export interface SignInState {
  /** Message shown above the form. */
  error?: string;
  /** Per-field validation messages, keyed by input name. */
  issues?: Partial<Record<"email" | "password", string[]>>;
  /** Echoed back so a failed submit does not clear what was typed. */
  email?: string;
  /**
   * Set when the password was right but the address is not confirmed. The form
   * turns this into a link to the resend page rather than a dead end.
   */
  needsVerification?: boolean;
  /** Set when the attempt was refused by the rate limiter, not by Auth.js. */
  rateLimited?: boolean;
}

/**
 * A callback URL only ever comes from the query string, so it is attacker
 * controlled. Auth.js's own `redirect` callback already refuses other origins,
 * but this rejects anything that is not a plain in-app path before it gets
 * that far — `//evil.com` is a protocol-relative URL, not a local route.
 */
function toSafeRedirect(callbackUrl: FormDataEntryValue | null): string {
  if (typeof callbackUrl !== "string") {
    return DEFAULT_REDIRECT;
  }

  // `//evil.com` is a protocol-relative URL, and browsers normalise the
  // backslash in `/\evil.com` to the same thing — neither is a local route.
  if (!callbackUrl.startsWith("/") || /^\/[/\\]/.test(callbackUrl)) {
    return DEFAULT_REDIRECT;
  }

  return callbackUrl;
}

/**
 * Email/password sign-in for the custom `/sign-in` form.
 *
 * On success `signIn` throws a redirect, so this only ever returns on failure.
 * Auth.js reports one generic `CredentialsSignin` whether the email is unknown
 * or the password is wrong (see `src/auth.ts`), so there is a single message
 * to show — nothing here can distinguish the two, by design.
 */
export async function signInWithCredentials(
  _prevState: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "");
  const parsed = signInSchema.safeParse({
    email,
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      error: "Please check the details you entered",
      issues: parsed.error.flatten().fieldErrors,
      email,
    };
  }

  try {
    await signIn(CREDENTIALS_PROVIDER_ID, {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: toSafeRedirect(formData.get("callbackUrl")),
    });
  } catch (error) {
    // Both of these are thrown by `authorize` and rethrown untouched by
    // Auth.js, so they arrive here as the very objects it threw. Checked
    // before the generic branch below, which would otherwise report either
    // one as a bad password.
    if (isRateLimitedError(error)) {
      return {
        error: rateLimitMessage(error.retryAfterSeconds),
        email,
        rateLimited: true,
      };
    }

    if (isEmailNotVerifiedError(error)) {
      return {
        error: "Verify your email address before signing in. Check your inbox for the link.",
        email,
        needsVerification: true,
      };
    }

    if (error instanceof AuthError) {
      // Only a rejected credential is the user's problem. Every other
      // `AuthError` — a missing `AUTH_SECRET`, an adapter fault — is a server
      // misconfiguration, and reporting it as a bad password would hide a real
      // failure behind a message the user can never act on.
      if (error.type === "CredentialsSignin") {
        return { error: "Invalid email or password", email };
      }

      console.error("Sign-in failed:", error);

      return { error: "Something went wrong. Please try again.", email };
    }

    // The success path is a `NEXT_REDIRECT` throw — Next.js needs it to
    // propagate, so anything that is not an auth failure is rethrown.
    throw error;
  }

  return {};
}

/** Hands off to GitHub OAuth. Always ends in a redirect. */
export async function signInWithGitHub(formData: FormData): Promise<void> {
  await signIn("github", {
    redirectTo: toSafeRedirect(formData.get("callbackUrl")),
  });
}

/** Clears the session and returns to the sign-in page. */
export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: SIGN_IN_PATH });
}

/**
 * The single reply the resend form ever gives on success. Identical for an
 * unknown address, an already-verified account, an OAuth-only account and a
 * disabled flag, so none of those can be told apart from the outside.
 */
const NEUTRAL_RESEND_MESSAGE =
  `If that address needs verifying, a new link is on its way. ` +
  `It expires in ${VERIFICATION_TOKEN_TTL_HOURS} hours.`;

export interface ResendVerificationState {
  /** Shown once the request has been handled, whatever the outcome. */
  message?: string;
  /** A malformed address, or a refusal from the rate limiter. */
  error?: string;
  /** Echoed back so the field keeps its value. */
  email?: string;
  /** Set when the attempt was refused by the rate limiter. */
  rateLimited?: boolean;
}

/**
 * Sends another verification link.
 *
 * The confirmation is deliberately non-committal and identical for every
 * address: an unknown email, an already-verified account and a GitHub-only
 * account all look the same here, so this form cannot be used to find out who
 * has an account. Only the shape of the input can fail visibly.
 */
export async function resendVerificationEmail(
  _prevState: ResendVerificationState,
  formData: FormData,
): Promise<ResendVerificationState> {
  const email = String(formData.get("email") ?? "");
  const parsed = signInSchema.shape.email.safeParse(email);

  if (!parsed.success) {
    return { error: "Enter a valid email address", email };
  }

  // Keyed by address as well as IP, per the spec. Consumed before any of the
  // branches below, so being over the limit looks the same for an unknown
  // address, an already-verified one and a disabled flag — which is the
  // same property the neutral message exists to protect.
  const limited = await rateLimitFailure("resendVerification", (ip) =>
    ipAndEmailKey(ip, parsed.data),
  );

  if (limited) {
    return { error: limited, email, rateLimited: true };
  }

  // The page that hosts this form redirects away when verification is off, but
  // the action is a public endpoint in its own right — sending a link nobody is
  // being asked for would be pure noise. The reply is unchanged either way,
  // which is the same reason it says nothing about unknown addresses.
  if (!isEmailVerificationEnabled()) {
    return { message: NEUTRAL_RESEND_MESSAGE, email };
  }

  try {
    await resendEmailVerification(parsed.data);
  } catch (error) {
    console.error("Failed to resend verification email:", error);

    return { error: "Something went wrong. Please try again.", email };
  }

  return { message: NEUTRAL_RESEND_MESSAGE, email };
}

/**
 * The single reply the forgot-password form ever gives on success. Identical
 * for an unknown address, a real account and a GitHub-only one, so the form
 * cannot be used to find out who has an account.
 */
const NEUTRAL_RESET_MESSAGE =
  `If that address has a password account, a reset link is on its way. ` +
  `It expires in ${formatHours(PASSWORD_RESET_TOKEN_TTL_HOURS)}.`;

export interface RequestPasswordResetState {
  /** Shown once the request has been handled, whatever the outcome. */
  message?: string;
  /** A malformed address, or a refusal from the rate limiter. */
  error?: string;
  /** Echoed back so the field keeps its value. */
  email?: string;
  /** Set when the attempt was refused by the rate limiter. */
  rateLimited?: boolean;
}

/**
 * Starts a password reset.
 *
 * Mirrors `resendVerificationEmail`: only the shape of the input can fail
 * visibly, and every other outcome looks the same from outside. Unlike that
 * one, this is not gated on `EMAIL_VERIFICATION_ENABLED` — being unable to sign
 * in is a problem whether or not the app is asking anyone to confirm addresses.
 */
export async function requestPasswordResetEmail(
  _prevState: RequestPasswordResetState,
  formData: FormData,
): Promise<RequestPasswordResetState> {
  const email = String(formData.get("email") ?? "");
  const parsed = signInSchema.shape.email.safeParse(email);

  if (!parsed.success) {
    return { error: "Enter a valid email address", email };
  }

  // Keyed by IP alone, per the spec — this caps how many reset emails one
  // caller can trigger at all, which keying on the address would let them
  // sidestep by varying it.
  const limited = await rateLimitFailure("forgotPassword");

  if (limited) {
    return { error: limited, email, rateLimited: true };
  }

  try {
    await requestPasswordReset(parsed.data);
  } catch (error) {
    console.error("Failed to send password reset email:", error);

    return { error: "Something went wrong. Please try again.", email };
  }

  return { message: NEUTRAL_RESET_MESSAGE, email };
}

export interface ResetPasswordState {
  /** Message shown above the form. */
  error?: string;
  /** Per-field validation messages, keyed by input name. */
  issues?: Partial<Record<"password" | "confirmPassword", string[]>>;
  /** Set when the attempt was refused by the rate limiter. */
  rateLimited?: boolean;
}

/**
 * Finishes a password reset.
 *
 * Only a problem with what was typed keeps the visitor on this page. A link
 * that turned out to be dead sends them back to `/forgot-password`, which is
 * where they can do something about it — leaving them on a form whose token no
 * longer works would be a dead end.
 *
 * `redirect` throws, so every call to it sits outside the try block below.
 */
export async function resetPassword(
  _prevState: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  // Keyed by IP alone: the token is the secret being guessed, and keying on it
  // would hand every guess its own fresh budget. Checked first so a flood of
  // tokens costs nothing but this lookup.
  const limited = await rateLimitFailure("resetPassword");

  if (limited) {
    return { error: limited, rateLimited: true };
  }

  const token = String(formData.get("token") ?? "");
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  // Checked after the password, so someone who mistypes their new password on a
  // dead link is told about the link rather than about the typo.
  if (!parsed.success) {
    return {
      error: "Please check the details you entered",
      issues: parsed.error.flatten().fieldErrors,
    };
  }

  if (!token) {
    redirect(`${FORGOT_PASSWORD_PATH}?error=invalid`);
  }

  let result;

  try {
    result = await resetPasswordWithToken(token, parsed.data.password);
  } catch (error) {
    console.error("Failed to reset password:", error);

    return { error: "Something went wrong. Please try again." };
  }

  if (result.status === "expired") {
    // The address is carried through so the form on the other side is prefilled.
    const params = new URLSearchParams({ error: "expired", email: result.email });

    redirect(`${FORGOT_PASSWORD_PATH}?${params}`);
  }

  if (result.status === "invalid") {
    redirect(`${FORGOT_PASSWORD_PATH}?error=invalid`);
  }

  redirect(`${SIGN_IN_PATH}?reset=1`);
}
