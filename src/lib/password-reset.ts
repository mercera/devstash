import { sendPasswordResetEmail } from "@/lib/email";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { RESET_PASSWORD_PATH } from "@/lib/routes";
import {
  createToken,
  getBaseUrl,
  hashToken,
  PASSWORD_RESET_PREFIX,
} from "@/lib/tokens";

/**
 * How long a reset link stays usable.
 *
 * Deliberately much shorter than a verification link's 24 hours: that one only
 * confirms an address the user already controls, while this one hands over the
 * account to whoever holds it.
 */
export const PASSWORD_RESET_TOKEN_TTL_HOURS = 1;

/**
 * Reset links share NextAuth's `VerificationToken` table with the email
 * verification flow, so both namespace their identifier. Nothing here will read
 * or delete a row belonging to another flow — see `src/lib/email-verification.ts`.
 */
const IDENTIFIER_PREFIX = PASSWORD_RESET_PREFIX;


function identifierFor(email: string): string {
  return `${IDENTIFIER_PREFIX}${email}`;
}

/**
 * Mints a reset link and emails it.
 *
 * Any earlier link for the address is dropped first, so only the most recent
 * email works. That also means asking again is how you invalidate a link you
 * did not want sent.
 *
 * Returns whether the provider accepted the message. Callers are not expected
 * to surface that — see `requestPasswordReset`.
 */
async function issuePasswordReset(email: string, name: string | null): Promise<boolean> {
  const token = createToken();
  const identifier = identifierFor(email);

  await prisma.verificationToken.deleteMany({ where: { identifier } });

  await prisma.verificationToken.create({
    data: {
      identifier,
      token: hashToken(token),
      expires: new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_HOURS * 60 * 60 * 1000),
    },
  });

  const resetUrl = `${getBaseUrl()}${RESET_PASSWORD_PATH}?token=${encodeURIComponent(token)}`;

  // Resend's sandbox sender only delivers to the account owner, so without this
  // the flow cannot be walked locally. Never outside development — the line is
  // a working link to someone's account.
  if (process.env.NODE_ENV !== "production") {
    console.log(`[password-reset] link for ${email}: ${resetUrl}`);
  }

  return sendPasswordResetEmail({
    to: email,
    name,
    resetUrl,
    expiresInHours: PASSWORD_RESET_TOKEN_TTL_HOURS,
  });
}

/**
 * Handles a "forgot password" request for an address.
 *
 * Deliberately silent about the outcome: an unknown address and a real account
 * look identical to the caller, so the form above this cannot be used to find
 * out who has an account.
 *
 * A GitHub-only account (`password` is null) is a no-op. It has no password to
 * reset, and letting a reset set one would attach a credentials login to an
 * account that until now existed only behind GitHub — a change the owner never
 * asked for, available to anyone who reaches that inbox.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { name: true, email: true, password: true },
  });

  if (!user?.password) {
    return;
  }

  await issuePasswordReset(user.email, user.name);
}

export type PasswordResetTokenCheck =
  | { status: "valid" }
  | { status: "expired"; email: string }
  | { status: "invalid" };

/**
 * Reads a token without consuming it, so `/reset-password` can decide whether
 * to render the form at all rather than letting someone type a new password
 * twice only to be told the link was dead.
 *
 * The token is still re-checked when the form is submitted — this is a courtesy,
 * not the gate.
 */
export async function checkPasswordResetToken(
  rawToken: string,
): Promise<PasswordResetTokenCheck> {
  const record = await prisma.verificationToken.findUnique({
    where: { token: hashToken(rawToken) },
  });

  // A token from some other flow is not ours to report on, let alone consume.
  if (!record?.identifier.startsWith(IDENTIFIER_PREFIX)) {
    return { status: "invalid" };
  }

  if (record.expires.getTime() < Date.now()) {
    return { status: "expired", email: record.identifier.slice(IDENTIFIER_PREFIX.length) };
  }

  return { status: "valid" };
}

export type PasswordResetResult =
  | { status: "reset"; email: string }
  | { status: "expired"; email: string }
  | { status: "invalid" };

/**
 * Consumes a link and writes the new password.
 *
 * The token is single-use, and the delete is what claims it: two submissions of
 * the same link race on the row and only one can win. The expiry is checked
 * after the delete so a stale link is cleaned up rather than left to rot.
 */
export async function resetPasswordWithToken(
  rawToken: string,
  newPassword: string,
): Promise<PasswordResetResult> {
  const hashed = hashToken(rawToken);

  const record = await prisma.verificationToken.findUnique({
    where: { token: hashed },
  });

  if (!record?.identifier.startsWith(IDENTIFIER_PREFIX)) {
    return { status: "invalid" };
  }

  const email = record.identifier.slice(IDENTIFIER_PREFIX.length);

  try {
    await prisma.verificationToken.delete({ where: { token: hashed } });
  } catch {
    // Someone else claimed the row between the read and here.
    return { status: "invalid" };
  }

  if (record.expires.getTime() < Date.now()) {
    return { status: "expired", email };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, password: true, emailVerified: true },
  });

  // The account was deleted while the link sat in an inbox, or lost its
  // password some other way. Either way there is nothing to reset.
  if (!user?.password) {
    return { status: "invalid" };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: await hashPassword(newPassword),
      // Reaching here proves control of the inbox, which is the whole of what
      // verification asks for. Without this an account that reset its password
      // could still be turned away at sign-in with no way forward. Only ever
      // fills the gap — an already-verified account keeps its original date.
      ...(user.emailVerified ? {} : { emailVerified: new Date() }),
    },
  });

  return { status: "reset", email };
}
