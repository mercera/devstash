/**
 * Prisma-backed user queries.
 *
 * No auth/session exists yet, so "the current user" is the seeded demo user
 * (see `prisma/seed.ts`) until real sessions land.
 */

import { prisma } from "@/lib/prisma";
import type { CurrentUser } from "@/types";

const DEMO_USER_ID = "seed-user-demo";

/** The signed-in user for the sidebar footer, or null if the row is missing. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  return prisma.user.findUnique({
    where: { id: DEMO_USER_ID },
    select: { name: true, email: true, image: true },
  });
}
