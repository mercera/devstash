import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The session, the database and Stripe are all mocked. `getPriceId` and the
 * customer lookup are replaced too, so each test controls exactly what the
 * action sees and nothing reaches Neon or Stripe.
 */

const mocks = vi.hoisted(() => {
  const stripe = {
    checkout: { sessions: { create: vi.fn() } },
    billingPortal: { sessions: { create: vi.fn() } },
  };

  return {
    auth: vi.fn(),
    stripe,
    getStripe: vi.fn(() => stripe),
    getPriceId: vi.fn((period: string) => `price_${period}`),
    getOrCreateStripeCustomer: vi.fn(),
    prisma: { user: { findUnique: vi.fn() } },
  };
});

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/stripe", () => ({
  getStripe: mocks.getStripe,
  getPriceId: mocks.getPriceId,
}));
vi.mock("@/lib/billing", () => ({
  getOrCreateStripeCustomer: mocks.getOrCreateStripeCustomer,
}));

import { createBillingPortalSession, createCheckoutSession } from "@/actions/billing";

const freeUser = {
  email: "ada@devstash.io",
  name: "Ada",
  isPro: false,
  stripeCustomerId: null,
  stripeSubscriptionId: null,
};

function signedInAs(id: string | null) {
  mocks.auth.mockResolvedValue(id ? { user: { id, isPro: false } } : null);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("AUTH_URL", "https://devstash.test");
  signedInAs("user-1");
  mocks.prisma.user.findUnique.mockResolvedValue(freeUser);
  mocks.getOrCreateStripeCustomer.mockResolvedValue("cus_1");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("createCheckoutSession", () => {
  it("refuses without a session", async () => {
    signedInAs(null);

    const result = await createCheckoutSession("monthly");

    expect(result).toEqual({ success: false, error: expect.stringMatching(/session/) });
    expect(mocks.getStripe).not.toHaveBeenCalled();
  });

  it("refuses a period that is not monthly or yearly", async () => {
    const result = await createCheckoutSession("weekly");

    expect(result).toEqual({ success: false, error: expect.stringMatching(/monthly or yearly/) });
    expect(mocks.prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("refuses when the user row has gone", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue(null);

    const result = await createCheckoutSession("monthly");

    expect(result.success).toBe(false);
    expect(mocks.getStripe).not.toHaveBeenCalled();
  });

  it("refuses an account that is already Pro without calling Stripe", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({ ...freeUser, isPro: true });

    const result = await createCheckoutSession("yearly");

    expect(result).toEqual({ success: false, error: expect.stringMatching(/already on Pro/) });
    expect(mocks.getOrCreateStripeCustomer).not.toHaveBeenCalled();
    expect(mocks.getStripe).not.toHaveBeenCalled();
  });

  it("creates a subscription Checkout for the user's customer and price", async () => {
    mocks.stripe.checkout.sessions.create.mockResolvedValue({
      url: "https://checkout.stripe.test/c/1",
    });

    const result = await createCheckoutSession("yearly");

    expect(result).toEqual({
      success: true,
      data: { url: "https://checkout.stripe.test/c/1" },
    });
    expect(mocks.getOrCreateStripeCustomer).toHaveBeenCalledWith("user-1", freeUser);
    expect(mocks.stripe.checkout.sessions.create).toHaveBeenCalledWith({
      mode: "subscription",
      customer: "cus_1",
      client_reference_id: "user-1",
      line_items: [{ price: "price_yearly", quantity: 1 }],
      subscription_data: { metadata: { userId: "user-1" } },
      success_url:
        "https://devstash.test/settings?checkout=success&session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "https://devstash.test/settings?checkout=cancelled",
    });
  });

  it("fails generically when Checkout comes back without a URL", async () => {
    mocks.stripe.checkout.sessions.create.mockResolvedValue({ url: null });

    const result = await createCheckoutSession("monthly");

    expect(result).toEqual({ success: false, error: expect.stringMatching(/went wrong/) });
    expect(console.error).toHaveBeenCalled();
  });

  it("logs a Stripe error and returns the generic message", async () => {
    mocks.stripe.checkout.sessions.create.mockRejectedValue(new Error("card_declined"));

    const result = await createCheckoutSession("monthly");

    expect(result).toEqual({ success: false, error: "Something went wrong. Please try again." });
    expect(console.error).toHaveBeenCalled();
  });
});

describe("createBillingPortalSession", () => {
  it("refuses without a session", async () => {
    signedInAs(null);

    const result = await createBillingPortalSession();

    expect(result.success).toBe(false);
    expect(mocks.getStripe).not.toHaveBeenCalled();
  });

  it("refuses a user with no Stripe customer", async () => {
    const result = await createBillingPortalSession();

    expect(result).toEqual({ success: false, error: expect.stringMatching(/no billing account/) });
    expect(mocks.getStripe).not.toHaveBeenCalled();
  });

  it("opens the portal for the stored customer", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({
      ...freeUser,
      stripeCustomerId: "cus_1",
    });
    mocks.stripe.billingPortal.sessions.create.mockResolvedValue({
      url: "https://billing.stripe.test/p/1",
    });

    const result = await createBillingPortalSession();

    expect(result).toEqual({ success: true, data: { url: "https://billing.stripe.test/p/1" } });
    expect(mocks.stripe.billingPortal.sessions.create).toHaveBeenCalledWith({
      customer: "cus_1",
      return_url: "https://devstash.test/settings",
    });
  });

  it("logs a Stripe error and returns the generic message", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({
      ...freeUser,
      stripeCustomerId: "cus_1",
    });
    mocks.stripe.billingPortal.sessions.create.mockRejectedValue(new Error("offline"));

    const result = await createBillingPortalSession();

    expect(result).toEqual({ success: false, error: "Something went wrong. Please try again." });
    expect(console.error).toHaveBeenCalled();
  });
});
