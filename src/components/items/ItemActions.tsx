"use client";

import { Copy, Pencil, Pin, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { getCopyText } from "@/lib/item-copy";
import { cn } from "@/lib/utils";
import type { ItemDetail } from "@/types";

interface ItemActionsProps {
  item: ItemDetail;
  onEdit: () => void;
}

/**
 * The drawer's action bar. Copy and Edit work; Favorite, Pin and Delete are
 * display-only until their mutations land, but Favorite and Pin already show
 * the item's current state.
 */
export function ItemActions({ item, onEdit }: ItemActionsProps) {
  const copyText = getCopyText(item);

  async function handleCopy() {
    if (copyText === null) return;

    try {
      await navigator.clipboard.writeText(copyText);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Couldn't copy to clipboard");
    }
  }

  return (
    <div className="flex items-center gap-1 border-b px-4 pb-4">
      <Button
        variant="ghost"
        size="sm"
        aria-pressed={item.isFavorite}
        className={cn(item.isFavorite && "text-yellow-400 hover:text-yellow-400")}
      >
        <Star className={cn(item.isFavorite && "fill-yellow-400")} />
        Favorite
      </Button>
      <Button variant="ghost" size="sm" aria-pressed={item.isPinned}>
        <Pin className={cn(item.isPinned && "fill-current")} />
        Pin
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCopy}
        disabled={copyText === null}
      >
        <Copy />
        Copy
      </Button>

      <Button variant="ghost" size="sm" className="ml-auto" onClick={onEdit}>
        <Pencil />
        Edit
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Delete"
        className="text-red-500 hover:bg-red-500/10 hover:text-red-500"
      >
        <Trash2 />
      </Button>
    </div>
  );
}
