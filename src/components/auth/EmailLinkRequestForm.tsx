"use client";

import { useActionState } from "react";

import type { EmailLinkRequestState } from "@/actions/auth";
import { AuthFormField } from "@/components/auth/AuthFormField";
import { FormNotice } from "@/components/auth/FieldError";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { useRateLimitToast } from "@/hooks/use-rate-limit-toast";

const INITIAL_STATE: EmailLinkRequestState = {};

interface EmailLinkRequestFormProps {
  /** The server action that sends the link. */
  action: (state: EmailLinkRequestState, formData: FormData) => Promise<EmailLinkRequestState>;
  /** Prefills the field when the address is already known, e.g. from an expired link. */
  defaultEmail?: string;
  submitLabel: string;
  variant?: "default" | "outline";
}

/**
 * An "email me a link" form: one address field and a submit button. The
 * action answers every handled request with the same neutral notice.
 */
export function EmailLinkRequestForm({
  action,
  defaultEmail,
  submitLabel,
  variant = "default",
}: EmailLinkRequestFormProps) {
  const [state, formAction] = useActionState(action, INITIAL_STATE);

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

      <SubmitButton size="lg" variant={variant} className="w-full" pendingLabel="Sending...">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
