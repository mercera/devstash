import { beforeEach, describe, expect, it, vi } from "vitest";
import { APIUserAbortError } from "openai";

/**
 * The flow behind `POST /api/ai/summary`, with OpenAI (`@/lib/ai/client`) and
 * the rate limiter mocked. The shared checks are covered in depth by
 * `auto-tags.test.ts`; this file covers what differs for summaries.
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

import { generateAutoSummary } from "@/lib/ai/auto-summary";

const pro = { id: "user-1", isPro: true };
const free = { id: "user-2", isPro: false };

const request = {
  typeSlug: "command",
  title: "List containers",
  content: "docker ps -a",
  language: "bash",
};

function modelReturns(outputText: string, status = "completed") {
  mocks.create.mockResolvedValue({ status, output_text: outputText, incomplete_details: null });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isAiConfigured.mockReturnValue(true);
  mocks.checkRateLimit.mockResolvedValue({ success: true, remaining: 19, reset: Date.now() });
  modelReturns("Lists every Docker container, including stopped ones.");
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("generateAutoSummary", () => {
  it("refuses without a session", async () => {
    expect((await generateAutoSummary(null, request))?.status).toBe(401);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("refuses a Free user before the rate limit or OpenAI", async () => {
    const result = await generateAutoSummary(free, request);

    expect(result?.status).toBe(403);
    expect(result?.body).toMatchObject({ success: false, upgradeRequired: true });
    expect(mocks.checkRateLimit).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("returns the summary and uses the shared AI limit", async () => {
    const result = await generateAutoSummary(pro, request);

    expect(mocks.checkRateLimit).toHaveBeenCalledWith("ai", "user-1");
    expect(result).toEqual({
      status: 200,
      body: {
        success: true,
        data: { summary: "Lists every Docker container, including stopped ones." },
      },
    });
  });

  it.each(["file", "image", "link"])("accepts a %s item", async (typeSlug) => {
    const result = await generateAutoSummary(pro, {
      typeSlug,
      title: "Compose file",
      fileName: "docker-compose.yml",
    });

    expect(result?.status).toBe(200);
  });

  it("accepts a file with only its file name", async () => {
    const result = await generateAutoSummary(pro, {
      typeSlug: "file",
      title: "",
      fileName: "notes.pdf",
    });

    expect(result?.status).toBe(200);
  });

  it("asks for a title or content when there is nothing to summarise", async () => {
    const result = await generateAutoSummary(pro, { typeSlug: "note", title: " ", content: " " });

    expect(result).toEqual({
      status: 422,
      body: { success: false, error: "Add a title or some content first." },
    });
    expect(mocks.checkRateLimit).not.toHaveBeenCalled();
  });

  it.each([
    ["an unknown type", { ...request, typeSlug: "video" }],
    ["a missing body", null],
  ])("rejects %s without using up the rate limit", async (_label, body) => {
    const result = await generateAutoSummary(pro, body);

    expect(result).toEqual({
      status: 422,
      body: { success: false, error: "A description can't be generated for this item." },
    });
    expect(mocks.checkRateLimit).not.toHaveBeenCalled();
  });

  it("asks for plain text, stores nothing and forwards the signal", async () => {
    const signal = new AbortController().signal;

    await generateAutoSummary(pro, request, signal);

    const [params, options] = mocks.create.mock.calls[0];

    expect(params).toMatchObject({ model: "gpt-5-nano", store: false });
    expect(params.text).not.toHaveProperty("format");
    expect(params).not.toHaveProperty("temperature");
    expect(params.safety_identifier).not.toContain("user-1");
    expect(params.input).toContain("<content>\ndocker ps -a\n</content>");
    expect(options).toEqual({ signal });
  });

  it("cleans the model's answer", async () => {
    modelReturns('Description: "Lists **all** containers."');

    const result = await generateAutoSummary(pro, request);

    expect(result?.body).toEqual({ success: true, data: { summary: "Lists all containers." } });
  });

  it.each([
    ["an incomplete response", () => modelReturns("", "incomplete")],
    ["empty output", () => modelReturns("  \n ")],
  ])("answers 502 for %s", async (_label, arrange) => {
    arrange();

    expect((await generateAutoSummary(pro, request))?.status).toBe(502);
  });

  it("returns null when the caller cancelled", async () => {
    mocks.create.mockRejectedValue(new APIUserAbortError());

    expect(await generateAutoSummary(pro, request)).toBeNull();
  });
});
