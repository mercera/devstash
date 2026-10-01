import type { ComponentProps } from "react";
import { Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FavoriteToggleButtonProps
  extends Omit<ComponentProps<typeof Button>, "variant" | "onClick" | "aria-pressed"> {
  /** Whether it is a favorite, usually the optimistic value. */
  pressed: boolean;
  onToggle: () => void;
}

/**
 * A ghost button with a star that turns filled and yellow when pressed. The
 * caller owns the state, usually through `useOptimisticToggle`, and passes any
 * label as children.
 */
export function FavoriteToggleButton({
  pressed,
  onToggle,
  className,
  children,
  ...props
}: FavoriteToggleButtonProps) {
  return (
    <Button
      {...props}
      variant="ghost"
      aria-pressed={pressed}
      onClick={onToggle}
      className={cn(pressed && "text-yellow-400 hover:text-yellow-400", className)}
    >
      <Star className={cn(pressed && "fill-yellow-400")} />
      {children}
    </Button>
  );
}
