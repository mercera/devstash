import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Settings } from "lucide-react";

import { SIGN_IN_PATH } from "@/auth.config";
import { PageHeader } from "@/components/layout/PageHeader";
import { ChangePasswordForm } from "@/components/profile/ChangePasswordForm";
import { DeleteAccountDialog } from "@/components/profile/DeleteAccountDialog";
import { BillingCard, type CheckoutNotice } from "@/components/settings/BillingCard";
import { EditorPreferencesForm } from "@/components/settings/EditorPreferencesForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSubscriptionSummary, syncCheckoutSession } from "@/lib/billing";
import { getBillingUser, getUsageCounts } from "@/lib/db/billing";
import { getProfileUser } from "@/lib/db/user";
import { getSessionUserId } from "@/lib/session";

export const metadata: Metadata = {
  title: "Settings | DevStash",
};

/**
 * Live account data — this must never be served from a build-time snapshot.
 */
export const dynamic = "force-dynamic";

/**
 * The account settings page: editor preferences, billing, change password and
 * delete account. Every action is session-scoped.
 *
 * The editor form reads the preferences from the `(app)` layout's provider,
 * which also feeds the editors, so this page does not load them itself.
 */
export default async function SettingsPage({ searchParams }: PageProps<"/settings">) {
  const [userId, query] = await Promise.all([getSessionUserId(), searchParams]);

  // The proxy already turns anonymous requests away.
  if (!userId) {
    redirect(SIGN_IN_PATH);
  }

  const notice = toCheckoutNotice(query.checkout);

  // Stripe's return from Checkout. Syncing here, before the billing reads,
  // shows Pro on the first render even if the webhook has not arrived. The
  // sync is idempotent, so a refresh of this URL is harmless.
  if (notice === "success" && typeof query.session_id === "string") {
    try {
      await syncCheckoutSession(query.session_id, userId);
    } catch (error) {
      console.error("Failed to sync the returning Checkout session:", error);
    }
  }

  const [user, billingUser, usage] = await Promise.all([
    getProfileUser(),
    getBillingUser(userId),
    getUsageCounts(userId),
  ]);

  // A session whose `User` row has since been deleted.
  if (!user || !billingUser) {
    redirect(SIGN_IN_PATH);
  }

  const subscription =
    billingUser.isPro && billingUser.stripeSubscriptionId
      ? await getSubscriptionSummary(billingUser.stripeSubscriptionId)
      : null;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Settings" icon={<Settings />} description="Manage your account." />

      <div className="grid items-start gap-6 @4xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Editor preferences</CardTitle>
            <CardDescription>
              Applies to snippet and command editors. Changes save automatically.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EditorPreferencesForm />
          </CardContent>
        </Card>

        <BillingCard
          user={billingUser}
          usage={usage}
          subscription={subscription}
          notice={notice}
        />

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

function toCheckoutNotice(value: string | string[] | undefined): CheckoutNotice {
  return value === "success" || value === "cancelled" ? value : null;
}
