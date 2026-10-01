"use client";

import { setItemFavorite } from "@/actions/items";
import { FavoriteToggleButton } from "@/components/layout/FavoriteToggleButton";
import { useOptimisticToggle } from "@/hooks/use-optimistic-toggle";
import { cn } from "@/lib/utils";

interface ItemFavoriteButtonProps {
  itemId: string;
  title: string;
  isFavorite: boolean;
}

/**
 * An item card's favorite star. A favorite's star is always shown; an
 * unfavorited card shows an outline star only on hover or keyboard focus, and
 * always on touch screens, where there is no hover.
 *
 * `z-10` (with `hit-area`'s relative positioning) lifts it above the card's
 * stretched `ItemCardButton`, which it is a sibling of, so a click toggles the
 * favorite instead of opening the drawer, and the card itself stays a server
 * component.
 */
export function ItemFavoriteButton({ itemId, title, isFavorite }: ItemFavoriteButtonProps) {
  const favorite = useOptimisticToggle({
    value: isFavorite,
    save: (next) => setItemFavorite(itemId, next),
  });

  return (
    <FavoriteToggleButton
      size="icon-xs"
      aria-label={`Favorite ${title}`}
      pressed={favorite.value}
      onToggle={favorite.toggle}
      className={cn(
        "hit-area z-10 -my-1 shrink-0",
        !favorite.value &&
          "text-muted-foreground opacity-0 group-hover/card:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100",
      )}
    />
  );
}
