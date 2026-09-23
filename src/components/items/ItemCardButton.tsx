"use client";

import { useOpenItem } from "@/components/items/ItemDrawerProvider";

/**
 * An invisible button stretched over its card that opens the item drawer.
 *
 * Overlaying the card rather than wrapping it keeps `ItemCard` a server
 * component, and keeps the markup valid — a `<button>` may not contain the
 * card's heading and block content. The parent must be `relative`.
 */
export function ItemCardButton({ itemId, title }: { itemId: string; title: string }) {
  const openItem = useOpenItem();

  return (
    <button
      type="button"
      aria-label={`Open ${title}`}
      onClick={() => openItem(itemId)}
      className="absolute inset-0 cursor-pointer rounded-[inherit] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
    />
  );
}
