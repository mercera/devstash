import { z } from "zod";

import { INVALID_INPUT } from "@/lib/messages";

/**
 * Whether a server action argument is usable as an id. A server action is a
 * public endpoint, so its arguments can be anything, whatever the type says.
 */
export function isId(value: unknown): value is string {
  return typeof value === "string" && value !== "";
}

/**
 * The failure for a payload that did not pass its schema: the shared message
 * plus per-field messages keyed by payload field. Spread into the action's own
 * result shape.
 */
export function invalidInput<T>(error: z.ZodError<T>) {
  return {
    error: INVALID_INPUT,
    issues: z.flattenError(error).fieldErrors,
  };
}
