import { Pin, Star } from "lucide-react";

import { FAVORITE_STAR_CLASS } from "@/lib/icons";
import { cn } from "@/lib/utils";

/** The small filled star after a favorite's name. Decorative. */
export function FavoriteStar({ className }: { className?: string }) {
  return (
    <Star aria-hidden className={cn("size-3.5 shrink-0", FAVORITE_STAR_CLASS, className)} />
  );
}

interface StatusMarksProps {
  isPinned?: boolean;
  isFavorite?: boolean;
}

/**
 * The pin and favorite marks after an item's title. A fragment, so the marks
 * sit in the title row's own flex layout.
 */
export function StatusMarks({ isPinned = false, isFavorite = false }: StatusMarksProps) {
  return (
    <>
      {isPinned && <Pin aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />}
      {isFavorite && <FavoriteStar />}
    </>
  );
}
