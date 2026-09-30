import {
  APIConnectionTimeoutError,
  APIError,
  APIUserAbortError,
  AuthenticationError,
  PermissionDeniedError,
  RateLimitError,
} from "openai";

/** The model answered, but with nothing usable: cut short, empty or not JSON. */
export class AiResponseError extends Error {
  constructor(reason: string) {
    super(`Unusable AI response: ${reason}`);
    this.name = "AiResponseError";
  }
}

export const AI_UNAVAILABLE = "AI features are temporarily unavailable.";
export const AI_FAILED = "The AI couldn't come up with suggestions. Try again.";
const AI_TIMEOUT = "The AI took too long to respond. Try again.";
const SOMETHING_WENT_WRONG = "Something went wrong. Please try again.";

export interface AiErrorResult {
  status: number;
  message: string;
}

/**
 * Maps a failed AI call to the status and message to send. Returns null when
 * the caller cancelled, since nobody is left to answer.
 *
 * OpenAI's own error text is logged, never returned: it can name the model,
 * the organization or quota details.
 */
export function mapAiError(error: unknown): AiErrorResult | null {
  if (error instanceof APIUserAbortError) return null;

  if (error instanceof AiResponseError) {
    console.warn(error.message);
    return { status: 502, message: AI_FAILED };
  }

  if (!(error instanceof APIError)) {
    console.error("AI request failed:", error);
    return { status: 500, message: SOMETHING_WENT_WRONG };
  }

  const detail = { status: error.status, code: error.code, requestId: error.requestID };

  // Checked before the generic connection error it extends.
  if (error instanceof APIConnectionTimeoutError) {
    console.warn("AI request timed out:", detail);
    return { status: 504, message: AI_TIMEOUT };
  }

  // Our key, quota or budget, not the user's doing: an operator problem.
  if (
    error instanceof RateLimitError ||
    error instanceof AuthenticationError ||
    error instanceof PermissionDeniedError
  ) {
    console.error("AI provider refused the request:", detail);
    return { status: 503, message: AI_UNAVAILABLE };
  }

  console.error("AI provider error:", detail);
  return { status: 502, message: AI_FAILED };
}
