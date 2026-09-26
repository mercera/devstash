"use client";

import { startTransition, useOptimistic } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type ToggleResult<T> = { success: true; data: T } | { success: false; error: string };

interface UseOptimisticToggleOptions<T> {
  /** The stored state, as last rendered by the server or the drawer. */
  value: boolean;
  /** The server action, called with the state to set. */
  save: (value: boolean) => Promise<ToggleResult<T>>;
  /** Runs after a successful save, before the refresh. */
  onSaved?: (data: T) => void;
  /** A toast to show after a successful save, given the state that was set. */
  successMessage?: (value: boolean) => string;
}

const NETWORK_ERROR = "Could not save. Check your connection and try again.";

/**
 * A boolean flag (favorite, pin) that flips the moment it is clicked.
 *
 * The flip is `useOptimistic` state, so it lasts exactly as long as the
 * transition: a failed save lets it fall back to `value` on its own, with a
 * toast. On success `onSaved` and `router.refresh()` run in a nested
 * transition, which React entangles with this one, so the optimistic value is
 * held until the refreshed props arrive instead of flickering back first. The
 * refresh is what brings the sidebar, the dashboard and the listings up to
 * date.
 */
export function useOptimisticToggle<T>({
  value,
  save,
  onSaved,
  successMessage,
}: UseOptimisticToggleOptions<T>) {
  const router = useRouter();
  const [optimistic, setOptimistic] = useOptimistic(value);

  function toggle() {
    const next = !optimistic;

    startTransition(async () => {
      setOptimistic(next);

      let result: ToggleResult<T>;

      try {
        result = await save(next);
      } catch {
        // A server action rejects rather than returning when the request
        // itself fails.
        result = { success: false, error: NETWORK_ERROR };
      }

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      const { data } = result;

      if (successMessage) toast.success(successMessage(next));

      startTransition(() => {
        onSaved?.(data);
        router.refresh();
      });
    });
  }

  return { value: optimistic, toggle };
}
