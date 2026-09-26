"use client";

import { startTransition, useOptimistic } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type FavoriteResult<T> = { success: true; data: T } | { success: false; error: string };

interface UseFavoriteToggleOptions<T> {
  /** The stored state, as last rendered by the server or the drawer. */
  isFavorite: boolean;
  /** The server action, called with the state to set. */
  save: (isFavorite: boolean) => Promise<FavoriteResult<T>>;
  /** Runs after a successful save, before the refresh. */
  onSaved?: (data: T) => void;
}

const NETWORK_ERROR = "Could not save. Check your connection and try again.";

/**
 * A favorite star that flips the moment it is clicked.
 *
 * The flip is `useOptimistic` state, so it lasts exactly as long as the
 * transition: a failed save lets it fall back to `isFavorite` on its own, with
 * a toast. On success `onSaved` and `router.refresh()` run in a nested
 * transition, which React entangles with this one, so the optimistic value is
 * held until the refreshed props arrive instead of flickering back first. The
 * refresh is what brings the sidebar, the dashboard stats and `/favorites` up
 * to date.
 */
export function useFavoriteToggle<T>({
  isFavorite,
  save,
  onSaved,
}: UseFavoriteToggleOptions<T>) {
  const router = useRouter();
  const [optimistic, setOptimistic] = useOptimistic(isFavorite);

  function toggle() {
    const next = !optimistic;

    startTransition(async () => {
      setOptimistic(next);

      let result: FavoriteResult<T>;

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

      startTransition(() => {
        onSaved?.(data);
        router.refresh();
      });
    });
  }

  return { isFavorite: optimistic, toggle };
}
