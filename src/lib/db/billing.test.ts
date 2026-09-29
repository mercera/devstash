import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    user: { findUnique: vi.fn(), updateMany: vi.fn() },
    item: { count: vi.fn() },
    collection: { count: vi.fn() },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));

import {
  applySubscriptionState,
  claimStripeCustomerId,
  getUsageCounts,
} from "@/lib/db/billing";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getUsageCounts", () => {
  it("scopes both counts to the given user", async () => {
    mocks.prisma.item.count.mockResolvedValue(12);
    mocks.prisma.collection.count.mockResolvedValue(2);

    const counts = await getUsageCounts("user-1");

    expect(counts).toEqual({ itemCount: 12, collectionCount: 2 });
    expect(mocks.prisma.item.count).toHaveBeenCalledWith({ where: { userId: "user-1" } });
    expect(mocks.prisma.collection.count).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
  });
});

describe("claimStripeCustomerId", () => {
  it("only writes to a row that has no customer yet", async () => {
    mocks.prisma.user.updateMany.mockResolvedValue({ count: 1 });
    mocks.prisma.user.findUnique.mockResolvedValue({ stripeCustomerId: "cus_new" });

    expect(await claimStripeCustomerId("user-1", "cus_new")).toBe("cus_new");
    expect(mocks.prisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: "user-1", stripeCustomerId: null },
      data: { stripeCustomerId: "cus_new" },
    });
  });

  it("returns the winner's id when a concurrent request stored one first", async () => {
    mocks.prisma.user.updateMany.mockResolvedValue({ count: 0 });
    mocks.prisma.user.findUnique.mockResolvedValue({ stripeCustomerId: "cus_winner" });

    expect(await claimStripeCustomerId("user-1", "cus_loser")).toBe("cus_winner");
  });

  it("returns null when the row has gone", async () => {
    mocks.prisma.user.updateMany.mockResolvedValue({ count: 0 });
    mocks.prisma.user.findUnique.mockResolvedValue(null);

    expect(await claimStripeCustomerId("user-1", "cus_new")).toBeNull();
  });
});

describe("applySubscriptionState", () => {
  it("writes the plan for the customer's owner", async () => {
    mocks.prisma.user.updateMany.mockResolvedValue({ count: 1 });

    const matched = await applySubscriptionState("cus_1", {
      isPro: true,
      subscriptionId: "sub_1",
    });

    expect(matched).toBe(true);
    expect(mocks.prisma.user.updateMany).toHaveBeenCalledWith({
      where: { stripeCustomerId: "cus_1" },
      data: { isPro: true, stripeSubscriptionId: "sub_1" },
    });
  });

  it("returns false when no user owns the customer", async () => {
    mocks.prisma.user.updateMany.mockResolvedValue({ count: 0 });

    expect(
      await applySubscriptionState("cus_unknown", { isPro: false, subscriptionId: null }),
    ).toBe(false);
  });
});
