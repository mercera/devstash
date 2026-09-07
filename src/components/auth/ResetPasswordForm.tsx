"use client";

import { useActionState } from "react";

import { resetPassword, type ResetPasswordState } from "@/actions/auth";
import { FieldError, FormError } from "@/components/auth/FieldError";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRateLimitToast } from "@/hooks/use-rate-limit-toast";
import { MIN_PASSWORD_LENGTH } from "@/lib/validations/auth";

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

      <div className="space-y-1.5">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(state.issues?.password)}
          className="h-9"
          required
        />
        <FieldError messages={state.issues?.password} />
        {!state.issues?.password && (
          <p className="text-xs text-muted-foreground">
            At least {MIN_PASSWORD_LENGTH} characters.
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(state.issues?.confirmPassword)}
          className="h-9"
          required
        />
        <FieldError messages={state.issues?.confirmPassword} />
      </div>

      <SubmitButton size="lg" className="w-full" pendingLabel="Updating...">
        Update password
      </SubmitButton>
    </form>
  );
}
