/**
 * User-facing messages shared by the server actions, API routes and forms.
 * Client-safe: plain strings, importable from client components.
 */

export const SESSION_EXPIRED = "Your session has expired. Sign in again to continue.";

export const SOMETHING_WENT_WRONG = "Something went wrong. Please try again.";

export const INVALID_INPUT = "Please check the details you entered";

/** A server action rejected rather than returned: the request itself failed. */
export const NETWORK_SAVE_FAILED = "Could not save. Check your connection and try again.";
