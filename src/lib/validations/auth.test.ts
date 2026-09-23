import { describe, expect, it } from "vitest";

import {
  MAX_PASSWORD_LENGTH,
  changePasswordSchema,
  registerSchema,
  signInSchema,
} from "@/lib/validations/auth";

const validRegistration = {
  name: "Demo User",
  email: "demo@devstash.io",
  password: "password123",
  confirmPassword: "password123",
};

describe("registerSchema", () => {
  it("accepts a valid registration and normalises the email", () => {
    const result = registerSchema.parse({
      ...validRegistration,
      email: "  Demo@DevStash.IO ",
    });

    expect(result.email).toBe("demo@devstash.io");
  });

  it("rejects mismatched passwords on confirmPassword", () => {
    const result = registerSchema.safeParse({
      ...validRegistration,
      confirmPassword: "password124",
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.confirmPassword).toEqual([
      "Passwords do not match",
    ]);
  });

  it.each([
    ["too short", "short"],
    ["too long", "a".repeat(MAX_PASSWORD_LENGTH + 1)],
  ])("rejects a password that is %s", (_label, password) => {
    const result = registerSchema.safeParse({
      ...validRegistration,
      password,
      confirmPassword: password,
    });

    expect(result.error?.flatten().fieldErrors.password).toHaveLength(1);
  });

  it("rejects a blank name", () => {
    const result = registerSchema.safeParse({ ...validRegistration, name: "   " });

    expect(result.error?.flatten().fieldErrors.name).toEqual(["Name is required"]);
  });
});

describe("signInSchema", () => {
  // Sign-in must not re-apply registration rules, or tightening them would lock
  // out existing accounts.
  it("accepts a password shorter than the registration minimum", () => {
    expect(signInSchema.safeParse({ email: "demo@devstash.io", password: "x" }).success).toBe(
      true,
    );
  });

  it("rejects an empty password", () => {
    expect(signInSchema.safeParse({ email: "demo@devstash.io", password: "" }).success).toBe(
      false,
    );
  });
});

describe("changePasswordSchema", () => {
  it("rejects reusing the current password", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "password123",
      password: "password123",
      confirmPassword: "password123",
    });

    expect(result.error?.flatten().fieldErrors.password).toEqual([
      "New password must be different from the current one",
    ]);
  });

  it("does not apply the length rules to the current password", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "old",
      password: "password123",
      confirmPassword: "password123",
    });

    expect(result.success).toBe(true);
  });
});
