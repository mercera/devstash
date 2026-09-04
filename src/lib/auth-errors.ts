import { CredentialsSignin } from "next-auth";

/**
 * Marks a sign-in that was refused because the address is not confirmed yet.
 *
 * `code` is what survives the trip out of Auth.js — the callback route rethrows
 * any `AuthError` untouched, and `signIn()` in a server action rethrows it
 * again rather than redirecting, so `src/actions/auth.ts` can tell this apart
 * from a wrong password. On the redirect path (a plain form POST, which this
 * app does not use) the same value lands in `?code=`.
 *
 * Reaching this needs the correct password, so naming the reason leaks nothing
 * an attacker could not already see.
 */
export const EMAIL_NOT_VERIFIED_CODE = "email_not_verified";

export class EmailNotVerifiedError extends CredentialsSignin {
  code = EMAIL_NOT_VERIFIED_CODE;
}

/** Narrows a caught value to the refusal above. */
export function isEmailNotVerifiedError(error: unknown): boolean {
  return error instanceof CredentialsSignin && error.code === EMAIL_NOT_VERIFIED_CODE;
}
