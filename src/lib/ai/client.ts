/**
 * The OpenAI client. Server only.
 *
 * Configuration is read per call, never at module load: a module-scope client
 * would be built while `next build` collects page data, freezing the build
 * machine's environment into the output. The client is cached on its key so a
 * changed key drops it rather than reusing it. Same pattern as `getStripe()`.
 */

import OpenAI from "openai";

/**
 * Every AI feature uses this model through the **Responses API**. It returns
 * empty content from Chat Completions, so never call that API with it.
 */
export const AI_MODEL = "gpt-5-nano";

let cached: { key: string; client: OpenAI } | null = null;

/** Whether an API key is set. Without one the AI buttons are not shown. */
export function isAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

/** Throws when unconfigured; callers check `isAiConfigured()` first. */
export function getOpenAI(): OpenAI {
  const key = process.env.OPENAI_API_KEY;

  if (!key) {
    throw new Error("OpenAI is not configured. Set OPENAI_API_KEY.");
  }

  if (cached?.key !== key) {
    cached = {
      key,
      // 20s × (1 + 1 retry) caps a stuck call at ~40s, not the SDK's 10 minutes.
      client: new OpenAI({ apiKey: key, timeout: 20_000, maxRetries: 1 }),
    };
  }

  return cached.client;
}
