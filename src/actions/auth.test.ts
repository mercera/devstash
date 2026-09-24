import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The two "email me a link" actions, with every I/O boundary mocked: the
 * request headers, the rate limiter's Redis call, the flag and the services
 * that send mail. The key helpers in `@/lib/rate-limit` stay real, so the
 * tests see the exact key each limit is consumed under.
 */

const mocks = vi.hoisted(() => ({
  checkRateLimit: vi.fn(),
  isEmailVerificationEnabled: vi.fn(),
  resendEmailVerification: vi.fn(),
  requestPasswordReset: vi.fn(),
}));

const CLIENT_IP = "203.0.113.7";

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": CLIENT_IP }),
}));
// next-auth's entry imports `next/server` without an extension, which only
// resolves under Next's bundler. These actions need its two error classes.
vi.mock("next-auth", () => ({
  AuthError: class AuthError extends Error {},
  CredentialsSignin: class CredentialsSignin extends Error {},
}));
vi.mock("@/auth", () => ({ signIn: vi.fn(), signOut: vi.fn() }));
vi.mock("@/lib/flags", () => ({
  isEmailVerificationEnabled: mocks.isEmailVerificationEnabled,
}));
vi.mock("@/lib/email-verification", () => ({
  VERIFICATION_TOKEN_TTL_HOURS: 24,
  resendEmailVerification: mocks.resendEmailVerification,
}));
vi.mock("@/lib/password-reset", () => ({
  PASSWORD_RESET_TOKEN_TTL_HOURS: 1,
  requestPasswordReset: mocks.requestPasswordReset,
  resetPasswordWithToken: vi.fn(),
}));
vi.mock("@/lib/rate-limit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/rate-limit")>()),
  checkRateLimit: mocks.checkRateLimit,
}));

import { requestPasswordResetEmail, resendVerificationEmail } from "@/actions/auth";
import { ipAndEmailKey } from "@/lib/rate-limit";

const EMAIL = "someone@devstash.io";

function emailForm(email: string): FormData {
  const data = new FormData();
  data.set("email", email);
  return data;
}

function allowed() {
  mocks.checkRateLimit.mockResolvedValue({ success: true, remaining: 2, reset: Date.now() });
}

function limited() {
  mocks.checkRateLimit.mockResolvedValue({
    success: false,
    remaining: 0,
    reset: Date.now() + 5 * 60_000,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  allowed();
  mocks.isEmailVerificationEnabled.mockReturnValue(true);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("resendVerificationEmail", () => {
  it("sends a link and returns the neutral message", async () => {
    const state = await resendVerificationEmail({}, emailForm(EMAIL));

    expect(mocks.resendEmailVerification).toHaveBeenCalledWith(EMAIL);
    expect(state).toEqual({
      message: expect.stringContaining("expires in 24 hours"),
      email: EMAIL,
    });
  });

  it("limits by IP and address together", async () => {
    await resendVerificationEmail({}, emailForm(EMAIL));

    expect(mocks.checkRateLimit).toHaveBeenCalledWith(
      "resendVerification",
      ipAndEmailKey(CLIENT_IP, EMAIL),
    );
  });

  it("rejects a malformed address before the rate limit", async () => {
    const state = await resendVerificationEmail({}, emailForm("not-an-email"));

    expect(state).toEqual({ error: "Enter a valid email address", email: "not-an-email" });
    expect(mocks.checkRateLimit).not.toHaveBeenCalled();
    expect(mocks.resendEmailVerification).not.toHaveBeenCalled();
  });

  it("refuses without sending when over the limit", async () => {
    limited();

    const state = await resendVerificationEmail({}, emailForm(EMAIL));

    expect(state).toMatchObject({ rateLimited: true, email: EMAIL });
    expect(state.error).toMatch(/try again in 5 minutes/i);
    expect(mocks.resendEmailVerification).not.toHaveBeenCalled();
  });

  it("sends nothing, but replies the same, when verification is off", async () => {
    mocks.isEmailVerificationEnabled.mockReturnValue(false);

    const off = await resendVerificationEmail({}, emailForm(EMAIL));

    mocks.isEmailVerificationEnabled.mockReturnValue(true);
    const on = await resendVerificationEmail({}, emailForm(EMAIL));

    expect(mocks.resendEmailVerification).toHaveBeenCalledTimes(1);
    expect(off).toEqual(on);
  });

  it("reports a generic error when sending fails", async () => {
    mocks.resendEmailVerification.mockRejectedValue(new Error("Resend is down"));

    const state = await resendVerificationEmail({}, emailForm(EMAIL));

    expect(state).toEqual({ error: "Something went wrong. Please try again.", email: EMAIL });
    expect(console.error).toHaveBeenCalled();
  });
});

describe("requestPasswordResetEmail", () => {
  it("sends a link and returns the neutral message", async () => {
    const state = await requestPasswordResetEmail({}, emailForm(EMAIL));

    expect(mocks.requestPasswordReset).toHaveBeenCalledWith(EMAIL);
    expect(state).toEqual({
      message: expect.stringContaining("expires in 1 hour"),
      email: EMAIL,
    });
  });

  it("limits by IP alone, so varying the address buys nothing", async () => {
    await requestPasswordResetEmail({}, emailForm(EMAIL));

    expect(mocks.checkRateLimit).toHaveBeenCalledWith("forgotPassword", CLIENT_IP);
  });

  it("is not gated on the verification flag", async () => {
    mocks.isEmailVerificationEnabled.mockReturnValue(false);

    await requestPasswordResetEmail({}, emailForm(EMAIL));

    expect(mocks.requestPasswordReset).toHaveBeenCalledWith(EMAIL);
  });

  it("refuses without sending when over the limit", async () => {
    limited();

    const state = await requestPasswordResetEmail({}, emailForm(EMAIL));

    expect(state.rateLimited).toBe(true);
    expect(mocks.requestPasswordReset).not.toHaveBeenCalled();
  });

  it("reports a generic error when sending fails", async () => {
    mocks.requestPasswordReset.mockRejectedValue(new Error("Resend is down"));

    const state = await requestPasswordResetEmail({}, emailForm(EMAIL));

    expect(state).toEqual({ error: "Something went wrong. Please try again.", email: EMAIL });
  });
});
