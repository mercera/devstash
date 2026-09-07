"use client";

import { useActionState } from "react";

import { changePassword, type ChangePasswordState } from "@/actions/profile";
import { FieldError, FormError } from "@/components/auth/FieldError";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MIN_PASSWORD_LENGTH } from "@/lib/validations/auth";

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

      {state.success && (
        <p
          role="status"
          className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground"
        >
          Password updated.
        </p>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="currentPassword">Current password</Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          aria-invalid={Boolean(state.issues?.currentPassword)}
          className="h-9"
          required
        />
        <FieldError messages={state.issues?.currentPassword} />
      </div>

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

      <SubmitButton className="w-full sm:w-auto" pendingLabel="Updating...">
        Update password
      </SubmitButton>
    </form>
  );
}
