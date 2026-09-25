import { cache } from "react";

import { auth } from "@/auth";

/**
 * The signed-in user's id, or null without a session. Cached per request, so
 * a layout and its page resolve the session once between them.
 */
export const getSessionUserId = cache(
  async (): Promise<string | null> => (await auth())?.user?.id ?? null,
);
