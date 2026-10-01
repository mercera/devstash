"use client";

import { resendVerificationEmail } from "@/actions/auth";
import { EmailLinkRequestForm } from "@/components/auth/EmailLinkRequestForm";

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
  return (
    <EmailLinkRequestForm
      action={resendVerificationEmail}
      defaultEmail={defaultEmail}
      submitLabel={submitLabel}
      variant="outline"
    />
  );
}
