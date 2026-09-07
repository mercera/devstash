import bcrypt from "bcryptjs";

/**
 * The bcrypt cost factor, in one place.
 *
 * Registration and password reset both write to `User.password`, and a mismatch
 * between them would quietly leave some accounts cheaper to attack than others.
 * (`prisma/seed.ts` hashes at the same cost but does not import this — it runs
 * outside the app's module graph, under `tsx`.)
 */
const BCRYPT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}
