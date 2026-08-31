/**
 * Maps the string values stored on our data model to renderable UI values.
 *
 * `ItemType.icon` holds a lucide icon name and `color` holds a semantic accent
 * name, so the data layer stays free of React and Tailwind specifics.
 */

import {
  Code,
  File,
  Folder,
  Image,
  Link,
  Sparkles,
  StickyNote,
  Terminal,
  type LucideIcon,
} from "lucide-react";

import type { AccentColor } from "@/types";

const ICONS: Record<string, LucideIcon> = {
  Code,
  File,
  Folder,
  Image,
  Link,
  Sparkles,
  StickyNote,
  Terminal,
};

/** Resolves a lucide icon name, falling back to a neutral icon. */
export function getIcon(name: string): LucideIcon {
  return ICONS[name] ?? File;
}

const ACCENT_TEXT: Record<AccentColor, string> = {
  blue: "text-blue-400",
  purple: "text-purple-400",
  orange: "text-orange-400",
  yellow: "text-yellow-400",
  green: "text-green-400",
  pink: "text-pink-400",
  gray: "text-neutral-400",
};

/** Tailwind text color class for a semantic accent color. */
export function getAccentTextClass(color: AccentColor): string {
  return ACCENT_TEXT[color];
}

const ACCENT_BORDER: Record<AccentColor, string> = {
  blue: "border-l-blue-500",
  purple: "border-l-purple-500",
  orange: "border-l-orange-500",
  yellow: "border-l-yellow-500",
  green: "border-l-green-500",
  pink: "border-l-pink-500",
  gray: "border-l-neutral-500",
};

/** Left edge accent used on collection cards and item rows. */
export function getAccentBorderClass(color: AccentColor): string {
  return ACCENT_BORDER[color];
}

const ACCENT_DOT: Record<AccentColor, string> = {
  blue: "bg-blue-500",
  purple: "bg-purple-500",
  orange: "bg-orange-500",
  yellow: "bg-yellow-500",
  green: "bg-green-500",
  pink: "bg-pink-500",
  gray: "bg-neutral-500",
};

/** Solid dot marking a collection with its most-used item type's color. */
export function getAccentDotClass(color: AccentColor): string {
  return ACCENT_DOT[color];
}

const ACCENT_TILE: Record<AccentColor, string> = {
  blue: "bg-blue-500/10 text-blue-400",
  purple: "bg-purple-500/10 text-purple-400",
  orange: "bg-orange-500/10 text-orange-400",
  yellow: "bg-yellow-500/10 text-yellow-400",
  green: "bg-green-500/10 text-green-400",
  pink: "bg-pink-500/10 text-pink-400",
  gray: "bg-neutral-500/10 text-neutral-400",
};

/** Tinted square that an icon sits in — stat cards and item rows. */
export function getAccentTileClass(color: AccentColor): string {
  return ACCENT_TILE[color];
}
