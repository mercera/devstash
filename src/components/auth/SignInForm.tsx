"use client";

import { useActionState } from "react";

import { signInWithCredentials, type SignInState } from "@/actions/auth";
import { FieldError, FormError } from "@/components/auth/FieldError";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const INITIAL_STATE: SignInState = {};

interface SignInFormProps {
  /** Where to land after a successful sign-in. */
  callbackUrl: string;
  /** A failure Auth.js reported by redirecting back here with `?error=`. */
  initialError?: string;
}

export function SignInForm({ callbackUrl, initialError }: SignInFormProps) {
  const [state, formAction] = useActionState(
    signInWithCredentials,
    INITIAL_STATE,
  );

  // The action's own result supersedes the error Auth.js put in the URL, which
  // would otherwise keep showing after a later, different failure.
  const error = state.error ?? initialError;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />

      <FormError message={error} />

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          defaultValue={state.email}
          aria-invalid={Boolean(state.issues?.email)}
          className="h-9"
          required
        />
        <FieldError messages={state.issues?.email} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={Boolean(state.issues?.password)}
          className="h-9"
          required
        />
        <FieldError messages={state.issues?.password} />
      </div>

      <SubmitButton size="lg" className="w-full" pendingLabel="Signing in...">
        Sign in
      </SubmitButton>
    </form>
  );
}
