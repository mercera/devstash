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

/**
 * Marks a sign-in refused because the caller has made too many attempts.
 *
 * Thrown rather than returned as null for the same reason
 * `EmailNotVerifiedError` is: null collapses into the generic "invalid email or
 * password", which would be a lie here and would leave the visitor retrying a
 * password that is already correct.
 *
 * It rides the same rail out of Auth.js — the callback route rethrows any
 * `AuthError` untouched, and `signIn()` in a server action rethrows it again —
 * so the instance the form catches is this very object, `retryAfterSeconds`
 * included.
 *
 * Unlike the unverified-address refusal, this one is reachable *without* a
 * correct password. It reveals nothing regardless: the limit is consumed before
 * the account is looked up, so it fires identically for an address that exists
 * and one that does not.
 */
export const RATE_LIMITED_CODE = "rate_limited";

export class RateLimitedError extends CredentialsSignin {
  code = RATE_LIMITED_CODE;

  constructor(readonly retryAfterSeconds: number) {
    super();
  }
}

/** Narrows a caught value to the refusal above. */
export function isRateLimitedError(error: unknown): error is RateLimitedError {
  return error instanceof RateLimitedError;
}
