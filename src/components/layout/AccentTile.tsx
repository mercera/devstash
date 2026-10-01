import type { ReactNode } from "react";

import { getAccentTileClass } from "@/lib/icons";
import { cn } from "@/lib/utils";
import type { AccentColor } from "@/types";

/** Tile size and the size of the icon directly inside it. */
const SIZES = {
  md: "size-9 rounded-lg [&>svg]:size-4.5",
  lg: "size-10 rounded-lg [&>svg]:size-5",
  xl: "size-14 rounded-xl [&>svg]:size-7",
} as const;

interface AccentTileProps {
  /** Tinted with this accent; neutral when omitted. */
  color?: AccentColor;
  size?: keyof typeof SIZES;
  /** Extra classes, which win over the tint (e.g. a brand colour). */
  className?: string;
  /** The icon, plus anything layered over it such as a badge. */
  children: ReactNode;
}

/**
 * The square icon tile beside item, stat and page titles. Only an icon that is
 * a direct child is resized, so a badge nested inside keeps its own size.
 */
export function AccentTile({ color, size = "md", className, children }: AccentTileProps) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center",
        SIZES[size],
        color ? getAccentTileClass(color) : "bg-muted text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}
