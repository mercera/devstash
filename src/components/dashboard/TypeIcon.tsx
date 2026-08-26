import { createElement } from "react";

import { getIcon } from "@/lib/icons";
import type { ItemType } from "@/types";

interface TypeIconProps {
  type: ItemType;
  className?: string;
  /** Accessible name — omit for icons that only decorate labelled text. */
  label?: string;
}

/**
 * Renders the lucide icon named on an item type.
 *
 * The icon is resolved by name at render time, so it is built with
 * `createElement` rather than assigned to a capitalized variable — the latter
 * reads as a component defined during render.
 */
export function TypeIcon({ type, className, label }: TypeIconProps) {
  return createElement(getIcon(type.icon), {
    className,
    "aria-label": label,
    "aria-hidden": label ? undefined : true,
  });
}
