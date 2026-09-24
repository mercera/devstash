"use client";

import { Copy, Download, Pencil, Pin, Star } from "lucide-react";

import { DeleteItemDialog } from "@/components/items/DeleteItemDialog";
import { Button } from "@/components/ui/button";
import { copyToClipboard } from "@/lib/clipboard";
import { getCopyText } from "@/lib/item-copy";
import { cn } from "@/lib/utils";
import type { ItemDetail } from "@/types";

interface ItemActionsProps {
  item: ItemDetail;
  onEdit: () => void;
  onDeleted: (id: string) => void;
}

/**
 * The drawer's action bar. Copy (Download for a file or image item), Edit and
 * Delete work; Favorite and Pin are display-only until their mutations land,
 * but already show the item's current state.
 */
export function ItemActions({ item, onEdit, onDeleted }: ItemActionsProps) {
  const copyText = getCopyText(item);

  function handleCopy() {
    if (copyText !== null) void copyToClipboard(copyText);
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
      {item.fileUrl ? (
        // Through the app's download route: a cross-origin link to R2 would
        // ignore `download` and open the file instead of saving it.
        <Button variant="ghost" size="sm" asChild>
          <a href={`/api/items/${item.id}/download`} download>
            <Download />
            Download
          </a>
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          disabled={copyText === null}
        >
          <Copy />
          Copy
        </Button>
      )}

      <Button variant="ghost" size="sm" className="ml-auto" onClick={onEdit}>
        <Pencil />
        Edit
      </Button>
      <DeleteItemDialog item={item} onDeleted={onDeleted} />
    </div>
  );
}
