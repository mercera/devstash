import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `getStripe` is replaced with a fake client and the billing queries with
 * mocks, so nothing here reaches Stripe or Neon. The pure helpers in
 * `@/lib/stripe` (`pickEntitlingSubscription`, `getBillingPeriodForPrice`)
 * stay real, since they decide the outcome being tested.
 */

const mocks = vi.hoisted(() => {
  const stripe = {
    customers: { create: vi.fn() },
    subscriptions: { list: vi.fn(), retrieve: vi.fn(), cancel: vi.fn() },
  };

  return {
    stripe,
    getStripe: vi.fn(() => stripe),
    claimStripeCustomerId: vi.fn(),
    applySubscriptionState: vi.fn(),
  };
});

vi.mock("@/lib/stripe", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/stripe")>()),
  getStripe: mocks.getStripe,
}));
vi.mock("@/lib/db/billing", () => ({
  claimStripeCustomerId: mocks.claimStripeCustomerId,
  applySubscriptionState: mocks.applySubscriptionState,
}));

import {
  cancelCustomerSubscriptions,
  getOrCreateStripeCustomer,
  getSubscriptionSummary,
  syncCustomerSubscription,
} from "@/lib/billing";

const user = { email: "ada@devstash.io", name: "Ada", stripeCustomerId: null };

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("getOrCreateStripeCustomer", () => {
  it("reuses a stored customer without calling Stripe", async () => {
    const id = await getOrCreateStripeCustomer("user-1", {
      ...user,
      stripeCustomerId: "cus_stored",
    });

    expect(id).toBe("cus_stored");
    expect(mocks.stripe.customers.create).not.toHaveBeenCalled();
  });

  it("creates a customer with the user id and an idempotency key", async () => {
    mocks.stripe.customers.create.mockResolvedValue({ id: "cus_new" });
    mocks.claimStripeCustomerId.mockResolvedValue("cus_new");

    const id = await getOrCreateStripeCustomer("user-1", user);

    expect(id).toBe("cus_new");
    expect(mocks.stripe.customers.create).toHaveBeenCalledWith(
      { email: "ada@devstash.io", name: "Ada", metadata: { userId: "user-1" } },
      { idempotencyKey: "devstash-customer-user-1" },
    );
    expect(mocks.claimStripeCustomerId).toHaveBeenCalledWith("user-1", "cus_new");
  });

  it("returns the id the row kept after a race", async () => {
    mocks.stripe.customers.create.mockResolvedValue({ id: "cus_new" });
    mocks.claimStripeCustomerId.mockResolvedValue("cus_winner");

    expect(await getOrCreateStripeCustomer("user-1", user)).toBe("cus_winner");
  });

  it("throws when the row has gone", async () => {
    mocks.stripe.customers.create.mockResolvedValue({ id: "cus_new" });
    mocks.claimStripeCustomerId.mockResolvedValue(null);

    await expect(getOrCreateStripeCustomer("user-1", user)).rejects.toThrow(
      /disappeared/,
    );
  });
});

describe("syncCustomerSubscription", () => {
  it("writes Pro and the entitling subscription's id", async () => {
    mocks.stripe.subscriptions.list.mockResolvedValue({
      data: [
        { id: "sub_old", status: "canceled", created: 100 },
        { id: "sub_live", status: "active", created: 50 },
      ],
    });
    mocks.applySubscriptionState.mockResolvedValue(true);

    await syncCustomerSubscription("cus_1");

    expect(mocks.stripe.subscriptions.list).toHaveBeenCalledWith({
      customer: "cus_1",
      status: "all",
      limit: 20,
    });
    expect(mocks.applySubscriptionState).toHaveBeenCalledWith("cus_1", {
      isPro: true,
      subscriptionId: "sub_live",
    });
  });

  it("writes Free and clears the subscription when none entitles", async () => {
    mocks.stripe.subscriptions.list.mockResolvedValue({
      data: [{ id: "sub_old", status: "canceled", created: 100 }],
    });
    mocks.applySubscriptionState.mockResolvedValue(true);

    await syncCustomerSubscription("cus_1");

    expect(mocks.applySubscriptionState).toHaveBeenCalledWith("cus_1", {
      isPro: false,
      subscriptionId: null,
    });
    expect(console.warn).not.toHaveBeenCalled();
  });

  it("warns when no user owns the customer", async () => {
    mocks.stripe.subscriptions.list.mockResolvedValue({ data: [] });
    mocks.applySubscriptionState.mockResolvedValue(false);

    await syncCustomerSubscription("cus_unknown");

    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("cus_unknown"));
  });
});

describe("getSubscriptionSummary", () => {
  it("reads the period end from the subscription item", async () => {
    vi.stubEnv("STRIPE_PRICE_ID_YEARLY", "price_year");
    mocks.stripe.subscriptions.retrieve.mockResolvedValue({
      status: "active",
      cancel_at_period_end: true,
      items: {
        data: [{ price: { id: "price_year" }, current_period_end: 1_800_000_000 }],
      },
    });

    const summary = await getSubscriptionSummary("sub_1");

    expect(summary).toEqual({
      period: "yearly",
      periodEnd: new Date(1_800_000_000 * 1000),
      cancelAtPeriodEnd: true,
      status: "active",
    });
  });

  it("returns null and logs when Stripe fails", async () => {
    mocks.stripe.subscriptions.retrieve.mockRejectedValue(new Error("offline"));

    expect(await getSubscriptionSummary("sub_1")).toBeNull();
    expect(console.error).toHaveBeenCalled();
  });
});

describe("cancelCustomerSubscriptions", () => {
  it("cancels only the subscriptions that are still running", async () => {
    mocks.stripe.subscriptions.list.mockResolvedValue({
      data: [
        { id: "sub_active", status: "active" },
        { id: "sub_past_due", status: "past_due" },
        { id: "sub_canceled", status: "canceled" },
        { id: "sub_expired", status: "incomplete_expired" },
      ],
    });

    await cancelCustomerSubscriptions("cus_1");

    const cancelled = mocks.stripe.subscriptions.cancel.mock.calls.map(([id]) => id);
    expect(cancelled.sort()).toEqual(["sub_active", "sub_past_due"]);
  });
});
