import { describe, expect, it } from "vitest";

import { FREE_COLLECTION_LIMIT, FREE_ITEM_LIMIT } from "@/lib/plans";
import {
  PRO_TYPE_SLUGS,
  canCreateTypeSlug,
  canViewTypeSlug,
  checkCollectionLimit,
  checkItemLimit,
} from "@/lib/usage-limits";

describe("checkItemLimit", () => {
  it.each([0, 49])("allows a Free user at %i items", (count) => {
    expect(checkItemLimit(count, false)).toEqual({ allowed: true });
  });

  it.each([50, 51])("refuses a Free user at %i items", (count) => {
    const result = checkItemLimit(count, false);

    expect(result.allowed).toBe(false);
  });

  it("names the limit from plans.ts in the refusal", () => {
    const result = checkItemLimit(FREE_ITEM_LIMIT, false);

    expect(result).toEqual({
      allowed: false,
      error: expect.stringContaining(`${FREE_ITEM_LIMIT} items`),
    });
  });

  it("always allows Pro", () => {
    expect(checkItemLimit(500, true)).toEqual({ allowed: true });
  });
});

describe("checkCollectionLimit", () => {
  it("allows a Free user at 2 collections", () => {
    expect(checkCollectionLimit(2, false)).toEqual({ allowed: true });
  });

  it.each([3, 4])("refuses a Free user at %i collections", (count) => {
    expect(checkCollectionLimit(count, false).allowed).toBe(false);
  });

  it("names the limit from plans.ts in the refusal", () => {
    expect(checkCollectionLimit(FREE_COLLECTION_LIMIT, false)).toEqual({
      allowed: false,
      error: expect.stringContaining(`${FREE_COLLECTION_LIMIT} collections`),
    });
  });

  it("always allows Pro", () => {
    expect(checkCollectionLimit(50, true)).toEqual({ allowed: true });
  });
});

describe("canCreateTypeSlug", () => {
  it.each(["file", "image"])("refuses %s for Free and allows it for Pro", (slug) => {
    expect(canCreateTypeSlug(slug, false)).toBe(false);
    expect(canCreateTypeSlug(slug, true)).toBe(true);
  });

  it.each(["snippet", "prompt", "command", "note", "link"])(
    "allows %s for both plans",
    (slug) => {
      expect(canCreateTypeSlug(slug, false)).toBe(true);
      expect(canCreateTypeSlug(slug, true)).toBe(true);
    },
  );
});

describe("canViewTypeSlug", () => {
  it.each(["file", "image"])("hides %s from Free and shows it to Pro", (slug) => {
    expect(canViewTypeSlug(slug, false)).toBe(false);
    expect(canViewTypeSlug(slug, true)).toBe(true);
  });

  it.each(["snippet", "prompt", "command", "note", "link"])(
    "shows %s to both plans",
    (slug) => {
      expect(canViewTypeSlug(slug, false)).toBe(true);
      expect(canViewTypeSlug(slug, true)).toBe(true);
    },
  );
});

describe("PRO_TYPE_SLUGS", () => {
  it("is exactly the two upload types", () => {
    expect([...PRO_TYPE_SLUGS].sort()).toEqual(["file", "image"]);
  });
});
