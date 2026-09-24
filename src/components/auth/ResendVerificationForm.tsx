"use client";

import { useActionState } from "react";

import { resendVerificationEmail, type EmailLinkRequestState } from "@/actions/auth";
import { AuthFormField } from "@/components/auth/AuthFormField";
import { FormNotice } from "@/components/auth/FieldError";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { useRateLimitToast } from "@/hooks/use-rate-limit-toast";

const INITIAL_STATE: EmailLinkRequestState = {};

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

  useRateLimitToast(state);

  return (
    <form action={formAction} className="space-y-4">
      <FormNotice message={state.message} />

      <AuthFormField
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        // The action echoes the submitted value back, so a re-render after a
        // failed attempt keeps what was typed rather than the original prefill.
        defaultValue={state.email ?? defaultEmail}
        issues={state.error ? [state.error] : undefined}
        required
      />

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
