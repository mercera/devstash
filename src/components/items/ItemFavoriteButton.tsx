"use client";

import { Star } from "lucide-react";

import { setItemFavorite } from "@/actions/items";
import { Button } from "@/components/ui/button";
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
 * `relative z-10` lifts it above the card's stretched `ItemCardButton`, which
 * it is a sibling of, so a click toggles the favorite instead of opening the
 * drawer, and the card itself stays a server component.
 */
export function ItemFavoriteButton({ itemId, title, isFavorite }: ItemFavoriteButtonProps) {
  const favorite = useOptimisticToggle({
    value: isFavorite,
    save: (next) => setItemFavorite(itemId, next),
  });

  return (
    <Button
      variant="ghost"
      size="icon-xs"
      aria-label={`Favorite ${title}`}
      aria-pressed={favorite.value}
      onClick={favorite.toggle}
      className={cn(
        "relative z-10 -my-1 shrink-0",
        favorite.value
          ? "text-yellow-400 hover:text-yellow-400"
          : "text-muted-foreground opacity-0 group-hover/card:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100",
      )}
    >
      <Star className={cn(favorite.value && "fill-yellow-400")} />
    </Button>
  );
}
