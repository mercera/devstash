"use client";

import type { ComponentProps } from "react";

import { deleteCollection } from "@/actions/collections";
import { ConfirmDeleteDialog } from "@/components/layout/ConfirmDeleteDialog";
import type { EditableCollection } from "@/types";

interface DeleteCollectionDialogProps {
  collection: EditableCollection;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called once the collection is gone, to navigate or refresh. */
  onDeleted: () => void;
  onCloseAutoFocus?: ComponentProps<typeof ConfirmDeleteDialog>["onCloseAutoFocus"];
}

/**
 * The confirmation before a collection is deleted. Its items are kept — the
 * dialog says so, since "delete" alone reads as taking them too. Controlled,
 * with no trigger of its own, like `EditCollectionDialog`.
 */
export function DeleteCollectionDialog({
  collection,
  open,
  onOpenChange,
  onDeleted,
  onCloseAutoFocus,
}: DeleteCollectionDialogProps) {
  return (
    <ConfirmDeleteDialog
      title="Delete this collection?"
      description={
        <>
          This deletes{" "}
          <span className="wrap-break-word text-foreground">{collection.name}</span>.
          Its items are kept and stay in any other collections they belong to.
          This cannot be undone.
        </>
      }
      onConfirm={() => deleteCollection(collection.id)}
      successMessage="Collection deleted"
      failureMessage="Couldn't delete this collection. Please try again."
      onDeleted={onDeleted}
      open={open}
      onOpenChange={onOpenChange}
      onCloseAutoFocus={onCloseAutoFocus}
    />
  );
}
