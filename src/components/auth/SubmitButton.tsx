"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * A submit button that disables itself while its parent form is in flight.
 *
 * `useFormStatus` only reports the form this button is rendered inside, which
 * is why the sign-in page's two forms (credentials and GitHub) can each show
 * their own pending state without sharing any.
 */
export function SubmitButton({
  children,
  pendingLabel,
  disabled,
  ...props
}: ComponentProps<typeof Button> & { pendingLabel?: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={disabled || pending} {...props}>
      {pending && <Loader2 className="animate-spin" />}
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}
