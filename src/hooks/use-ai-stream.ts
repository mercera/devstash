"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useActionErrorToast } from "@/hooks/use-action-error-toast";

/**
 * `pending` until the first words arrive, `streaming` while they keep coming,
 * `done` once there is text to show (complete or not).
 */
export type AiStreamStatus = "idle" | "pending" | "streaming" | "done";

interface AiRefusal {
  error: string;
  upgradeRequired?: true;
}

const REQUEST_FAILED = "Could not reach DevStash. Check your connection and try again.";
const STREAM_INTERRUPTED = "The AI stopped before it finished. Try again.";

function isRefusal(value: unknown): value is AiRefusal {
  return typeof value === "object" && value !== null && typeof (value as AiRefusal).error === "string";
}

/**
 * POSTs JSON to a streaming AI route and collects the text as it arrives.
 * A refusal is JSON with an error status, toasted like `useAiRequest` (a Pro
 * refusal gets the Upgrade action).
 *
 * A new run replaces the previous text only once its first words arrive, so a
 * failed regeneration leaves the last answer in place. A new run or unmounting
 * cancels whatever is in flight, which stops the generation at OpenAI.
 */
export function useAiStream(path: string) {
  const showError = useActionErrorToast();
  const controllerRef = useRef<AbortController | null>(null);
  const textRef = useRef("");
  const [text, setText] = useState("");
  const [status, setStatus] = useState<AiStreamStatus>("idle");

  useEffect(() => () => controllerRef.current?.abort(), []);

  function show(next: string, nextStatus: AiStreamStatus) {
    textRef.current = next;
    setText(next);
    setStatus(nextStatus);
  }

  async function start(body: unknown): Promise<void> {
    controllerRef.current?.abort();

    const controller = new AbortController();
    controllerRef.current = controller;
    setStatus("pending");

    let received = "";
    let reading = false;

    try {
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const refusal: unknown = await response.json().catch(() => null);

        if (controller.signal.aborted) return;

        showError(isRefusal(refusal) ? refusal : { error: REQUEST_FAILED });
        setStatus(textRef.current ? "done" : "idle");
        return;
      }

      reading = true;
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      for (;;) {
        const { done, value } = await reader.read();

        if (done) break;

        received += decoder.decode(value, { stream: true });
        show(received, "streaming");
      }

      show(received + decoder.decode(), "done");
    } catch {
      // Cancelled by a newer run or by unmounting, which own the state now.
      if (controller.signal.aborted) return;

      toast.error(reading ? STREAM_INTERRUPTED : REQUEST_FAILED);
      setStatus(textRef.current ? "done" : "idle");
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  }

  return { text, status, start };
}
