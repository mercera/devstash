import type Stripe from "stripe";
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
    checkout: { sessions: { retrieve: vi.fn() } },
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
  handleStripeEvent,
  syncCheckoutSession,
  syncCustomerSubscription,
} from "@/lib/billing";

/** A minimal event: the handler reads only `type` and the customer / mode. */
function stripeEvent(type: string, object: Record<string, unknown>): Stripe.Event {
  return { id: "evt_1", type, data: { object } } as unknown as Stripe.Event;
}

/** Lets a sync run to completion: no subscriptions, and a user owns the customer. */
function syncSucceeds() {
  mocks.stripe.subscriptions.list.mockResolvedValue({ data: [] });
  mocks.applySubscriptionState.mockResolvedValue(true);
}

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
  it("reads the renewal date from the subscription item", async () => {
    vi.stubEnv("STRIPE_PRICE_ID_YEARLY", "price_year");
    mocks.stripe.subscriptions.retrieve.mockResolvedValue({
      status: "active",
      cancel_at_period_end: false,
      cancel_at: null,
      items: {
        data: [{ price: { id: "price_year" }, current_period_end: 1_800_000_000 }],
      },
    });

    const summary = await getSubscriptionSummary("sub_1");

    expect(summary).toEqual({
      period: "yearly",
      periodEnd: new Date(1_800_000_000 * 1000),
      willCancel: false,
      status: "active",
    });
  });

  it("treats the cancel_at_period_end flag as cancelling", async () => {
    mocks.stripe.subscriptions.retrieve.mockResolvedValue({
      status: "active",
      cancel_at_period_end: true,
      cancel_at: null,
      items: { data: [{ price: { id: "price_x" }, current_period_end: 1_800_000_000 }] },
    });

    const summary = await getSubscriptionSummary("sub_1");

    expect(summary).toMatchObject({
      willCancel: true,
      periodEnd: new Date(1_800_000_000 * 1000),
    });
  });

  it("treats a Portal cancellation (cancel_at, flag false) as cancelling on that date", async () => {
    mocks.stripe.subscriptions.retrieve.mockResolvedValue({
      status: "active",
      cancel_at_period_end: false,
      cancel_at: 1_790_000_000,
      items: { data: [{ price: { id: "price_x" }, current_period_end: 1_800_000_000 }] },
    });

    const summary = await getSubscriptionSummary("sub_1");

    expect(summary).toMatchObject({
      willCancel: true,
      periodEnd: new Date(1_790_000_000 * 1000),
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

describe("handleStripeEvent", () => {
  it.each([
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "customer.subscription.paused",
    "customer.subscription.resumed",
  ])("syncs the customer of %s", async (type) => {
    syncSucceeds();

    await handleStripeEvent(stripeEvent(type, { customer: "cus_1" }));

    expect(mocks.stripe.subscriptions.list).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_1" }),
    );
    expect(mocks.applySubscriptionState).toHaveBeenCalledWith("cus_1", expect.any(Object));
  });

  it("syncs a completed subscription checkout, expanded customer included", async () => {
    syncSucceeds();

    await handleStripeEvent(
      stripeEvent("checkout.session.completed", {
        mode: "subscription",
        customer: { id: "cus_2" },
      }),
    );

    expect(mocks.applySubscriptionState).toHaveBeenCalledWith("cus_2", expect.any(Object));
  });

  it("ignores a checkout in payment mode", async () => {
    await handleStripeEvent(
      stripeEvent("checkout.session.completed", { mode: "payment", customer: "cus_1" }),
    );

    expect(mocks.stripe.subscriptions.list).not.toHaveBeenCalled();
  });

  it("ignores event types it does not handle", async () => {
    await handleStripeEvent(stripeEvent("invoice.paid", { customer: "cus_1" }));

    expect(mocks.stripe.subscriptions.list).not.toHaveBeenCalled();
    expect(mocks.applySubscriptionState).not.toHaveBeenCalled();
  });

  it("lets a sync error propagate so the route answers 500", async () => {
    mocks.stripe.subscriptions.list.mockRejectedValue(new Error("offline"));

    await expect(
      handleStripeEvent(stripeEvent("customer.subscription.updated", { customer: "cus_1" })),
    ).rejects.toThrow("offline");
  });
});

describe("syncCheckoutSession", () => {
  it("syncs the user's own session", async () => {
    syncSucceeds();
    mocks.stripe.checkout.sessions.retrieve.mockResolvedValue({
      client_reference_id: "user-1",
      customer: "cus_1",
    });

    await syncCheckoutSession("cs_1", "user-1");

    expect(mocks.stripe.checkout.sessions.retrieve).toHaveBeenCalledWith("cs_1");
    expect(mocks.applySubscriptionState).toHaveBeenCalledWith("cus_1", expect.any(Object));
  });

  it("ignores another user's session", async () => {
    mocks.stripe.checkout.sessions.retrieve.mockResolvedValue({
      client_reference_id: "user-2",
      customer: "cus_2",
    });

    await syncCheckoutSession("cs_1", "user-1");

    expect(mocks.stripe.subscriptions.list).not.toHaveBeenCalled();
  });

  it("ignores a session with no customer", async () => {
    mocks.stripe.checkout.sessions.retrieve.mockResolvedValue({
      client_reference_id: "user-1",
      customer: null,
    });

    await syncCheckoutSession("cs_1", "user-1");

    expect(mocks.stripe.subscriptions.list).not.toHaveBeenCalled();
  });
});
