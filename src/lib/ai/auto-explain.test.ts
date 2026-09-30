import { beforeEach, describe, expect, it, vi } from "vitest";
import { APIUserAbortError, RateLimitError } from "openai";

/**
 * The flow behind `POST /api/ai/explain`, with OpenAI (`@/lib/ai/client`),
 * the rate limiter and the item query mocked. The shared session, plan and
 * configuration checks are covered in depth by `auto-tags.test.ts`; this file
 * covers what differs for explanations: the item lookup and the stream.
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

import { generateExplanation } from "@/lib/ai/auto-explain";

const pro = { id: "user-1", isPro: true };
const free = { id: "user-2", isPro: false };
const request = { itemId: "item-1" };

const command = {
  title: "Kill port",
  content: "lsof -i :3000 -t | xargs kill -9",
  language: "bash",
  typeSlug: "command",
};

/** What `responses.create({ stream: true })` resolves to: events plus a controller. */
function modelStreams(...deltas: string[]) {
  const controller = new AbortController();

  mocks.create.mockResolvedValue({
    controller,
    async *[Symbol.asyncIterator]() {
      for (const delta of deltas) yield { type: "response.output_text.delta", delta };
    },
  });

  return controller;
}

async function readStream(result: Awaited<ReturnType<typeof generateExplanation>>) {
  if (!result || !("stream" in result)) throw new Error("expected a stream");

  return new Response(result.stream).text();
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isAiConfigured.mockReturnValue(true);
  mocks.checkRateLimit.mockResolvedValue({ success: true, remaining: 19, reset: Date.now() });
  mocks.getItemCode.mockResolvedValue(command);
  modelStreams("Finds the process ", "on port 3000 and kills it.");
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("generateExplanation", () => {
  it("refuses without a session", async () => {
    expect((await generateExplanation(null, request))?.status).toBe(401);
    expect(mocks.getItemCode).not.toHaveBeenCalled();
  });

  it("refuses a Free user before the item, the rate limit or OpenAI", async () => {
    const result = await generateExplanation(free, request);

    expect(result).toEqual({
      status: 403,
      body: {
        success: false,
        error: "This is a Pro feature. Upgrade to Pro to use it.",
        upgradeRequired: true,
      },
    });
    expect(mocks.getItemCode).not.toHaveBeenCalled();
    expect(mocks.checkRateLimit).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("answers 503 when no API key is configured", async () => {
    mocks.isAiConfigured.mockReturnValue(false);

    expect((await generateExplanation(pro, request))?.status).toBe(503);
    expect(mocks.getItemCode).not.toHaveBeenCalled();
  });

  it.each([
    ["a missing body", null],
    ["a blank id", { itemId: "  " }],
    ["pasted code instead of an id", { content: "rm -rf /" }],
  ])("rejects %s", async (_label, body) => {
    expect(await generateExplanation(pro, body)).toEqual({
      status: 422,
      body: { success: false, error: "This item can't be explained." },
    });
    expect(mocks.getItemCode).not.toHaveBeenCalled();
  });

  it("looks the item up as the caller, so another user's item is not found", async () => {
    mocks.getItemCode.mockResolvedValue(null);

    const result = await generateExplanation(pro, { itemId: "someone-elses-item" });

    expect(mocks.getItemCode).toHaveBeenCalledWith("someone-elses-item", "user-1");
    expect(result).toEqual({
      status: 404,
      body: { success: false, error: "This item could not be found." },
    });
    expect(mocks.checkRateLimit).not.toHaveBeenCalled();
  });

  it.each([
    ["a prompt", { ...command, typeSlug: "prompt" }, "Only snippets and commands can be explained."],
    ["a link", { ...command, typeSlug: "link", content: null }, "Only snippets and commands can be explained."],
    ["empty code", { ...command, content: " \n " }, "There's no code to explain."],
  ])("refuses %s without using up the rate limit", async (_label, item, error) => {
    mocks.getItemCode.mockResolvedValue(item);

    expect(await generateExplanation(pro, request)).toEqual({
      status: 422,
      body: { success: false, error },
    });
    expect(mocks.checkRateLimit).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("answers 500 when the item cannot be loaded", async () => {
    mocks.getItemCode.mockRejectedValue(new Error("connection lost"));

    expect((await generateExplanation(pro, request))?.status).toBe(500);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("answers 429 with Retry-After once the shared AI limit is spent", async () => {
    mocks.checkRateLimit.mockResolvedValue({
      success: false,
      remaining: 0,
      reset: Date.now() + 90_000,
    });

    const result = await generateExplanation(pro, request);

    expect(mocks.checkRateLimit).toHaveBeenCalledWith("ai", "user-1");
    expect(result?.status).toBe(429);
    expect(result && "retryAfter" in result && result.retryAfter).toBeGreaterThan(0);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("streams the explanation as plain text", async () => {
    const result = await generateExplanation(pro, request);

    expect(result?.status).toBe(200);
    await expect(readStream(result)).resolves.toBe(
      "Finds the process on port 3000 and kills it.",
    );
  });

  it("streams, stores nothing and forwards the signal", async () => {
    const signal = new AbortController().signal;

    await generateExplanation(pro, request, signal);

    const [params, options] = mocks.create.mock.calls[0];

    expect(params).toMatchObject({ model: "gpt-5-nano", stream: true, store: false });
    expect(params).not.toHaveProperty("temperature");
    expect(params.safety_identifier).not.toContain("user-1");
    expect(params.input).toContain("<code>\nlsof -i :3000 -t | xargs kill -9\n</code>");
    expect(options).toEqual({ signal });
  });

  it("aborts the OpenAI request when the reader goes away", async () => {
    const controller = modelStreams("Finds");
    const result = await generateExplanation(pro, request);

    if (!result || !("stream" in result)) throw new Error("expected a stream");
    await result.stream.cancel();

    expect(controller.signal.aborted).toBe(true);
  });

  it("maps a refusal from OpenAI to a status before anything streams", async () => {
    mocks.create.mockRejectedValue(
      new RateLimitError(429, { code: "insufficient_quota" }, "quota", new Headers()),
    );

    expect(await generateExplanation(pro, request)).toEqual({
      status: 503,
      body: { success: false, error: "AI features are temporarily unavailable." },
    });
  });

  it("returns null when the caller cancelled", async () => {
    mocks.create.mockRejectedValue(new APIUserAbortError());

    expect(await generateExplanation(pro, request)).toBeNull();
  });
});
