"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Star, Trash2 } from "lucide-react";

import { setCollectionFavorite } from "@/actions/collections";
import { DeleteCollectionDialog } from "@/components/collections/DeleteCollectionDialog";
import { EditCollectionDialog } from "@/components/collections/EditCollectionDialog";
import { Button } from "@/components/ui/button";
import { useOptimisticToggle } from "@/hooks/use-optimistic-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { EditableCollection } from "@/types";

/**
 * A collection card's three-dots menu: Edit, Favorite / Unfavorite and Delete.
 *
 * The dialogs are siblings of the menu, not inside its content: Radix unmounts
 * the menu when an item is chosen, which would take a nested dialog with it.
 * Nothing opened them from a trigger either, so focus is handed back to the
 * three-dots button by hand when one closes.
 *
 * `relative z-10` lifts the button above the card's stretched link, so a click
 * on it opens the menu instead of the collection.
 */
export function CollectionCardMenu({ collection }: { collection: EditableCollection }) {
  const router = useRouter();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const favorite = useOptimisticToggle({
    value: collection.isFavorite,
    save: (isFavorite) => setCollectionFavorite(collection.id, isFavorite),
  });

  function returnFocus(event: Event) {
    event.preventDefault();
    triggerRef.current?.focus();
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            ref={triggerRef}
            variant="ghost"
            size="icon-sm"
            aria-label={`Actions for ${collection.name}`}
            className="relative z-10 -mt-1 -mr-2 text-muted-foreground"
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={favorite.toggle}>
            <Star
              className={cn(favorite.value && "fill-yellow-400 text-yellow-400")}
            />
            {favorite.value ? "Unfavorite" : "Favorite"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditCollectionDialog
        collection={collection}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={() => router.refresh()}
        onCloseAutoFocus={returnFocus}
      />
      <DeleteCollectionDialog
        collection={collection}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={() => router.refresh()}
        onCloseAutoFocus={returnFocus}
      />
    </>
  );
}
