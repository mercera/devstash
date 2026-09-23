import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { limit } = vi.hoisted(() => ({ limit: vi.fn() }));

// The real client would open a connection to Upstash. Only `limit` is exercised
// here; `slidingWindow` just has to return something the constructor accepts.
vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: Object.assign(
    vi.fn(function () {
      return { limit };
    }),
    { slidingWindow: vi.fn() },
  ),
}));

vi.mock("@upstash/redis", () => ({
  Redis: vi.fn(),
}));

import {
  checkRateLimit,
  getClientIp,
  ipAndEmailKey,
  rateLimitMessage,
  retryAfterSeconds,
} from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    limit.mockReset();
  });

  it("allows every request when Upstash is not configured", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");

    const result = await checkRateLimit("signIn", "1.2.3.4");

    expect(result.success).toBe(true);
    expect(limit).not.toHaveBeenCalled();
  });

  describe("when configured", () => {
    beforeEach(() => {
      vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://upstash.test");
      vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");
    });

    it("passes the limiter's verdict through", async () => {
      limit.mockResolvedValue({ success: false, remaining: 0, reset: 123, pending: null });

      await expect(checkRateLimit("register", "1.2.3.4")).resolves.toEqual({
        success: false,
        remaining: 0,
        reset: 123,
      });
      expect(limit).toHaveBeenCalledWith("1.2.3.4");
    });

    it("fails open when Upstash errors", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      limit.mockRejectedValue(new Error("ECONNREFUSED"));

      const result = await checkRateLimit("register", "1.2.3.4");

      expect(result.success).toBe(true);
      expect(console.error).toHaveBeenCalled();
    });
  });
});

describe("getClientIp", () => {
  it("takes the first entry of x-forwarded-for", () => {
    const headers = new Headers({ "x-forwarded-for": " 203.0.113.7 , 10.0.0.1" });

    expect(getClientIp(headers)).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip", () => {
    expect(getClientIp(new Headers({ "x-real-ip": "198.51.100.2" }))).toBe("198.51.100.2");
  });

  it("uses a shared bucket when no address is available", () => {
    expect(getClientIp(new Headers())).toBe("unknown");
    expect(getClientIp(new Headers({ "x-forwarded-for": " , " }))).toBe("unknown");
  });
});

describe("ipAndEmailKey", () => {
  it("normalises the email so case and whitespace cannot mint new budgets", () => {
    expect(ipAndEmailKey("1.2.3.4", "  Demo@DevStash.io ")).toBe("1.2.3.4:demo@devstash.io");
  });
});

describe("retryAfterSeconds", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("rounds up to whole seconds", () => {
    expect(retryAfterSeconds(Date.now() + 1_500)).toBe(2);
  });

  it("never returns less than one second", () => {
    expect(retryAfterSeconds(Date.now() - 5_000)).toBe(1);
  });
});

describe("rateLimitMessage", () => {
  it.each([
    [1, "1 second"],
    [45, "45 seconds"],
    [60, "1 minute"],
    [61, "2 minutes"],
    [3_600, "1 hour"],
    [3_601, "2 hours"],
  ])("states %i seconds as %j", (seconds, phrase) => {
    expect(rateLimitMessage(seconds)).toBe(`Too many attempts. Please try again in ${phrase}.`);
  });
});
