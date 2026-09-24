/**
 * Route paths shared between server and client code.
 *
 * These live apart from the modules that own the flows because client
 * components need them too: importing `src/lib/password-reset.ts` for a string
 * would pull Prisma, bcrypt and the Resend client into the browser bundle.
 *
 * `SIGN_IN_PATH` is not here — Auth.js needs it in `src/auth.config.ts` for
 * `pages.signIn`, which is its own single source of truth.
 */

/** Where a password reset starts, and where a dead link sends the visitor. */
export const FORGOT_PASSWORD_PATH = "/forgot-password";

/** Where the emailed reset link points. */
export const RESET_PASSWORD_PATH = "/reset-password";

/** Where a successful sign-in lands when no usable callback URL was supplied. */
export const DEFAULT_SIGN_IN_REDIRECT = "/dashboard";

/** Stand-in origin for resolving a callback URL. Never contacted. */
const PLACEHOLDER_ORIGIN = "http://devstash.invalid";

/**
 * Reduces an attacker-controlled callback URL to an in-app path, or the
 * default when it is not one.
 *
 * Prefix checks alone are not enough: the browser's URL parser treats `\` as
 * `/` and strips tabs and newlines, so `/\evil.com` and `/<tab>/evil.com` both
 * resolve to `https://evil.com`. The value is resolved the way a browser would
 * and must keep the placeholder origin. The normalised path is then checked
 * again, because dot segments can produce one (`/.//evil.com` → `//evil.com`).
 */
export function toSafeRedirect(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/")) {
    return DEFAULT_SIGN_IN_REDIRECT;
  }

  let url: URL;

  try {
    url = new URL(value, PLACEHOLDER_ORIGIN);
  } catch {
    return DEFAULT_SIGN_IN_REDIRECT;
  }

  const path = `${url.pathname}${url.search}${url.hash}`;

  if (url.origin !== PLACEHOLDER_ORIGIN || path.startsWith("//")) {
    return DEFAULT_SIGN_IN_REDIRECT;
  }

  return path;
}
