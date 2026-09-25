import { describe, expect, it } from "vitest";

import { createCollectionSchema } from "@/lib/validations/collections";

describe("createCollectionSchema", () => {
  it("trims the name and description", () => {
    expect(
      createCollectionSchema.parse({
        name: "  React Patterns ",
        description: " Hooks and HOCs  ",
      }),
    ).toEqual({ name: "React Patterns", description: "Hooks and HOCs" });
  });

  it.each([undefined, null, "", "   "])(
    "stores a description of %j as null",
    (description) => {
      expect(createCollectionSchema.parse({ name: "Notes", description })).toEqual({
        name: "Notes",
        description: null,
      });
    },
  );

  it.each(["", "   "])("requires a name, rejecting %j", (name) => {
    const result = createCollectionSchema.safeParse({ name });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.name).toEqual(["Name is required"]);
  });

  it("rejects a name that is not a string", () => {
    expect(createCollectionSchema.safeParse({ name: 42 }).success).toBe(false);
  });
});
