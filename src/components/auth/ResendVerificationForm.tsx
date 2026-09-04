"use client";

import { useActionState } from "react";

import { resendVerificationEmail, type ResendVerificationState } from "@/actions/auth";
import { FieldError } from "@/components/auth/FieldError";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const INITIAL_STATE: ResendVerificationState = {};

interface ResendVerificationFormProps {
  /** Prefills the field when the address is already known, e.g. from an expired link. */
  defaultEmail?: string;
  /** Wording for the button, which differs between "not arrived" and "link expired". */
  submitLabel?: string;
}

export function ResendVerificationForm({
  defaultEmail,
  submitLabel = "Resend verification email",
}: ResendVerificationFormProps) {
  const [state, formAction] = useActionState(resendVerificationEmail, INITIAL_STATE);

  return (
    <form action={formAction} className="space-y-4">
      {state.message && (
        <p
          role="status"
          className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground"
        >
          {state.message}
        </p>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          // The action echoes the submitted value back, so a re-render after a
          // failed attempt keeps what was typed rather than the original prefill.
          defaultValue={state.email ?? defaultEmail}
          aria-invalid={Boolean(state.error)}
          className="h-9"
          required
        />
        <FieldError messages={state.error ? [state.error] : undefined} />
      </div>

      <SubmitButton
        size="lg"
        variant="outline"
        className="w-full"
        pendingLabel="Sending..."
      >
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
