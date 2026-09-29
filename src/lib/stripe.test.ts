import { describe, expect, it, vi } from "vitest";

/**
 * The SDK is replaced with a bare constructor, so no client ever reaches
 * Stripe and the tests can see how many clients were built.
 */

const mocks = vi.hoisted(() => ({
  Stripe: vi.fn(function (this: { key: string }, key: string) {
    this.key = key;
  }),
}));

vi.mock("stripe", () => ({ default: mocks.Stripe }));

import {
  getBillingPeriodForPrice,
  getPriceId,
  getStripe,
  isEntitlingStatus,
  pickEntitlingSubscription,
  toStripeId,
} from "@/lib/stripe";

describe("getPriceId", () => {
  it("returns the configured price for each period", () => {
    vi.stubEnv("STRIPE_PRICE_ID_MONTHLY", "price_month");
    vi.stubEnv("STRIPE_PRICE_ID_YEARLY", "price_year");

    expect(getPriceId("monthly")).toBe("price_month");
    expect(getPriceId("yearly")).toBe("price_year");
  });

  it("throws naming the missing variable", () => {
    vi.stubEnv("STRIPE_PRICE_ID_YEARLY", "");

    expect(() => getPriceId("yearly")).toThrow(/STRIPE_PRICE_ID_YEARLY/);
  });
});

describe("getBillingPeriodForPrice", () => {
  it("maps each configured price to its period and anything else to null", () => {
    vi.stubEnv("STRIPE_PRICE_ID_MONTHLY", "price_month");
    vi.stubEnv("STRIPE_PRICE_ID_YEARLY", "price_year");

    expect(getBillingPeriodForPrice("price_month")).toBe("monthly");
    expect(getBillingPeriodForPrice("price_year")).toBe("yearly");
    expect(getBillingPeriodForPrice("price_other")).toBeNull();
  });
});

describe("getStripe", () => {
  it("throws without a secret key", () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "");

    expect(() => getStripe()).toThrow(/STRIPE_SECRET_KEY/);
  });

  it("reuses the client for an unchanged key and rebuilds it for a new one", () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_one");
    const first = getStripe();
    const again = getStripe();

    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_two");
    const second = getStripe();

    expect(again).toBe(first);
    expect(second).not.toBe(first);
    expect(mocks.Stripe).toHaveBeenCalledTimes(2);
    expect(mocks.Stripe).toHaveBeenLastCalledWith("sk_test_two", {
      maxNetworkRetries: 2,
    });
  });
});

describe("toStripeId", () => {
  it("returns a string as is and an object's id", () => {
    expect(toStripeId("cus_123")).toBe("cus_123");
    expect(toStripeId({ id: "cus_456" })).toBe("cus_456");
  });
});

describe("isEntitlingStatus", () => {
  it.each(["active", "trialing", "past_due"])("grants Pro for %s", (status) => {
    expect(isEntitlingStatus(status)).toBe(true);
  });

  it.each(["canceled", "unpaid", "incomplete", "incomplete_expired", "paused"])(
    "does not grant Pro for %s",
    (status) => {
      expect(isEntitlingStatus(status)).toBe(false);
    },
  );
});

describe("pickEntitlingSubscription", () => {
  it("picks the newest entitling subscription", () => {
    const older = { id: "sub_old", status: "active", created: 100 };
    const newer = { id: "sub_new", status: "past_due", created: 200 };

    expect(pickEntitlingSubscription([older, newer])).toBe(newer);
  });

  it("ignores a newer subscription that has ended", () => {
    const active = { id: "sub_active", status: "active", created: 100 };
    const canceled = { id: "sub_canceled", status: "canceled", created: 300 };

    expect(pickEntitlingSubscription([canceled, active])).toBe(active);
  });

  it("returns null for an empty or all-ended list", () => {
    expect(pickEntitlingSubscription([])).toBeNull();
    expect(
      pickEntitlingSubscription([
        { id: "sub_1", status: "canceled", created: 1 },
        { id: "sub_2", status: "incomplete_expired", created: 2 },
      ]),
    ).toBeNull();
  });
});
