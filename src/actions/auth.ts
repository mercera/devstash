"use server";

import { AuthError } from "next-auth";

import { signIn, signOut } from "@/auth";
import { CREDENTIALS_PROVIDER_ID, SIGN_IN_PATH } from "@/auth.config";
import { signInSchema } from "@/lib/validations/auth";

/** Where a successful sign-in lands when no callback URL was supplied. */
const DEFAULT_REDIRECT = "/dashboard";

export interface SignInState {
  /** Message shown above the form. */
  error?: string;
  /** Per-field validation messages, keyed by input name. */
  issues?: Partial<Record<"email" | "password", string[]>>;
  /** Echoed back so a failed submit does not clear what was typed. */
  email?: string;
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
