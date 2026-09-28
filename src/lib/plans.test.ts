import { describe, expect, it } from "vitest";

import {
  FREE_COLLECTION_LIMIT,
  FREE_ITEM_LIMIT,
  FREE_PLAN,
  formatPrice,
  getProPriceDisplay,
  getYearlySavingsPercent,
} from "./plans";

describe("formatPrice", () => {
  it("shows whole dollars without decimals", () => {
    expect(formatPrice(8)).toBe("$8");
    expect(formatPrice(72)).toBe("$72");
  });

  it("keeps cents when there are any", () => {
    expect(formatPrice(6.5)).toBe("$6.5");
  });
});

describe("getYearlySavingsPercent", () => {
  it("compares a year against twelve months", () => {
    // $72 against 12 × $8 = $96.
    expect(getYearlySavingsPercent()).toBe(25);
  });
});

describe("getProPriceDisplay", () => {
  it("shows the monthly price", () => {
    expect(getProPriceDisplay("monthly")).toEqual({
      amount: "$8",
      period: "/month",
      note: "Billed monthly",
    });
  });

  it("shows the yearly price with its monthly equivalent", () => {
    expect(getProPriceDisplay("yearly")).toEqual({
      amount: "$72",
      period: "/year",
      note: "Billed yearly — $6/month",
    });
  });
});

describe("FREE_PLAN", () => {
  it("states the limits from their constants", () => {
    expect(FREE_PLAN.features).toContain(`${FREE_ITEM_LIMIT} items`);
    expect(FREE_PLAN.features).toContain(`${FREE_COLLECTION_LIMIT} collections`);
  });
});
