import type { Item } from "@/types";

/**
 * The text the drawer's Copy button puts on the clipboard, or null when the
 * item has nothing worth copying.
 *
 * Text items copy their body; link items keep their address in `url` with no
 * body, so they fall back to that. Blank values count as absent, so Copy is
 * disabled rather than copying an empty string.
 */
export function getCopyText(item: Pick<Item, "content" | "url">): string | null {
  for (const value of [item.content, item.url]) {
    if (value !== null && value.trim() !== "") return value;
  }

  return null;
}
