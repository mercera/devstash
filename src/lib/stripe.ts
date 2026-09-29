/**
 * The Stripe client, its configuration, and helpers for reading Stripe
 * objects. Server only.
 *
 * Configuration is read per call, never at module load: a module-scope client
 * would be built while `next build` collects page data, freezing the build
 * machine's environment into the output. The client is cached on its key so a
 * changed key drops it rather than reusing it.
 *
 * No `apiVersion` is passed. The SDK pins the version its types describe, so
 * leaving it unset keeps the types and the responses in step.
 */

import Stripe from "stripe";

import type { BillingPeriod } from "@/lib/plans";

let cached: { key: string; client: Stripe } | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;

  if (!key) {
    throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY.");
  }

  if (cached?.key !== key) {
    cached = { key, client: new Stripe(key, { maxNetworkRetries: 2 }) };
  }

  return cached.client;
}

/** The webhook signing secret, or null when unset. */
export function getWebhookSecret(): string | null {
  return process.env.STRIPE_WEBHOOK_SECRET || null;
}

const PRICE_ENV: Record<BillingPeriod, string> = {
  monthly: "STRIPE_PRICE_ID_MONTHLY",
  yearly: "STRIPE_PRICE_ID_YEARLY",
};

/** The Stripe price id for a billing period. Throws when it is not configured. */
export function getPriceId(period: BillingPeriod): string {
  const priceId = process.env[PRICE_ENV[period]];

  if (!priceId) {
    throw new Error(`Stripe is not configured. Set ${PRICE_ENV[period]}.`);
  }

  return priceId;
}

/** Which billing period a price id is, or null for a price this app does not sell. */
export function getBillingPeriodForPrice(priceId: string): BillingPeriod | null {
  if (priceId === process.env.STRIPE_PRICE_ID_MONTHLY) return "monthly";
  if (priceId === process.env.STRIPE_PRICE_ID_YEARLY) return "yearly";
  return null;
}

/** A Stripe expandable field (`"cus_…"` or an expanded object) reduced to its id. */
export function toStripeId(value: string | { id: string }): string {
  return typeof value === "string" ? value : value.id;
}

/**
 * Subscription statuses that grant Pro.
 *
 * `past_due` is included on purpose: Stripe is still retrying the payment, and
 * pulling features mid-retry punishes an expired card. When retries run out,
 * Stripe moves the subscription to `canceled` or `unpaid`, neither of which
 * grants Pro.
 */
const ENTITLING_STATUSES: ReadonlySet<string> = new Set([
  "active",
  "trialing",
  "past_due",
]);

export function isEntitlingStatus(status: string): boolean {
  return ENTITLING_STATUSES.has(status);
}

interface SubscriptionLike {
  id: string;
  status: string;
  created: number;
}

/**
 * The subscription that decides a customer's plan: the newest one that grants
 * Pro, or null when none does. A customer can end up with two, for example by
 * finishing two Checkout tabs, and one ending must not downgrade the other.
 */
export function pickEntitlingSubscription<T extends SubscriptionLike>(
  subscriptions: readonly T[],
): T | null {
  return (
    subscriptions
      .filter((subscription) => isEntitlingStatus(subscription.status))
      .sort((a, b) => b.created - a.created)[0] ?? null
  );
}
