"use client";

import { requestPasswordResetEmail } from "@/actions/auth";
import { EmailLinkRequestForm } from "@/components/auth/EmailLinkRequestForm";

interface ForgotPasswordFormProps {
  /** Prefills the field when the address is already known, e.g. from an expired link. */
  defaultEmail?: string;
  /** Wording for the button, which differs between a first request and a retry. */
  submitLabel?: string;
}

export function ForgotPasswordForm({
  defaultEmail,
  submitLabel = "Send reset link",
}: ForgotPasswordFormProps) {
  return (
    <EmailLinkRequestForm
      action={requestPasswordResetEmail}
      defaultEmail={defaultEmail}
      submitLabel={submitLabel}
    />
  );
}
