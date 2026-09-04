import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { GitHubSignInButton } from "@/components/auth/GitHubSignInButton";
import { SignInForm } from "@/components/auth/SignInForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Sign in · DevStash",
};

const DEFAULT_CALLBACK_URL = "/dashboard";

/**
 * Auth.js redirects back here with `?error=` when a provider fails. Only codes
 * the user can act on get their own message; everything else, including the
 * generic `CredentialsSignin`, collapses to one line.
 */
const ERROR_MESSAGES: Record<string, string> = {
  CredentialsSignin: "Invalid email or password",
  OAuthAccountNotLinked:
    "That email already has an account. Sign in with your password instead.",
  AccessDenied: "You do not have access to this application",
  Configuration: "Sign-in is misconfigured. Please contact support.",
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const params = await searchParams;

  const requested = firstParam(params.callbackUrl);
  // Only in-app paths are honoured; `//evil.com` is protocol-relative, not local.
  const callbackUrl =
    requested?.startsWith("/") && !requested.startsWith("//")
      ? requested
      : DEFAULT_CALLBACK_URL;

  // Nothing to sign in to if there is already a session.
  const session = await auth();

  if (session?.user) {
    redirect(callbackUrl);
  }

  const errorCode = firstParam(params.error);
  const error = errorCode
    ? (ERROR_MESSAGES[errorCode] ?? "Could not sign you in. Please try again.")
    : undefined;

  // Set by `/api/auth/verify-email` after it consumes a link successfully.
  const justVerified = firstParam(params.verified) === "1";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Welcome back</CardTitle>
        <CardDescription>Sign in to your DevStash account</CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {justVerified && (
          <p className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
            Email verified. Sign in to continue.
          </p>
        )}

        <SignInForm callbackUrl={callbackUrl} initialError={error} />

        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground uppercase">or</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <GitHubSignInButton callbackUrl={callbackUrl} />

        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium text-foreground hover:underline">
            Create one
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
