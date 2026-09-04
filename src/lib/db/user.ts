/**
 * Prisma-backed user queries.
 */

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { CurrentUser } from "@/types";

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
