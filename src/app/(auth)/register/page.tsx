import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SIGN_IN_PATH } from "@/auth.config";
import { AuthDivider } from "@/components/auth/AuthDivider";
import { GitHubSignInButton } from "@/components/auth/GitHubSignInButton";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DASHBOARD_PATH } from "@/lib/routes";
import { getSessionUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Create an account · DevStash",
};

export default async function RegisterPage() {
  // Someone already signed in has no use for a sign-up form.
  if (await getSessionUser()) {
    redirect(DASHBOARD_PATH);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Create your account</CardTitle>
        <CardDescription>Start stashing your developer knowledge</CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        <RegisterForm />

        <AuthDivider />

        <GitHubSignInButton callbackUrl={DASHBOARD_PATH} label="Sign up with GitHub" />

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href={SIGN_IN_PATH} className="font-medium text-foreground hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
