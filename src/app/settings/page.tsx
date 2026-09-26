import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { SIGN_IN_PATH } from "@/auth.config";
import { ChangePasswordForm } from "@/components/profile/ChangePasswordForm";
import { DeleteAccountDialog } from "@/components/profile/DeleteAccountDialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getProfileUser } from "@/lib/db/user";

export const metadata: Metadata = {
  title: "Settings · DevStash",
};

/**
 * Live account data — this must never be served from a build-time snapshot.
 */
export const dynamic = "force-dynamic";

/**
 * The account settings page: change password and delete account.
 *
 * Like `/profile`, it sits outside the `(app)` route group, so it has no
 * sidebar and the header carries a link back instead. Both actions are
 * session-scoped.
 */
export default async function SettingsPage() {
  const user = await getProfileUser();

  // The proxy already turns anonymous requests away; this catches a session
  // whose `User` row has since been deleted.
  if (!user) {
    redirect(SIGN_IN_PATH);
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to dashboard
      </Link>

      <div className="space-y-8">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your account.</p>
        </div>

        {/* Absent, not disabled, for a GitHub account — there is no password to
            change and the action refuses to set a first one. */}
        {user.hasPassword && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Change password</CardTitle>
              <CardDescription>
                You will stay signed in on this device.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChangePasswordForm />
            </CardContent>
          </Card>
        )}

        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-base">Delete account</CardTitle>
            <CardDescription>
              Permanently removes your account and everything in it. This cannot be
              undone.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DeleteAccountDialog email={user.email} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
