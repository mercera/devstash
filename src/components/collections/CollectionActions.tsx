"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Star, Trash2 } from "lucide-react";

import { setCollectionFavorite } from "@/actions/collections";
import { DeleteCollectionDialog } from "@/components/collections/DeleteCollectionDialog";
import { EditCollectionDialog } from "@/components/collections/EditCollectionDialog";
import { Button } from "@/components/ui/button";
import { useFavoriteToggle } from "@/hooks/use-favorite-toggle";
import { cn } from "@/lib/utils";
import type { Collection, EditableCollection } from "@/types";

/**
 * The collection page's Favorite, Edit and Delete buttons.
 *
 * A rename changes the slug, so a save moves the page to the new URL; a
 * delete leaves for `/collections`. Both use `replace`, since the old URL no
 * longer resolves and Back should not return to a 404. The follow-up
 * `refresh` re-renders the shared layout, whose sidebar lists collections.
 */
export function CollectionActions({ collection }: { collection: EditableCollection }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const favorite = useFavoriteToggle({
    isFavorite: collection.isFavorite,
    save: (isFavorite) => setCollectionFavorite(collection.id, isFavorite),
  });

  function handleSaved(saved: Collection) {
    if (saved.slug !== collection.slug) {
      router.replace(`/collections/${saved.slug}`);
    }
    router.refresh();
  }

  function handleDeleted() {
    router.replace("/collections");
    router.refresh();
  }

  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        aria-label="Favorite"
        aria-pressed={favorite.isFavorite}
        onClick={favorite.toggle}
        className={cn(favorite.isFavorite && "text-yellow-400 hover:text-yellow-400")}
      >
        <Star className={cn(favorite.isFavorite && "fill-yellow-400")} />
        <span className="hidden sm:inline">Favorite</span>
      </Button>
      <Button variant="ghost" size="sm" aria-label="Edit" onClick={() => setEditOpen(true)}>
        <Pencil />
        <span className="hidden sm:inline">Edit</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        aria-label="Delete"
        onClick={() => setDeleteOpen(true)}
        className="text-red-500 hover:bg-red-500/10 hover:text-red-500"
      >
        <Trash2 />
        <span className="hidden sm:inline">Delete</span>
      </Button>

      <EditCollectionDialog
        collection={collection}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={handleSaved}
      />
      <DeleteCollectionDialog
        collection={collection}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={handleDeleted}
      />
    </div>
  );
}
