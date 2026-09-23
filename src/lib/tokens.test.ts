import { describe, expect, it, vi } from "vitest";

import {
  EMAIL_VERIFICATION_PREFIX,
  PASSWORD_RESET_PREFIX,
  createToken,
  getBaseUrl,
  hashToken,
  linkTokenIdentifiersFor,
} from "@/lib/tokens";

describe("createToken", () => {
  it("returns 32 random bytes as URL-safe base64", () => {
    const token = createToken();

    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("does not repeat", () => {
    expect(createToken()).not.toBe(createToken());
  });
});

describe("hashToken", () => {
  it("is the hex SHA-256 of the token", () => {
    expect(hashToken("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("never returns the raw token", () => {
    const token = createToken();

    expect(hashToken(token)).not.toContain(token);
  });
});

describe("getBaseUrl", () => {
  it("falls back to localhost when AUTH_URL is unset", () => {
    vi.stubEnv("AUTH_URL", undefined);

    expect(getBaseUrl()).toBe("http://localhost:3000");
  });

  it("strips a trailing slash so links do not get a double slash", () => {
    vi.stubEnv("AUTH_URL", "https://devstash.example/");

    expect(getBaseUrl()).toBe("https://devstash.example");
  });
});

describe("linkTokenIdentifiersFor", () => {
  it("covers the bare address and both link flows", () => {
    expect(linkTokenIdentifiersFor("a@b.io")).toEqual([
      "a@b.io",
      `${EMAIL_VERIFICATION_PREFIX}a@b.io`,
      `${PASSWORD_RESET_PREFIX}a@b.io`,
    ]);
  });
});
