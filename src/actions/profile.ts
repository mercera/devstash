"use server";

import bcrypt from "bcryptjs";

import { signOut } from "@/auth";
import { SIGN_IN_PATH } from "@/auth.config";
import { invalidInput } from "@/lib/action-helpers";
import { cancelCustomerSubscriptions } from "@/lib/billing";
import {
  deleteUserAccount,
  getAccountForDeletion,
  getPasswordHash,
  setPasswordHash,
} from "@/lib/db/user";
import {
  INVALID_INPUT,
  SESSION_EXPIRED,
  SOMETHING_WENT_WRONG,
} from "@/lib/messages";
import { hashPassword } from "@/lib/password";
import { getSessionUserId } from "@/lib/session";
import { changePasswordSchema } from "@/lib/validations/auth";
import {
  DELETE_CONFIRMATION_WORD,
  deleteAccountSchema,
} from "@/lib/validations/profile";

/**
 * Account actions for `/settings`.
 *
 * Both of these are mutations on the **signed-in** user, resolved from the
 * session every time, never from an id the client sends.
 */

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
  const userId = await getSessionUserId();

  if (!userId) {
    return { error: SESSION_EXPIRED };
  }

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return invalidInput(parsed.error);
  }

  try {
    const passwordHash = await getPasswordHash(userId);

    // A GitHub-only account has no password to replace. The form is not
    // rendered for one, so reaching here means the request did not come from
    // the page — refuse rather than quietly setting a first password, which
    // would attach a credentials login to an OAuth account.
    if (!passwordHash) {
      return { error: "This account signs in with GitHub and has no password." };
    }

    const matches = await bcrypt.compare(parsed.data.currentPassword, passwordHash);

    if (!matches) {
      return {
        error: INVALID_INPUT,
        issues: { currentPassword: ["That is not your current password"] },
      };
    }

    await setPasswordHash(userId, await hashPassword(parsed.data.password));
  } catch (error) {
    console.error("Failed to change password:", error);

    return { error: SOMETHING_WENT_WRONG };
  }

  return { success: true };
}

export interface DeleteAccountState {
  error?: string;
}

/**
 * Deletes the signed-in user and everything they own, then ends the session.
 *
 * **Stripe goes first.** Any running subscription is cancelled immediately, or
 * a deleted user would go on being charged. If that fails the account is kept:
 * an orphaned subscription billing nobody is worse than a retry. The Stripe
 * customer itself is kept for invoices. The data is then removed by
 * `deleteUserAccount`, which documents its own ordering.
 *
 * `signOut` throws a redirect on success, so it runs after the delete rather
 * than inside the try block.
 */
export async function deleteAccount(
  _prevState: DeleteAccountState,
  formData: FormData,
): Promise<DeleteAccountState> {
  const userId = await getSessionUserId();

  if (!userId) {
    return { error: SESSION_EXPIRED };
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
    const user = await getAccountForDeletion(userId);

    if (!user) {
      // The row is already gone; the session just outlived it.
      return { error: "This account no longer exists." };
    }

    if (user.stripeCustomerId) {
      try {
        await cancelCustomerSubscriptions(user.stripeCustomerId);
      } catch (error) {
        console.error("Failed to cancel subscriptions before account deletion:", error);

        return {
          error:
            "We couldn't cancel your subscription, so your account was not deleted. Please try again.",
        };
      }
    }

    await deleteUserAccount(userId, user.email);
  } catch (error) {
    console.error("Failed to delete account:", error);

    return { error: SOMETHING_WENT_WRONG };
  }

  // The JWT names a row that no longer exists, so the cookie has to be cleared
  // explicitly — nothing about deleting the data invalidates it on its own.
  await signOut({ redirectTo: SIGN_IN_PATH });

  return {};
}
