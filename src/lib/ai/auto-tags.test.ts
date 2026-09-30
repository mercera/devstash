import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  APIConnectionTimeoutError,
  APIUserAbortError,
  InternalServerError,
  RateLimitError,
} from "openai";

/**
 * The flow behind `POST /api/ai/tags`, with OpenAI (`@/lib/ai/client`) and
 * the rate limiter mocked. No test reaches OpenAI or Upstash.
 */

const mocks = vi.hoisted(() => {
  const create = vi.fn();

  return {
    create,
    isAiConfigured: vi.fn(),
    getOpenAI: vi.fn(() => ({ responses: { create } })),
    checkRateLimit: vi.fn(),
  };
});

vi.mock("@/lib/ai/client", () => ({
  AI_MODEL: "gpt-5-nano",
  isAiConfigured: mocks.isAiConfigured,
  getOpenAI: mocks.getOpenAI,
}));

vi.mock("@/lib/rate-limit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/rate-limit")>()),
  checkRateLimit: mocks.checkRateLimit,
}));

import { generateAutoTags } from "@/lib/ai/auto-tags";
import { TAG_CONTENT_MAX_CHARS } from "@/lib/validations/ai";

const pro = { id: "user-1", isPro: true };
const free = { id: "user-2", isPro: false };

const request = {
  typeSlug: "snippet",
  title: "useDebounce hook",
  content: "export function useDebounce() {}",
  language: "typescript",
  tags: ["react"],
};

function modelReturns(outputText: string, status = "completed") {
  mocks.create.mockResolvedValue({ status, output_text: outputText, incomplete_details: null });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isAiConfigured.mockReturnValue(true);
  mocks.checkRateLimit.mockResolvedValue({ success: true, remaining: 19, reset: Date.now() });
  modelReturns('{"tags": ["React", "hooks", "TypeScript", "debounce"]}');
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("generateAutoTags", () => {
  it("refuses without a session", async () => {
    const result = await generateAutoTags(null, request);

    expect(result?.status).toBe(401);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("refuses a Free user before the rate limit or OpenAI", async () => {
    const result = await generateAutoTags(free, request);

    expect(result?.status).toBe(403);
    expect(result?.body).toMatchObject({ success: false, upgradeRequired: true });
    expect(mocks.checkRateLimit).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("answers 503 when no API key is configured", async () => {
    mocks.isAiConfigured.mockReturnValue(false);

    const result = await generateAutoTags(pro, request);

    expect(result?.status).toBe(503);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it.each([
    ["an unsupported type", { ...request, typeSlug: "image" }],
    ["a missing body", null],
    ["tags that are not an array", { ...request, tags: "react" }],
  ])("rejects %s without using up the rate limit", async (_label, body) => {
    const result = await generateAutoTags(pro, body);

    expect(result?.status).toBe(422);
    expect(mocks.checkRateLimit).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("asks for a title or content when both are blank", async () => {
    const result = await generateAutoTags(pro, { ...request, title: " ", content: "  " });

    expect(result).toEqual({
      status: 422,
      body: { success: false, error: "Add a title or some content first." },
    });
  });

  it("answers 429 with the wait when the AI limit is reached", async () => {
    mocks.checkRateLimit.mockResolvedValue({
      success: false,
      remaining: 0,
      reset: Date.now() + 10 * 60_000,
    });

    const result = await generateAutoTags(pro, request);

    expect(mocks.checkRateLimit).toHaveBeenCalledWith("ai", "user-1");
    expect(result?.status).toBe(429);
    expect(result?.retryAfter).toBeGreaterThan(0);
    expect(result?.body).toMatchObject({
      success: false,
      error: expect.stringMatching(/hourly AI limit.*10 minutes/),
    });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("returns normalized tags, leaving out the ones already in the field", async () => {
    const result = await generateAutoTags(pro, request);

    expect(result).toEqual({
      status: 200,
      body: { success: true, data: { tags: ["hooks", "typescript", "debounce"] } },
    });
  });

  it("accepts a bare array from the model", async () => {
    modelReturns('["Node", "express"]');

    const result = await generateAutoTags(pro, request);

    expect(result?.body).toEqual({ success: true, data: { tags: ["node", "express"] } });
  });

  it("calls the Responses API with JSON output, stores nothing and forwards the signal", async () => {
    const signal = new AbortController().signal;

    await generateAutoTags(pro, { ...request, content: "y".repeat(5_000) }, signal);

    const [params, options] = mocks.create.mock.calls[0];

    expect(params).toMatchObject({
      model: "gpt-5-nano",
      text: { format: { type: "json_object" } },
      store: false,
    });
    expect(params.instructions).toMatch(/JSON/);
    expect(params).not.toHaveProperty("temperature");
    expect(params).not.toHaveProperty("max_tokens");
    expect(params.safety_identifier).not.toContain("user-1");
    expect(params.input).toContain("y".repeat(TAG_CONTENT_MAX_CHARS));
    expect(params.input).not.toContain("y".repeat(TAG_CONTENT_MAX_CHARS + 1));
    expect(options).toEqual({ signal });
  });

  it.each([
    ["an incomplete response", () => modelReturns("", "incomplete")],
    ["empty output", () => modelReturns("   ")],
    ["output that is not JSON", () => modelReturns("react, hooks")],
    ["a provider error", () => mocks.create.mockRejectedValue(
      new InternalServerError(500, {}, "boom", new Headers()),
    )],
  ])("answers 502 for %s", async (_label, arrange) => {
    arrange();

    const result = await generateAutoTags(pro, request);

    expect(result?.status).toBe(502);
    expect(result?.body).toEqual({
      success: false,
      error: "The AI couldn't finish that request. Try again.",
    });
  });

  it("answers 503 without OpenAI's own message when our key is rate limited", async () => {
    mocks.create.mockRejectedValue(
      new RateLimitError(429, {}, "You exceeded your current quota for org-abc", new Headers()),
    );

    const result = await generateAutoTags(pro, request);

    expect(result?.status).toBe(503);
    expect(JSON.stringify(result?.body)).not.toContain("org-abc");
  });

  it("answers 504 on a timeout", async () => {
    mocks.create.mockRejectedValue(new APIConnectionTimeoutError());

    expect((await generateAutoTags(pro, request))?.status).toBe(504);
  });

  it("returns null when the caller cancelled", async () => {
    mocks.create.mockRejectedValue(new APIUserAbortError());

    expect(await generateAutoTags(pro, request)).toBeNull();
  });
});
