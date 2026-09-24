"use client";

import { useActionState } from "react";

import { resetPassword, type ResetPasswordState } from "@/actions/auth";
import { AuthFormField } from "@/components/auth/AuthFormField";
import { FormError } from "@/components/auth/FieldError";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { useRateLimitToast } from "@/hooks/use-rate-limit-toast";
import { PASSWORD_LENGTH_HINT } from "@/lib/validations/auth";

const INITIAL_STATE: ResetPasswordState = {};

interface ResetPasswordFormProps {
  /**
   * The raw token from the link. Carried in a hidden field rather than read
   * from the URL by the action, which has no request to read it from.
   */
  token: string;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [state, formAction] = useActionState(resetPassword, INITIAL_STATE);

  useRateLimitToast(state);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />

      <FormError message={state.error} />

      <AuthFormField
        name="password"
        label="New password"
        type="password"
        autoComplete="new-password"
        issues={state.issues?.password}
        hint={PASSWORD_LENGTH_HINT}
        required
      />

      <AuthFormField
        name="confirmPassword"
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        issues={state.issues?.confirmPassword}
        required
      />

      <SubmitButton size="lg" className="w-full" pendingLabel="Updating...">
        Update password
      </SubmitButton>
    </form>
  );
}
