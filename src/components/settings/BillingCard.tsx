import { FormError, FormNotice } from "@/components/auth/FieldError";
import {
  ManageBillingButton,
  UpgradeButton,
} from "@/components/settings/BillingButtons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { SubscriptionSummary } from "@/lib/billing";
import type { BillingUser } from "@/lib/db/billing";
import { formatLongDate } from "@/lib/format";
import {
  FREE_COLLECTION_LIMIT,
  FREE_ITEM_LIMIT,
  getProPriceDisplay,
  getYearlySavingsPercent,
} from "@/lib/plans";

export type CheckoutNotice = "success" | "cancelled" | null;

const NOTICES: Record<Exclude<CheckoutNotice, null>, string> = {
  success: "Welcome to Pro.",
  cancelled: "Checkout cancelled — you have not been charged.",
};

interface BillingCardProps {
  user: BillingUser;
  usage: { itemCount: number; collectionCount: number };
  /** Null for a Free user, or when Stripe could not be reached. */
  subscription: SubscriptionSummary | null;
  notice: CheckoutNotice;
}

/**
 * The Billing section of `/settings`. A server component: the only client
 * code is the buttons, which call the billing actions and follow the
 * Stripe-hosted URL they return.
 */
export function BillingCard({ user, usage, subscription, notice }: BillingCardProps) {
  return (
    <Card id="billing" className="scroll-mt-16">
      <CardHeader>
        <CardTitle className="text-base">Billing</CardTitle>
        <CardDescription>
          {user.isPro ? <ProPlanLabel subscription={subscription} /> : "Free plan"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {notice && <FormNotice message={NOTICES[notice]} />}
        {user.isPro ? (
          <ProPlan subscription={subscription} />
        ) : (
          <FreePlan user={user} usage={usage} />
        )}
      </CardContent>
    </Card>
  );
}

function ProPlanLabel({ subscription }: { subscription: SubscriptionSummary | null }) {
  if (subscription?.period === "monthly") return "Pro · Monthly";
  if (subscription?.period === "yearly") return "Pro · Yearly";
  return "Pro";
}

function FreePlan({ user, usage }: Pick<BillingCardProps, "user" | "usage">) {
  const monthly = getProPriceDisplay("monthly");
  const yearly = getProPriceDisplay("yearly");

  return (
    <>
      <ul className="space-y-1 text-sm text-muted-foreground">
        <li>
          <span className="text-foreground tabular-nums">
            {usage.itemCount} / {FREE_ITEM_LIMIT}
          </span>{" "}
          items
        </li>
        <li>
          <span className="text-foreground tabular-nums">
            {usage.collectionCount} / {FREE_COLLECTION_LIMIT}
          </span>{" "}
          collections
        </li>
      </ul>
      <p className="text-sm text-muted-foreground">
        Pro adds unlimited items and collections, and file and image uploads.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <UpgradeButton
          period="monthly"
          label={`Upgrade monthly — ${monthly.amount}${monthly.period}`}
        />
        <UpgradeButton
          period="yearly"
          variant="outline"
          label={`Upgrade yearly — ${yearly.amount}${yearly.period} (save ${getYearlySavingsPercent()}%)`}
        />
        {/* A former Pro user can still reach their invoices. */}
        {user.stripeCustomerId && <ManageBillingButton />}
      </div>
    </>
  );
}

function ProPlan({ subscription }: Pick<BillingCardProps, "subscription">) {
  // Pro with no subscription: set by hand, or Stripe could not be reached.
  // Either way there is no date to show and nothing the Portal could manage.
  if (!subscription) {
    return null;
  }

  return (
    <>
      {subscription.status === "past_due" && (
        <FormError message="Payment past due — update your card to keep Pro." />
      )}
      {subscription.periodEnd && (
        <p className="text-sm text-muted-foreground">
          {subscription.willCancel ? "Cancels on " : "Renews on "}
          <span className="text-foreground">{formatLongDate(subscription.periodEnd)}</span>
        </p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <ManageBillingButton />
      </div>
    </>
  );
}
