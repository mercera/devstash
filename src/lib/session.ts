import { cache } from "react";

import { auth } from "@/auth";

export interface SessionUser {
  id: string;
  isPro: boolean;
}

/**
 * The signed-in user's id and plan, or null without a session. Cached per
 * request: every `auth()` call runs the `jwt` callback's database lookup, so
 * everything in one render should read the session through here.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const user = (await auth())?.user;

  return user?.id ? { id: user.id, isPro: user.isPro } : null;
});

/**
 * The signed-in user's id, or null without a session. Derived from
 * `getSessionUser`, so a layout and its page resolve the session once between
 * them.
 */
export const getSessionUserId = cache(
  async (): Promise<string | null> => (await getSessionUser())?.id ?? null,
);
