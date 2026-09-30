"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useActionErrorToast } from "@/hooks/use-action-error-toast";

type AiResponse<TData> =
  | { success: true; data: TData }
  | { success: false; error: string; upgradeRequired?: true };

const REQUEST_FAILED = "Could not reach DevStash. Check your connection and try again.";

/**
 * POSTs JSON to an AI route. Failures are toasted (a Pro refusal gets the
 * Upgrade action) and resolve to null, as does a cancelled request.
 *
 * A new request cancels the one before it, and unmounting cancels whatever is
 * in flight, so closing the dialog or drawer stops the generation at OpenAI
 * instead of only hiding the result.
 */
export function useAiRequest<TData>(path: string) {
  const showError = useActionErrorToast();
  const controllerRef = useRef<AbortController | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => () => controllerRef.current?.abort(), []);

  async function run(body: unknown): Promise<TData | null> {
    controllerRef.current?.abort();

    const controller = new AbortController();
    controllerRef.current = controller;
    setPending(true);

    try {
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const result = (await response.json()) as AiResponse<TData>;

      if (controller.signal.aborted) return null;

      if (!result.success) {
        showError(result);
        return null;
      }

      return result.data;
    } catch {
      if (!controller.signal.aborted) toast.error(REQUEST_FAILED);
      return null;
    } finally {
      // A newer request owns the pending state now.
      if (controllerRef.current === controller) {
        controllerRef.current = null;
        setPending(false);
      }
    }
  }

  return { run, pending };
}
