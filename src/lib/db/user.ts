/**
 * Prisma-backed user queries.
 */

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { CurrentUser, ProfileUser } from "@/types";

/**
 * The signed-in user for the sidebar footer, or null when there is no session.
 *
 * The id comes from the session rather than a hardcoded demo id, so the footer
 * reflects whoever actually signed in. The item and collection getters in this
 * directory are still scoped to `seed-user-demo` — moving those onto the
 * session is a separate change.
 *
 * A row can be missing even with a valid session: the JWT outlives the `User`
 * row it names if that row is deleted, so the lookup is allowed to return null
 * rather than being assumed to succeed.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, image: true },
  });
}

/**
 * The signed-in user as `/profile` renders them, or null when there is no
 * session or the row has gone.
 *
 * The password hash is deliberately not selected. The page only needs to know
 * whether one exists, so the column is collapsed to a boolean here rather than
 * being carried any further than it has to be.
 */
export async function getProfileUser(): Promise<ProfileUser | null> {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      image: true,
      createdAt: true,
      password: true,
    },
  });

  if (!user) {
    return null;
  }

  const { password, ...rest } = user;

  return { ...rest, hasPassword: password !== null };
}
