"use client";

import { useActionState } from "react";

import { changePassword, type ChangePasswordState } from "@/actions/profile";
import { AuthFormField } from "@/components/auth/AuthFormField";
import { FormError, FormNotice } from "@/components/auth/FieldError";
import { NewPasswordFields } from "@/components/auth/NewPasswordFields";
import { SubmitButton } from "@/components/auth/SubmitButton";

const INITIAL_STATE: ChangePasswordState = {};

/**
 * Rendered only for accounts that have a password. A GitHub-only account has
 * nothing to change, and offering the form would imply it could set a first
 * password — which the action refuses.
 */
export function ChangePasswordForm() {
  const [state, formAction] = useActionState(changePassword, INITIAL_STATE);

  return (
    // `key` remounts the form once the change succeeds, which is what clears
    // the three password fields. They are uncontrolled, so a re-render alone
    // would leave the old values sitting in the inputs.
    <form
      key={state.success ? "changed" : "editing"}
      action={formAction}
      className="space-y-4"
    >
      <FormError message={state.error} />
      <FormNotice message={state.success ? "Password updated." : undefined} />

      <AuthFormField
        name="currentPassword"
        label="Current password"
        type="password"
        autoComplete="current-password"
        issues={state.issues?.currentPassword}
        required
      />

      <NewPasswordFields issues={state.issues} />

      <SubmitButton className="w-full sm:w-auto" pendingLabel="Updating...">
        Update password
      </SubmitButton>
    </form>
  );
}
