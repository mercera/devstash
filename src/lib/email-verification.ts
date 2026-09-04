import { createHash, randomBytes } from "node:crypto";

import { sendVerificationEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

/** How long an emailed link stays usable. */
export const VERIFICATION_TOKEN_TTL_HOURS = 24;

/**
 * `VerificationToken` is NextAuth's shared table. Namespacing the identifier
 * keeps this flow's rows from colliding with a magic-link provider's if one is
 * ever added — without it, issuing a verification link would delete a pending
 * sign-in link for the same address, and `verifyEmailWithToken` would happily
 * burn one.
 */
const IDENTIFIER_PREFIX = "email-verification:";

/** Where the verification link points. */
const VERIFY_PATH = "/api/auth/verify-email";

/**
 * Only the SHA-256 of a token is stored, so a leaked database dump cannot be
 * replayed into a verified account. The raw value exists only in the email.
 * A plain hash is right here where bcrypt would not be: the token is 256 bits
 * of CSPRNG output, so there is nothing to brute-force.
 */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function identifierFor(email: string): string {
  return `${IDENTIFIER_PREFIX}${email}`;
}

/**
 * Absolute base for links that are opened outside the app, where there is no
 * request to derive an origin from. `AUTH_URL` is Auth.js's own convention, so
 * a deployment that sets it for OAuth callbacks gets this for free.
 */
function getBaseUrl(): string {
  return process.env.AUTH_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
}

/**
 * Issues a fresh verification link and emails it.
 *
 * Any earlier token for the address is dropped first, so only the most recent
 * email works — a user who clicks "resend" twice cannot be confused by which
 * of the two links is live.
 *
 * Returns whether the email was accepted by the provider. Callers are expected
 * to carry on regardless and offer a resend; the account is already created
 * and the token is already valid.
 */
export async function issueEmailVerification(
  email: string,
  name: string | null,
): Promise<boolean> {
  const token = randomBytes(32).toString("base64url");
  const identifier = identifierFor(email);

  await prisma.verificationToken.deleteMany({ where: { identifier } });

  await prisma.verificationToken.create({
    data: {
      identifier,
      token: hashToken(token),
      expires: new Date(Date.now() + VERIFICATION_TOKEN_TTL_HOURS * 60 * 60 * 1000),
    },
  });

  const verifyUrl = `${getBaseUrl()}${VERIFY_PATH}?token=${encodeURIComponent(token)}`;

  // The sandbox sender only delivers to the Resend account owner, so without
  // this there is no way to walk the flow locally. Never outside development —
  // the line is a working link to a verified session.
  if (process.env.NODE_ENV !== "production") {
    console.log(`[email-verification] link for ${email}: ${verifyUrl}`);
  }

  return sendVerificationEmail({
    to: email,
    name,
    verifyUrl,
    expiresInHours: VERIFICATION_TOKEN_TTL_HOURS,
  });
}

export type VerificationResult =
  | { status: "verified"; email: string }
  | { status: "expired"; email: string }
  | { status: "invalid" };

/**
 * Consumes a link and marks the address verified.
 *
 * The token is single-use: the delete is what claims it, so two clicks on the
 * same link race on the row and only one can win. An already-verified user
 * whose second click lost that race sees the "invalid link" state rather than a
 * second success — acceptable, since the account is verified either way.
 */
export async function verifyEmailWithToken(rawToken: string): Promise<VerificationResult> {
  const hashed = hashToken(rawToken);

  const record = await prisma.verificationToken.findUnique({
    where: { token: hashed },
  });

  // A token from some other flow is not ours to consume, so it is left alone.
  if (!record?.identifier.startsWith(IDENTIFIER_PREFIX)) {
    return { status: "invalid" };
  }

  const email = record.identifier.slice(IDENTIFIER_PREFIX.length);

  try {
    await prisma.verificationToken.delete({ where: { token: hashed } });
  } catch {
    // Someone else deleted the row between the read and here.
    return { status: "invalid" };
  }

  // Checked after the delete so an expired link is also cleaned up.
  if (record.expires.getTime() < Date.now()) {
    return { status: "expired", email };
  }

  try {
    await prisma.user.update({
      where: { email },
      data: { emailVerified: new Date() },
    });
  } catch (error) {
    // The account was deleted while the link sat in an inbox.
    console.error("Could not mark email verified:", error);

    return { status: "invalid" };
  }

  return { status: "verified", email };
}

/**
 * Sends another link for an address that is still waiting on one.
 *
 * Deliberately silent about the outcome: an unknown address, an already
 * verified account and a GitHub-only account all do nothing and look identical
 * to the caller, so this cannot be used to enumerate who has an account.
 */
export async function resendEmailVerification(email: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { name: true, email: true, password: true, emailVerified: true },
  });

  // Nothing to verify for an OAuth-only account — it has no password sign-in
  // to unblock, and the gate never applies to it.
  if (!user?.password || user.emailVerified) {
    return;
  }

  await issueEmailVerification(user.email, user.name);
}
