"use client";

import { useActionState } from "react";

import { resetPassword, type ResetPasswordState } from "@/actions/auth";
import { FormError } from "@/components/auth/FieldError";
import { NewPasswordFields } from "@/components/auth/NewPasswordFields";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { useRateLimitToast } from "@/hooks/use-rate-limit-toast";

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

      <NewPasswordFields issues={state.issues} />

      <SubmitButton size="lg" className="w-full" pendingLabel="Updating...">
        Update password
      </SubmitButton>
    </form>
  );
}
