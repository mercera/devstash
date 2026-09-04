import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations/auth";

const BCRYPT_ROUNDS = 12;

type RegisterResponse =
  | { success: true; data: { id: string; name: string | null; email: string } }
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

    const user = await prisma.user.create({
      data: { name, email, password: await bcrypt.hash(password, BCRYPT_ROUNDS) },
      select: { id: true, name: true, email: true },
    });

    return NextResponse.json({ success: true, data: user }, { status: 201 });
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
