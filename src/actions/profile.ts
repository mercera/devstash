"use server";

import bcrypt from "bcryptjs";

import { auth, signOut } from "@/auth";
import { SIGN_IN_PATH } from "@/auth.config";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { linkTokenIdentifiersFor } from "@/lib/tokens";
import { changePasswordSchema } from "@/lib/validations/auth";
import {
  DELETE_CONFIRMATION_WORD,
  deleteAccountSchema,
} from "@/lib/validations/profile";

/**
 * Account actions for `/profile`.
 *
 * Both of these are mutations on the **signed-in** user, resolved from the
 * session every time. The read-side getters in `src/lib/db/` are still scoped
 * to the seeded demo account; pointing either action at that id would let any
 * signed-in user rewrite or destroy the demo account.
 */

/** The session's user id, or null when there is no usable session. */
async function requireUserId(): Promise<string | null> {
  const session = await auth();

  return session?.user?.id ?? null;
}

export interface ChangePasswordState {
  /** Message shown above the form. */
  error?: string;
  /** Per-field validation messages, keyed by input name. */
  issues?: Partial<
    Record<"currentPassword" | "password" | "confirmPassword", string[]>
  >;
  /** Set once the password has actually been written. */
  success?: boolean;
}

/**
 * Replaces the signed-in user's password.
 *
 * The current password is required and checked against the stored hash, so
 * someone who reaches an unlocked browser cannot take the account over. That is
 * a partial defence by nature: sessions are JWTs, so a cookie issued before the
 * change keeps working until it expires — including any the attacker already
 * holds. Revoking those needs a token version or database sessions.
 */
export async function changePassword(
  _prevState: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const userId = await requireUserId();

  if (!userId) {
    return { error: "Your session has expired. Sign in again to continue." };
  }

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return {
      error: "Please check the details you entered",
      issues: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    // A GitHub-only account has no password to replace. The form is not
    // rendered for one, so reaching here means the request did not come from
    // the page — refuse rather than quietly setting a first password, which
    // would attach a credentials login to an OAuth account.
    if (!user?.password) {
      return { error: "This account signs in with GitHub and has no password." };
    }

    const matches = await bcrypt.compare(parsed.data.currentPassword, user.password);

    if (!matches) {
      return {
        error: "Please check the details you entered",
        issues: { currentPassword: ["That is not your current password"] },
      };
    }

    await prisma.user.update({
      where: { id: userId },
      data: { password: await hashPassword(parsed.data.password) },
    });
  } catch (error) {
    console.error("Failed to change password:", error);

    return { error: "Something went wrong. Please try again." };
  }

  return { success: true };
}

export interface DeleteAccountState {
  error?: string;
}

/**
 * Deletes the signed-in user and everything they own, then ends the session.
 *
 * The ordering matters and mirrors `scripts/delete-users.ts`:
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
 *
 * `signOut` throws a redirect on success, so it runs after the transaction
 * rather than inside it.
 */
export async function deleteAccount(
  _prevState: DeleteAccountState,
  formData: FormData,
): Promise<DeleteAccountState> {
  const userId = await requireUserId();

  if (!userId) {
    return { error: "Your session has expired. Sign in again to continue." };
  }

  // Re-checked here rather than trusted from the dialog: the disabled button is
  // a convenience, and a post that never went near the UI must not delete an
  // account.
  const parsed = deleteAccountSchema.safeParse({
    confirmation: formData.get("confirmation"),
  });

  if (!parsed.success) {
    return { error: `Type ${DELETE_CONFIRMATION_WORD} to confirm.` };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user) {
      // The row is already gone; the session just outlived it.
      return { error: "This account no longer exists." };
    }

    await prisma.$transaction(async (tx) => {
      await tx.item.deleteMany({ where: { userId } });
      await tx.user.delete({ where: { id: userId } });
      await tx.verificationToken.deleteMany({
        where: { identifier: { in: linkTokenIdentifiersFor(user.email) } },
      });
    });
  } catch (error) {
    console.error("Failed to delete account:", error);

    return { error: "Something went wrong. Please try again." };
  }

  // The JWT names a row that no longer exists, so the cookie has to be cleared
  // explicitly — nothing about deleting the data invalidates it on its own.
  await signOut({ redirectTo: SIGN_IN_PATH });

  return {};
}
