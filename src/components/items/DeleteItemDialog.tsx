"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

import { deleteItem } from "@/actions/items";
import { ConfirmDeleteDialog } from "@/components/layout/ConfirmDeleteDialog";
import { Button } from "@/components/ui/button";
import type { ItemDetail } from "@/types";

interface DeleteItemDialogProps {
  item: ItemDetail;
  /** Called once the item is gone, so the drawer can close. */
  onDeleted: (id: string) => void;
}

/**
 * The drawer's Delete button and its confirmation. Success hands off to
 * `onDeleted` and refreshes the server-rendered cards underneath.
 */
export function DeleteItemDialog({ item, onDeleted }: DeleteItemDialogProps) {
  const router = useRouter();

  return (
    <ConfirmDeleteDialog
      title="Delete this item?"
      description={
        <>
          This permanently deletes{" "}
          <span className="wrap-break-word text-foreground">{item.title}</span>.
          This cannot be undone.
        </>
      }
      onConfirm={() => deleteItem(item.id)}
      successMessage="Item deleted"
      failureMessage="Couldn't delete this item. Please try again."
      onDeleted={() => {
        onDeleted(item.id);
        router.refresh();
      }}
      trigger={
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Delete"
          className="hit-area-y text-red-500 hover:bg-red-500/10 hover:text-red-500"
        >
          <Trash2 />
        </Button>
      }
    />
  );
}
