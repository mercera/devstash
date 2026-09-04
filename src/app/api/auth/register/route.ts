import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { issueEmailVerification } from "@/lib/email-verification";
import { isEmailVerificationEnabled } from "@/lib/flags";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations/auth";

const BCRYPT_ROUNDS = 12;

type RegisterResponse =
  | {
      success: true;
      data: {
        id: string;
        name: string | null;
        email: string;
        /**
         * Whether this account has to confirm its address before it can sign
         * in. Mirrors the `EMAIL_VERIFICATION_ENABLED` flag, and is how the
         * sign-up form learns the answer without the flag being exposed to the
         * browser.
         */
        verificationRequired: boolean;
        /**
         * Whether the verification email actually went out. The account exists
         * either way; the sign-up form uses this to decide between "check your
         * inbox" and "we could not send it, try again". Always false when
         * `verificationRequired` is false — nothing was sent.
         */
        emailSent: boolean;
      };
    }
  | { success: false; error: string; issues?: Record<string, string[]> };

/**
 * POST /api/auth/register
 *
 * Creates a password account. This is a route handler rather than a Server
 * Action because it is a public endpoint the future sign-up form, and any
 * later CLI or mobile client, calls directly — and because the specific status
 * codes (409 on a taken email, 422 on bad input) are part of its contract.
 *
 * Sign-in itself stays with Auth.js; this only writes the `User` row that the
 * Credentials provider in `src/auth.ts` later reads.
 */
export async function POST(request: Request): Promise<NextResponse<RegisterResponse>> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Request body must be valid JSON" },
      { status: 400 },
    );
  }

  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Please check the details you entered",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 422 },
    );
  }

  const { name, email, password } = parsed.data;

  try {
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "An account with this email already exists" },
        { status: 409 },
      );
    }

    // `emailVerified` stays null either way. When verification is required it
    // is the link below that fills it in (see `authorize` in `src/auth.ts`);
    // when it is not, the column stays honest — nothing has confirmed this
    // address, and stamping it would make a waved-through account
    // indistinguishable from a genuinely verified one.
    const user = await prisma.user.create({
      data: { name, email, password: await bcrypt.hash(password, BCRYPT_ROUNDS) },
      select: { id: true, name: true, email: true },
    });

    const verificationRequired = isEmailVerificationEnabled();

    // Deliberately not fatal. The row is committed, so failing the request here
    // would leave an account the caller believes was never created; the sign-up
    // form offers a resend instead.
    const emailSent = verificationRequired
      ? await issueEmailVerification(user.email, user.name)
      : false;

    return NextResponse.json(
      { success: true, data: { ...user, verificationRequired, emailSent } },
      { status: 201 },
    );
  } catch (error) {
    // Two requests can pass the existence check at once; the unique index on
    // `User.email` is what actually decides, so a P2002 here is still a
    // duplicate rather than a server fault.
    if (isUniqueConstraintError(error)) {
      return NextResponse.json(
        { success: false, error: "An account with this email already exists" },
        { status: 409 },
      );
    }

    console.error("Failed to register user:", error);

    return NextResponse.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "P2002"
  );
}
