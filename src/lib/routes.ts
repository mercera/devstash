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
