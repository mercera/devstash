import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SIGN_IN_PATH } from "@/auth.config";
import { UpgradePlans } from "@/components/billing/UpgradePlans";
import { BILLING_PATH } from "@/lib/routes";
import { getSessionUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Upgrade | DevStash",
};

/**
 * Where every "Upgrade" prompt leads: the plans side by side, with Checkout
 * started from the Pro card. A Pro user has nothing to pick here, so they go
 * to the Billing card instead.
 */
export default async function UpgradePage() {
  const user = await getSessionUser();

  if (!user) {
    redirect(SIGN_IN_PATH);
  }

  if (user.isPro) {
    redirect(BILLING_PATH);
  }

  return (
    <div className="flex flex-col py-4">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Upgrade to Pro</h1>
        <p className="mt-2 text-muted-foreground">
          Unlimited items and collections, file and image uploads, and more.
        </p>
      </header>

      <UpgradePlans />
    </div>
  );
}
