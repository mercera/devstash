import { describe, expect, it } from "vitest";

import {
  MAX_PAGE,
  getPageHref,
  getPageRange,
  getPageSlots,
  getTotalPages,
  parsePageParam,
} from "@/lib/pagination";

describe("parsePageParam", () => {
  it("reads a positive whole number", () => {
    expect(parsePageParam("1")).toBe(1);
    expect(parsePageParam("7")).toBe(7);
  });

  it.each([
    ["missing", undefined],
    ["empty", ""],
    ["zero", "0"],
    ["negative", "-1"],
    ["fractional", "2.5"],
    ["not a number", "abc"],
    ["padded", " 2 "],
    ["repeated", ["2", "3"]],
  ])("falls back to page 1 when %s", (_, value) => {
    expect(parsePageParam(value)).toBe(1);
  });

  it("caps an absurd page so it cannot become an absurd offset", () => {
    expect(parsePageParam("99999999999999999999")).toBe(MAX_PAGE);
  });
});

describe("getPageRange", () => {
  it("skips every earlier page", () => {
    expect(getPageRange(1, 21)).toEqual({ skip: 0, take: 21 });
    expect(getPageRange(3, 21)).toEqual({ skip: 42, take: 21 });
  });
});

describe("getTotalPages", () => {
  it("rounds a partial page up", () => {
    expect(getTotalPages(21, 21)).toBe(1);
    expect(getTotalPages(22, 21)).toBe(2);
    expect(getTotalPages(42, 21)).toBe(2);
  });

  it("gives an empty list one page", () => {
    expect(getTotalPages(0, 21)).toBe(1);
  });
});

describe("getPageHref", () => {
  it("leaves the query string off page 1", () => {
    expect(getPageHref("/items/snippet", 1)).toBe("/items/snippet");
  });

  it("adds the page for any later page", () => {
    expect(getPageHref("/items/snippet", 2)).toBe("/items/snippet?page=2");
  });
});

describe("getPageSlots", () => {
  it("lists every page when they all fit", () => {
    expect(getPageSlots(1, 1)).toEqual([1]);
    expect(getPageSlots(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("collapses the far end near the start", () => {
    expect(getPageSlots(1, 10)).toEqual([1, 2, 3, 4, 5, "ellipsis", 10]);
    expect(getPageSlots(4, 10)).toEqual([1, 2, 3, 4, 5, "ellipsis", 10]);
  });

  it("collapses both ends in the middle", () => {
    expect(getPageSlots(5, 10)).toEqual([1, "ellipsis", 4, 5, 6, "ellipsis", 10]);
  });

  it("collapses the near end towards the last page", () => {
    expect(getPageSlots(7, 10)).toEqual([1, "ellipsis", 6, 7, 8, 9, 10]);
    expect(getPageSlots(10, 10)).toEqual([1, "ellipsis", 6, 7, 8, 9, 10]);
  });

  it("always shows the current page and its neighbours", () => {
    for (let current = 1; current <= 20; current += 1) {
      const slots = getPageSlots(current, 20);

      expect(slots).toHaveLength(7);
      expect(slots).toContain(current);
      if (current > 1) expect(slots).toContain(current - 1);
      if (current < 20) expect(slots).toContain(current + 1);
    }
  });

  it("never hides a single page behind a gap", () => {
    for (let current = 1; current <= 20; current += 1) {
      const slots = getPageSlots(current, 20);

      slots.forEach((slot, index) => {
        if (slot !== "ellipsis") return;
        const before = slots[index - 1] as number;
        const after = slots[index + 1] as number;
        expect(after - before).toBeGreaterThan(2);
      });
    }
  });
});
