"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";

import { signIn, signOut } from "@/auth";
import { CREDENTIALS_PROVIDER_ID, SIGN_IN_PATH } from "@/auth.config";
import { isEmailNotVerifiedError } from "@/lib/auth-errors";
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
import { FORGOT_PASSWORD_PATH } from "@/lib/routes";
import { resetPasswordSchema, signInSchema } from "@/lib/validations/auth";

/** Where a successful sign-in lands when no callback URL was supplied. */
const DEFAULT_REDIRECT = "/dashboard";

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
    // Thrown by `authorize` once the password has matched but the address has
    // not been confirmed. Checked before the generic branch below, which would
    // otherwise report it as a bad password.
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
  /** A malformed address — the only failure this form can report. */
  error?: string;
  /** Echoed back so the field keeps its value. */
  email?: string;
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
  /** A malformed address — the only failure this form can report. */
  error?: string;
  /** Echoed back so the field keeps its value. */
  email?: string;
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
