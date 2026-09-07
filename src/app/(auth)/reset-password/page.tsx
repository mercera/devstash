import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { checkPasswordResetToken } from "@/lib/password-reset";
import { FORGOT_PASSWORD_PATH } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Choose a new password · DevStash",
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * The target of the link in the reset email.
 *
 * A page rather than a route handler, because unlike verification this link
 * does not finish anything on its own — a new password still has to be typed.
 * The token is only read here, never consumed: `resetPassword` claims it when
 * the form is submitted, so an RSC re-fetch or a browser prefetch cannot burn
 * the link before it has been used.
 *
 * A link that will not work sends the visitor to `/forgot-password` rather than
 * rendering a form that is guaranteed to fail, so there is one place that
 * explains a dead link and offers another.
 *
 * Signed-in visitors are **not** bounced: a live session on this browser says
 * nothing about whether the person holding the emailed link wants to use it.
 */
export default async function ResetPasswordPage({
  searchParams,
}: PageProps<"/reset-password">) {
  const params = await searchParams;
  const token = firstParam(params.token);

  if (!token) {
    redirect(`${FORGOT_PASSWORD_PATH}?error=invalid`);
  }

  const check = await checkPasswordResetToken(token);

  if (check.status === "expired") {
    // The address is carried through so the form on the other side is prefilled.
    const query = new URLSearchParams({ error: "expired", email: check.email });

    redirect(`${FORGOT_PASSWORD_PATH}?${query}`);
  }

  if (check.status === "invalid") {
    redirect(`${FORGOT_PASSWORD_PATH}?error=invalid`);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Choose a new password</CardTitle>
        <CardDescription>
          Pick something you haven&apos;t used before. You&apos;ll sign in with it straight after.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        <ResetPasswordForm token={token} />

        <p className="text-center text-sm text-muted-foreground">
          Changed your mind?{" "}
          <Link href="/sign-in" className="font-medium text-foreground hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
