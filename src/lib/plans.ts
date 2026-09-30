/**
 * Subscription plans as marketed on the homepage and the Billing card.
 *
 * The limits are enforced: `src/lib/usage-limits.ts` reads them for the
 * `createItem` / `createCollection` guards, so what is advertised is what is
 * checked. The prices are display only — Stripe charges its own price objects
 * (`STRIPE_PRICE_ID_*`), so change them together.
 */

export type BillingPeriod = "monthly" | "yearly";

export const FREE_ITEM_LIMIT = 50;
export const FREE_COLLECTION_LIMIT = 3;

/** Pro prices in whole US dollars. */
export const PRO_PRICES: Record<BillingPeriod, number> = {
  monthly: 8,
  yearly: 72,
};

export interface Plan {
  id: "free" | "pro";
  name: string;
  description: string;
  features: string[];
}

export const FREE_PLAN: Plan = {
  id: "free",
  name: "Free",
  description: "For getting your knowledge in one place.",
  features: [
    `${FREE_ITEM_LIMIT} items`,
    `${FREE_COLLECTION_LIMIT} collections`,
    "Basic search",
  ],
};

export const PRO_PLAN: Plan = {
  id: "pro",
  name: "Pro",
  description: "For developers who live in their stash.",
  features: [
    "Unlimited items and collections",
    "File and image uploads",
    "Custom item types",
    "AI tagging, summaries, Explain Code and prompt optimization",
    "Export to JSON / ZIP",
  ],
};

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** `8` → `"$8"`, `6.5` → `"$6.5"`. Whole dollars carry no decimals. */
export function formatPrice(dollars: number): string {
  return usd.format(dollars);
}

/** How much cheaper a year is than twelve months, as a whole percentage. */
export function getYearlySavingsPercent(): number {
  const fullYear = PRO_PRICES.monthly * 12;
  return Math.round(((fullYear - PRO_PRICES.yearly) / fullYear) * 100);
}

export interface PriceDisplay {
  amount: string;
  period: string;
  note: string;
}

/** The Free card's price line. */
export const FREE_PRICE_DISPLAY: PriceDisplay = {
  amount: formatPrice(0),
  period: "/forever",
  note: "",
};

/** The Pro card's price line for a billing period. */
export function getProPriceDisplay(period: BillingPeriod): PriceDisplay {
  if (period === "yearly") {
    return {
      amount: formatPrice(PRO_PRICES.yearly),
      period: "/year",
      note: `Billed yearly — ${formatPrice(PRO_PRICES.yearly / 12)}/month`,
    };
  }
  return {
    amount: formatPrice(PRO_PRICES.monthly),
    period: "/month",
    note: "Billed monthly",
  };
}
