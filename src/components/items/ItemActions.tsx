"use client";

import { Copy, Download, Pencil, Pin, Star } from "lucide-react";

import { setItemFavorite, setItemPinned } from "@/actions/items";
import { DeleteItemDialog } from "@/components/items/DeleteItemDialog";
import { Button } from "@/components/ui/button";
import { useOptimisticToggle } from "@/hooks/use-optimistic-toggle";
import { copyToClipboard } from "@/lib/clipboard";
import { getCopyText } from "@/lib/item-copy";
import { cn } from "@/lib/utils";
import type { ItemDetail, ItemDetailPatch } from "@/types";

interface ItemActionsProps {
  item: ItemDetail;
  onEdit: () => void;
  onSaved: (patch: ItemDetailPatch) => void;
  onDeleted: (id: string) => void;
}

/**
 * The drawer's action bar: Favorite, Pin, Copy (Download for a file or image
 * item), Edit and Delete.
 *
 * A favorite or pin save is handed back through `onSaved`, since the drawer
 * keeps its own copy of the item, which a page refresh does not reach.
 */
export function ItemActions({ item, onEdit, onSaved, onDeleted }: ItemActionsProps) {
  const copyText = getCopyText(item);
  const favorite = useOptimisticToggle({
    value: item.isFavorite,
    save: (isFavorite) => setItemFavorite(item.id, isFavorite),
    onSaved: ({ isFavorite, updatedAt }) => onSaved({ id: item.id, isFavorite, updatedAt }),
  });
  const pin = useOptimisticToggle({
    value: item.isPinned,
    save: (isPinned) => setItemPinned(item.id, isPinned),
    onSaved: ({ isPinned, updatedAt }) => onSaved({ id: item.id, isPinned, updatedAt }),
    successMessage: (isPinned) => (isPinned ? "Item pinned" : "Item unpinned"),
  });

  function handleCopy() {
    if (copyText !== null) void copyToClipboard(copyText);
  }

  return (
    <div className="flex items-center gap-1 border-b px-4 pb-4">
      <Button
        variant="ghost"
        size="sm"
        aria-pressed={favorite.value}
        onClick={favorite.toggle}
        className={cn(favorite.value && "text-yellow-400 hover:text-yellow-400")}
      >
        <Star className={cn(favorite.value && "fill-yellow-400")} />
        Favorite
      </Button>
      <Button variant="ghost" size="sm" aria-pressed={pin.value} onClick={pin.toggle}>
        <Pin className={cn(pin.value && "fill-current")} />
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
