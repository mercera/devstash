"use client";

import { Copy, Download, Pencil, Pin, Star } from "lucide-react";

import { setItemFavorite } from "@/actions/items";
import { DeleteItemDialog } from "@/components/items/DeleteItemDialog";
import { Button } from "@/components/ui/button";
import { useFavoriteToggle } from "@/hooks/use-favorite-toggle";
import { copyToClipboard } from "@/lib/clipboard";
import { getCopyText } from "@/lib/item-copy";
import { cn } from "@/lib/utils";
import type { ItemDetail } from "@/types";

interface ItemActionsProps {
  item: ItemDetail;
  onEdit: () => void;
  onSaved: (item: ItemDetail) => void;
  onDeleted: (id: string) => void;
}

/**
 * The drawer's action bar. Favorite, Copy (Download for a file or image item),
 * Edit and Delete work; Pin is display-only until its mutation lands, but
 * already shows the item's current state.
 *
 * A favorite save is handed back through `onSaved`, since the drawer keeps its
 * own copy of the item, which a page refresh does not reach.
 */
export function ItemActions({ item, onEdit, onSaved, onDeleted }: ItemActionsProps) {
  const copyText = getCopyText(item);
  const favorite = useFavoriteToggle({
    isFavorite: item.isFavorite,
    save: (isFavorite) => setItemFavorite(item.id, isFavorite),
    onSaved: ({ isFavorite, updatedAt }) => onSaved({ ...item, isFavorite, updatedAt }),
  });

  function handleCopy() {
    if (copyText !== null) void copyToClipboard(copyText);
  }

  return (
    <div className="flex items-center gap-1 border-b px-4 pb-4">
      <Button
        variant="ghost"
        size="sm"
        aria-pressed={favorite.isFavorite}
        onClick={favorite.toggle}
        className={cn(favorite.isFavorite && "text-yellow-400 hover:text-yellow-400")}
      >
        <Star className={cn(favorite.isFavorite && "fill-yellow-400")} />
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
