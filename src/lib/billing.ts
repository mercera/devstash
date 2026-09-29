/**
 * Stripe and database orchestration for Pro subscriptions. Server only.
 *
 * Subscription state is never taken from an event payload. Every sync
 * re-reads the customer's subscriptions from Stripe and writes the result, so
 * the outcome does not depend on which event arrived, or in what order, and
 * replaying one is harmless.
 */

import type Stripe from "stripe";

import {
  applySubscriptionState,
  claimStripeCustomerId,
  type BillingUser,
} from "@/lib/db/billing";
import type { BillingPeriod } from "@/lib/plans";
import {
  getBillingPeriodForPrice,
  getStripe,
  pickEntitlingSubscription,
} from "@/lib/stripe";

/** Statuses that have already ended and cannot be cancelled again. */
const ENDED_STATUSES: ReadonlySet<string> = new Set([
  "canceled",
  "incomplete_expired",
]);

/**
 * The user's Stripe customer, created on first use.
 *
 * The idempotency key makes two concurrent upgrades create one customer, not
 * two, and `claimStripeCustomerId` settles which id the row keeps.
 */
export async function getOrCreateStripeCustomer(
  userId: string,
  user: Pick<BillingUser, "email" | "name" | "stripeCustomerId">,
): Promise<string> {
  if (user.stripeCustomerId) {
    return user.stripeCustomerId;
  }

  const customer = await getStripe().customers.create(
    { email: user.email, name: user.name ?? undefined, metadata: { userId } },
    { idempotencyKey: `devstash-customer-${userId}` },
  );

  const stored = await claimStripeCustomerId(userId, customer.id);

  if (!stored) {
    throw new Error("User row disappeared while creating a Stripe customer.");
  }

  return stored;
}

/** Re-reads a customer's subscriptions from Stripe and writes the plan they grant. */
export async function syncCustomerSubscription(customerId: string): Promise<void> {
  const { data } = await getStripe().subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 20,
  });

  const current = pickEntitlingSubscription(data);
  const matched = await applySubscriptionState(customerId, {
    isPro: current !== null,
    subscriptionId: current?.id ?? null,
  });

  // An account deleted after cancelling, or a customer made outside the app.
  if (!matched) {
    console.warn(`Stripe customer ${customerId} matches no user.`);
  }
}

export interface SubscriptionSummary {
  period: BillingPeriod | null;
  /** When the current period ends: the renewal date, or the end date if cancelling. */
  periodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  status: Stripe.Subscription.Status;
}

/** What the Billing card shows for a Pro user. Null if Stripe cannot be reached. */
export async function getSubscriptionSummary(
  subscriptionId: string,
): Promise<SubscriptionSummary | null> {
  try {
    const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
    const item = subscription.items.data[0];

    return {
      period: item ? getBillingPeriodForPrice(item.price.id) : null,
      // Item-level since API version 2025-03-31 (basil); the subscription no
      // longer carries it.
      periodEnd: item ? new Date(item.current_period_end * 1000) : null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      status: subscription.status,
    };
  } catch (error) {
    console.error("Failed to load subscription:", error);
    return null;
  }
}

/**
 * Cancels, immediately, every subscription that is still running, so a
 * deleted account is not charged again. The customer itself is kept so
 * invoices and refunds stay reachable in Stripe.
 */
export async function cancelCustomerSubscriptions(customerId: string): Promise<void> {
  const stripe = getStripe();
  const { data } = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 20,
  });

  const running = data.filter(
    (subscription) => !ENDED_STATUSES.has(subscription.status),
  );

  await Promise.all(
    running.map((subscription) => stripe.subscriptions.cancel(subscription.id)),
  );
}
