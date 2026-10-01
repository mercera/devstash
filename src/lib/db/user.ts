/**
 * Prisma-backed user queries.
 */

import {
  parseEditorPreferences,
  type EditorPreferences,
} from "@/lib/editor-preferences";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import { linkTokenIdentifiersFor } from "@/lib/tokens";
import type { CurrentUser, ProfileUser } from "@/types";

/**
 * The signed-in user for the sidebar footer, or null when there is no session.
 *
 * The id comes from the session rather than a hardcoded demo id, so the footer
 * reflects whoever actually signed in.
 *
 * A row can be missing even with a valid session: the JWT outlives the `User`
 * row it names if that row is deleted, so the lookup is allowed to return null
 * rather than being assumed to succeed.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const userId = await getSessionUserId();

  if (!userId) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, image: true },
  });
}

/**
 * The signed-in user as `/profile` and `/settings` render them, or null when
 * there is no session or the row has gone.
 *
 * The password hash is deliberately not selected. The page only needs to know
 * whether one exists, so the column is collapsed to a boolean here rather than
 * being carried any further than it has to be.
 */
export async function getProfileUser(): Promise<ProfileUser | null> {
  const userId = await getSessionUserId();

  if (!userId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
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

/**
 * The user's editor settings, with defaults for any that were never saved.
 * A missing row reads as defaults too; there is nothing to show otherwise.
 */
export async function getEditorPreferences(
  userId: string,
): Promise<EditorPreferences> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { editorPreferences: true },
  });

  return parseEditorPreferences(user?.editorPreferences);
}

/**
 * Replaces the user's editor settings. Returns false when the row has gone —
 * a session can outlive its `User` row.
 */
export async function updateEditorPreferences(
  userId: string,
  preferences: EditorPreferences,
): Promise<boolean> {
  const { count } = await prisma.user.updateMany({
    where: { id: userId },
    data: { editorPreferences: { ...preferences } },
  });

  return count > 0;
}

/**
 * The user's password hash, or null when there is none to check against: a
 * GitHub-only account, or a row that has gone.
 */
export async function getPasswordHash(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { password: true },
  });

  return user?.password ?? null;
}

/** Replaces the user's password hash. Throws when the row has gone. */
export async function setPasswordHash(
  userId: string,
  passwordHash: string,
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { password: passwordHash },
  });
}

/**
 * What deleting an account needs before it starts: the address its link
 * tokens are keyed on, and the Stripe customer to cancel. Null when the row
 * has gone.
 */
export async function getAccountForDeletion(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, stripeCustomerId: true },
  });
}

/**
 * Deletes the user and everything they own, in one transaction. The order
 * matters and mirrors `scripts/delete-users.ts`:
 *
 * - **Items first.** `Item.type` is `onDelete: Restrict`, so a user's own
 *   custom `ItemType` cannot be cascaded away while their items still point at
 *   it. Clearing the items removes that dependency; `ItemTag` rows cascade with
 *   them.
 * - **The user next.** Collections, tags, custom types, accounts and sessions
 *   all cascade from the `User` row.
 * - **Verification tokens by hand.** `VerificationToken` has no foreign key to
 *   `User` — it is keyed on a free-text identifier — so nothing cascades it.
 *   Both emailed-link flows namespace their identifiers, and the bare address
 *   is swept too in case a magic-link provider is ever added.
 */
export async function deleteUserAccount(userId: string, email: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.item.deleteMany({ where: { userId } });
    await tx.user.delete({ where: { id: userId } });
    await tx.verificationToken.deleteMany({
      where: { identifier: { in: linkTokenIdentifiersFor(email) } },
    });
  });
}
