import { describe, expect, it, vi } from "vitest";
import type { ResponseStreamEvent } from "openai/resources/responses/responses";

import {
  INCOMPLETE_NOTE,
  buildExplainInput,
  toExplanationStream,
  truncationNote,
} from "@/lib/ai/explain";
import { EXPLAIN_CONTENT_MAX_CHARS } from "@/lib/validations/ai";

/**
 * The explain prompt and the event-to-text stream, with no OpenAI involved:
 * the events are a plain async generator.
 */

const command = {
  title: "Kill port",
  content: "lsof -i :3000 -t | xargs kill -9",
  language: "bash",
  typeSlug: "command",
};

function delta(text: string) {
  return { type: "response.output_text.delta", delta: text } as ResponseStreamEvent;
}

function event(type: string) {
  return { type } as ResponseStreamEvent;
}

async function* events(...items: ResponseStreamEvent[]) {
  for (const item of items) yield item;
}

async function readAll(stream: ReadableStream<Uint8Array>): Promise<string> {
  return new Response(stream).text();
}

describe("buildExplainInput", () => {
  it("labels what is set and wraps the code", () => {
    const { input, truncatedAtLine } = buildExplainInput(command);

    expect(input).toContain("Item type: command");
    expect(input).toContain("Title: Kill port");
    expect(input).toContain("Language: bash");
    expect(input).toContain("<code>\nlsof -i :3000 -t | xargs kill -9\n</code>");
    expect(truncatedAtLine).toBeNull();
  });

  it("leaves out an unset language", () => {
    const { input } = buildExplainInput({ ...command, language: null });

    expect(input).not.toContain("Language:");
  });

  it("cuts long code at a line end and says how many lines were sent", () => {
    const line = "x".repeat(99);
    const code = Array.from({ length: 400 }, () => line).join("\n");

    const { input, truncatedAtLine } = buildExplainInput({ ...command, content: code });
    const sent = input.slice(input.indexOf("<code>\n") + 7, input.indexOf("\n</code>"));

    expect(sent.length).toBeLessThanOrEqual(EXPLAIN_CONTENT_MAX_CHARS);
    expect(sent.split("\n").every((kept) => kept === line)).toBe(true);
    expect(truncatedAtLine).toBe(sent.split("\n").length);
    expect(input).toContain(`only its first ${truncatedAtLine} lines follow`);
  });
});

describe("toExplanationStream", () => {
  it("streams the text deltas in order, then the suffix", async () => {
    const stream = toExplanationStream(
      events(event("response.created"), delta("Kills "), delta("the process."), event("response.completed")),
      { suffix: truncationNote(40), onCancel: vi.fn() },
    );

    await expect(readAll(stream)).resolves.toBe(
      "Kills the process.\n\n_Only the first 40 lines were explained._",
    );
  });

  it("notes an answer that was cut short", async () => {
    const stream = toExplanationStream(
      events(delta("Kills the"), event("response.incomplete")),
      { onCancel: vi.fn() },
    );

    await expect(readAll(stream)).resolves.toBe(`Kills the${INCOMPLETE_NOTE}`);
  });

  it.each([
    ["a failed response", [delta("Kills"), event("response.failed")]],
    ["an error event", [event("error")]],
    ["no text at all", [event("response.completed")]],
    ["an incomplete response with no text", [event("response.incomplete")]],
  ])("errors the stream for %s", async (_label, items) => {
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const stream = toExplanationStream(events(...items), { onCancel: vi.fn() });

    await expect(readAll(stream)).rejects.toThrow(/Unusable AI response/);
  });

  it("stops the generation when the reader cancels", async () => {
    const onCancel = vi.fn();
    const stream = toExplanationStream(events(delta("Kills")), { onCancel });

    await stream.cancel();

    expect(onCancel).toHaveBeenCalledOnce();
  });
});
