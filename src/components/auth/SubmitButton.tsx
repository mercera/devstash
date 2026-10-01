"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";

import { PendingButton } from "@/components/layout/PendingButton";

/**
 * A submit button that disables itself while its parent form is in flight.
 *
 * `useFormStatus` only reports the form this button is rendered inside, which
 * is why the sign-in page's two forms (credentials and GitHub) can each show
 * their own pending state without sharing any.
 */
export function SubmitButton(props: Omit<ComponentProps<typeof PendingButton>, "pending">) {
  const { pending } = useFormStatus();

  return <PendingButton type="submit" {...props} pending={pending} />;
}
