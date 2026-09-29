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
  toStripeId,
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

/**
 * Syncs the Checkout Session the success URL names, but only if it is this
 * user's own. The `session_id` comes from the query string, so anyone could
 * pass another user's.
 */
export async function syncCheckoutSession(
  sessionId: string,
  userId: string,
): Promise<void> {
  const session = await getStripe().checkout.sessions.retrieve(sessionId);

  if (session.client_reference_id !== userId || !session.customer) {
    return;
  }

  await syncCustomerSubscription(toStripeId(session.customer));
}

/**
 * Everything the webhook route does once the signature has been verified.
 * Only the customer is read from the event; the sync re-reads the rest from
 * Stripe. Errors propagate so the route can answer 500 and Stripe retries.
 */
export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;

      if (session.mode === "subscription" && session.customer) {
        await syncCustomerSubscription(toStripeId(session.customer));
      }

      return;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
    case "customer.subscription.paused":
    case "customer.subscription.resumed":
      await syncCustomerSubscription(toStripeId(event.data.object.customer));
      return;
    default:
      // Acknowledged and ignored.
      return;
  }
}

export interface SubscriptionSummary {
  period: BillingPeriod | null;
  /** When the current period ends: the renewal date, or the end date if cancelling. */
  periodEnd: Date | null;
  /** Whether the subscription ends at `periodEnd` rather than renewing. */
  willCancel: boolean;
  status: Stripe.Subscription.Status;
}

/** What the Billing card shows for a Pro user. Null if Stripe cannot be reached. */
export async function getSubscriptionSummary(
  subscriptionId: string,
): Promise<SubscriptionSummary | null> {
  try {
    const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
    const item = subscription.items.data[0];
    // A scheduled cancellation shows up in either field. The Customer Portal
    // sets `cancel_at` to the period end and leaves `cancel_at_period_end`
    // false, so reading only the flag would say "Renews on" for a
    // subscription that is ending.
    const cancelAt = subscription.cancel_at;
    // Item-level since API version 2025-03-31 (basil); the subscription no
    // longer carries it.
    const periodEndSeconds = cancelAt ?? item?.current_period_end ?? null;

    return {
      period: item ? getBillingPeriodForPrice(item.price.id) : null,
      periodEnd: periodEndSeconds === null ? null : new Date(periodEndSeconds * 1000),
      willCancel: subscription.cancel_at_period_end || cancelAt !== null,
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
