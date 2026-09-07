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
