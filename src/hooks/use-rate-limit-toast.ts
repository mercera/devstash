"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

/** The part of an action's result this hook cares about. */
interface RateLimitedState {
  error?: string;
  rateLimited?: boolean;
}

/**
 * Raises a toast when an action was refused by the rate limiter.
 *
 * The four auth forms all render `error` inline already, and they keep doing
 * so — a toast is transient, and the forms still work without JavaScript, where
 * no toast can fire at all. This adds the attention-grabbing half on top.
 *
 * `useActionState` hands back a new state object per submission, so the object
 * identity is what marks one refusal as distinct from the next. Keeping the
 * last-toasted object in a ref means a re-render caused by anything else — or
 * an effect run twice by Strict Mode — does not stack up duplicates.
 */
export function useRateLimitToast(state: RateLimitedState): void {
  const lastToasted = useRef<RateLimitedState | null>(null);

  useEffect(() => {
    if (!state.rateLimited || !state.error || lastToasted.current === state) {
      return;
    }

    lastToasted.current = state;
    toast.error(state.error);
  }, [state]);
}
