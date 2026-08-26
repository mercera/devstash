/**
 * Maps the string values stored on our data model to renderable UI values.
 *
 * `ItemType.icon` holds a lucide icon name and `color` holds a semantic accent
 * name, so the data layer stays free of React and Tailwind specifics.
 */

import {
  Code2,
  File,
  FileText,
  Folder,
  Image,
  Link,
  Sparkles,
  Terminal,
  type LucideIcon,
} from "lucide-react";

import type { AccentColor } from "@/types";

const ICONS: Record<string, LucideIcon> = {
  Code2,
  File,
  FileText,
  Folder,
  Image,
  Link,
  Sparkles,
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
