import { describe, expect, it } from "vitest";
import { z } from "zod";

import { invalidInput, isId } from "@/lib/action-helpers";
import { INVALID_INPUT } from "@/lib/messages";

describe("isId", () => {
  it("accepts a non-empty string", () => {
    expect(isId("item-1")).toBe(true);
  });

  it.each([[""], [undefined], [null], [42], [{}], [["item-1"]]])(
    "rejects %j",
    (value) => {
      expect(isId(value)).toBe(false);
    },
  );
});

describe("invalidInput", () => {
  const schema = z.object({
    name: z.string().min(1, "Name is required"),
    count: z.number(),
  });

  it("returns the shared message with per-field issues", () => {
    const parsed = schema.safeParse({ name: "", count: "three" });

    if (parsed.success) throw new Error("expected the parse to fail");

    const result = invalidInput(parsed.error);

    expect(result.error).toBe(INVALID_INPUT);
    expect(result.issues.name).toEqual(["Name is required"]);
    expect(result.issues.count).toHaveLength(1);
  });

  it("leaves fields that passed out of the issues", () => {
    const parsed = schema.safeParse({ name: "ok", count: "three" });

    if (parsed.success) throw new Error("expected the parse to fail");

    expect(invalidInput(parsed.error).issues).not.toHaveProperty("name");
  });
});
