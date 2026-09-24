import { describe, expect, it } from "vitest";

import { DEFAULT_SIGN_IN_REDIRECT, toSafeRedirect } from "@/lib/routes";

describe("toSafeRedirect", () => {
  it.each([
    ["/dashboard", "/dashboard"],
    ["/items/snippet", "/items/snippet"],
    ["/dashboard?tab=recent#pinned", "/dashboard?tab=recent#pinned"],
    ["/dashboard?next=//evil.com", "/dashboard?next=//evil.com"],
  ])("keeps the in-app path %j", (input, expected) => {
    expect(toSafeRedirect(input)).toBe(expected);
  });

  it.each([
    ["an absolute URL", "https://evil.com"],
    ["a protocol-relative URL", "//evil.com"],
    ["a backslash after the slash", "/\\evil.com"],
    ["a tab the parser strips", "/\t/evil.com"],
    ["a newline the parser strips", "/\n/evil.com"],
    ["a dot segment that collapses to //", "/.//evil.com"],
    ["a parent segment that collapses to //", "/a/..//evil.com"],
    ["a relative path", "dashboard"],
    ["a javascript: URL", "javascript:alert(1)"],
    ["an empty string", ""],
  ])("rejects %s", (_label, input) => {
    expect(toSafeRedirect(input)).toBe(DEFAULT_SIGN_IN_REDIRECT);
  });

  it.each([undefined, null, 42])("rejects the non-string %j", (input) => {
    expect(toSafeRedirect(input)).toBe(DEFAULT_SIGN_IN_REDIRECT);
  });
});
