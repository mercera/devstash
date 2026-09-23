import { describe, expect, it, vi } from "vitest";

import { isEmailVerificationEnabled } from "@/lib/flags";

describe("isEmailVerificationEnabled", () => {
  it("is on when the variable is unset", () => {
    vi.stubEnv("EMAIL_VERIFICATION_ENABLED", undefined);

    expect(isEmailVerificationEnabled()).toBe(true);
  });

  it.each(["false", "0", "off", "no", "FALSE", "Off", "  false  "])(
    "is off for %j",
    (value) => {
      vi.stubEnv("EMAIL_VERIFICATION_ENABLED", value);

      expect(isEmailVerificationEnabled()).toBe(false);
    },
  );

  // Anything that is not an explicit "off" must leave the protection on, so a
  // typo or a blank value in a deploy cannot silently disable it.
  it.each(["true", "1", "", "banana", "disabled", "fasle"])("is on for %j", (value) => {
    vi.stubEnv("EMAIL_VERIFICATION_ENABLED", value);

    expect(isEmailVerificationEnabled()).toBe(true);
  });

  it("reads the environment per call rather than at import", () => {
    vi.stubEnv("EMAIL_VERIFICATION_ENABLED", "false");
    expect(isEmailVerificationEnabled()).toBe(false);

    vi.stubEnv("EMAIL_VERIFICATION_ENABLED", "true");
    expect(isEmailVerificationEnabled()).toBe(true);
  });
});
