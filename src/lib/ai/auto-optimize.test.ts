import { beforeEach, describe, expect, it, vi } from "vitest";
import { APIUserAbortError, RateLimitError } from "openai";

/**
 * The flow behind `POST /api/ai/optimize-prompt`, with OpenAI
 * (`@/lib/ai/client`), the rate limiter and the item query mocked. The shared
 * session and configuration checks are covered in depth by
 * `auto-tags.test.ts`; this file covers what differs for optimization: the
 * item lookup, the length refusal and the structured answer.
 */

const mocks = vi.hoisted(() => {
  const create = vi.fn();

  return {
    create,
    isAiConfigured: vi.fn(),
    getOpenAI: vi.fn(() => ({ responses: { create } })),
    checkRateLimit: vi.fn(),
    getItemCode: vi.fn(),
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

vi.mock("@/lib/db/items", () => ({ getItemCode: mocks.getItemCode }));

import { generatePromptOptimization } from "@/lib/ai/auto-optimize";
import { OPTIMIZE_CONTENT_MAX_CHARS } from "@/lib/validations/ai";

const pro = { id: "user-1", isPro: true };
const free = { id: "user-2", isPro: false };
const request = { itemId: "item-1" };

const prompt = {
  title: "Code review",
  content: "review {{code}}",
  language: null,
  typeSlug: "prompt",
};

const rewrite = "You are a senior reviewer. Review {{code}} and list bugs by severity.";

function modelAnswers(output: object) {
  mocks.create.mockResolvedValue({ status: "completed", output_text: JSON.stringify(output) });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isAiConfigured.mockReturnValue(true);
  mocks.checkRateLimit.mockResolvedValue({ success: true, remaining: 19, reset: Date.now() });
  mocks.getItemCode.mockResolvedValue(prompt);
  modelAnswers({ optimizedPrompt: rewrite, changes: ["Added a role", "Asked for severity"] });
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("generatePromptOptimization", () => {
  it("refuses without a session", async () => {
    expect((await generatePromptOptimization(null, request))?.status).toBe(401);
    expect(mocks.getItemCode).not.toHaveBeenCalled();
  });

  it("refuses a Free user before the item, the rate limit or OpenAI", async () => {
    const result = await generatePromptOptimization(free, request);

    expect(result).toMatchObject({ status: 403, body: { upgradeRequired: true } });
    expect(mocks.getItemCode).not.toHaveBeenCalled();
    expect(mocks.checkRateLimit).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("rejects pasted text instead of an id", async () => {
    expect(await generatePromptOptimization(pro, { content: "be nicer" })).toEqual({
      status: 422,
      body: { success: false, error: "This item can't be optimized." },
    });
    expect(mocks.getItemCode).not.toHaveBeenCalled();
  });

  it("looks the item up as the caller, so another user's item is not found", async () => {
    mocks.getItemCode.mockResolvedValue(null);

    const result = await generatePromptOptimization(pro, { itemId: "someone-elses-item" });

    expect(mocks.getItemCode).toHaveBeenCalledWith("someone-elses-item", "user-1");
    expect(result?.status).toBe(404);
    expect(mocks.checkRateLimit).not.toHaveBeenCalled();
  });

  it.each([
    ["a snippet", { ...prompt, typeSlug: "snippet" }, "Only prompts can be optimized."],
    ["an empty prompt", { ...prompt, content: " \n " }, "There's no prompt to optimize."],
    [
      "a prompt over the limit",
      { ...prompt, content: "x".repeat(OPTIMIZE_CONTENT_MAX_CHARS + 1) },
      "This prompt is too long to optimize. The limit is 8,000 characters.",
    ],
  ])("refuses %s without using up the rate limit", async (_label, item, error) => {
    mocks.getItemCode.mockResolvedValue(item);

    expect(await generatePromptOptimization(pro, request)).toEqual({
      status: 422,
      body: { success: false, error },
    });
    expect(mocks.checkRateLimit).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("answers 500 when the item cannot be loaded", async () => {
    mocks.getItemCode.mockRejectedValue(new Error("connection lost"));

    expect((await generatePromptOptimization(pro, request))?.status).toBe(500);
  });

  it("answers 429 once the shared AI limit is spent", async () => {
    mocks.checkRateLimit.mockResolvedValue({
      success: false,
      remaining: 0,
      reset: Date.now() + 90_000,
    });

    const result = await generatePromptOptimization(pro, request);

    expect(mocks.checkRateLimit).toHaveBeenCalledWith("ai", "user-1");
    expect(result?.status).toBe(429);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("returns the rewrite and what changed", async () => {
    expect(await generatePromptOptimization(pro, request)).toEqual({
      status: 200,
      body: {
        success: true,
        data: { optimizedPrompt: rewrite, changes: ["Added a role", "Asked for severity"] },
      },
    });
  });

  it("returns a null rewrite when the model changed nothing", async () => {
    modelAnswers({ optimizedPrompt: prompt.content, changes: [] });

    expect(await generatePromptOptimization(pro, request)).toMatchObject({
      status: 200,
      body: { data: { optimizedPrompt: null, changes: [] } },
    });
  });

  it("stores nothing, asks for JSON and forwards the signal", async () => {
    const signal = new AbortController().signal;

    await generatePromptOptimization(pro, request, signal);

    const [params, options] = mocks.create.mock.calls[0];

    expect(params).toMatchObject({
      model: "gpt-5-nano",
      store: false,
      text: { format: { type: "json_object" } },
    });
    expect(params).not.toHaveProperty("temperature");
    expect(params.safety_identifier).not.toContain("user-1");
    expect(params.input).toContain("<prompt>\nreview {{code}}\n</prompt>");
    expect(options).toEqual({ signal });
  });

  it("answers 502 for a rewrite that drops a placeholder", async () => {
    modelAnswers({ optimizedPrompt: "Review the code carefully.", changes: ["Clearer"] });

    expect((await generatePromptOptimization(pro, request))?.status).toBe(502);
  });

  it("answers 502 for a response cut short", async () => {
    mocks.create.mockResolvedValue({
      status: "incomplete",
      incomplete_details: { reason: "max_output_tokens" },
      output_text: "",
    });

    expect((await generatePromptOptimization(pro, request))?.status).toBe(502);
  });

  it("maps a provider refusal to 503", async () => {
    mocks.create.mockRejectedValue(
      new RateLimitError(429, { code: "insufficient_quota" }, "quota", new Headers()),
    );

    expect((await generatePromptOptimization(pro, request))?.status).toBe(503);
  });

  it("returns null when the caller cancelled", async () => {
    mocks.create.mockRejectedValue(new APIUserAbortError());

    expect(await generatePromptOptimization(pro, request)).toBeNull();
  });
});
