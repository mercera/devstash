import { createHash, randomBytes } from "node:crypto";

/**
 * Shared plumbing for the flows that email someone a single-use link —
 * address verification and password reset.
 *
 * Both mint the same kind of token and store it the same way, so the primitives
 * live here rather than being copied per flow. What differs between them — the
 * identifier namespace, the lifetime, what consuming the token does — stays in
 * the flow's own module.
 */

/** A fresh 256-bit link token, URL-safe so it survives a query string intact. */
export function createToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Only the SHA-256 of a token is ever stored, so a leaked database dump cannot
 * be replayed into a verified account or a password reset. The raw value exists
 * only in the email.
 *
 * A plain hash is right here where bcrypt would be wrong: the token is 256 bits
 * of CSPRNG output, so there is nothing to brute-force and the work factor would
 * buy nothing.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Absolute base for links that are opened outside the app, where there is no
 * request to derive an origin from. `AUTH_URL` is Auth.js's own convention, so
 * a deployment that sets it for OAuth callbacks gets this for free.
 */
export function getBaseUrl(): string {
  return process.env.AUTH_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
}

/**
 * The identifier namespaces the two emailed-link flows write under.
 *
 * `VerificationToken` is NextAuth's shared table, keyed on a free-text
 * identifier, so each flow prefixes its rows to stay clear of the other's — and
 * of a magic-link provider's, if one is ever added. Keeping both names here
 * means anything that has to sweep a user's tokens cannot silently miss a flow
 * that was added later.
 */
export const EMAIL_VERIFICATION_PREFIX = "email-verification:";
export const PASSWORD_RESET_PREFIX = "password-reset:";

/**
 * Every identifier under which a link token could exist for an address.
 *
 * The bare address is included because that is what a magic-link provider would
 * write, and because deleting an account should not leave one behind.
 */
export function linkTokenIdentifiersFor(email: string): string[] {
  return [
    email,
    `${EMAIL_VERIFICATION_PREFIX}${email}`,
    `${PASSWORD_RESET_PREFIX}${email}`,
  ];
}
