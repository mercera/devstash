"use client";

import { useState, type ComponentProps } from "react";

import { updateCollection } from "@/actions/collections";
import { CollectionForm } from "@/components/collections/CollectionForm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Collection, EditableCollection } from "@/types";

interface EditCollectionDialogProps {
  collection: EditableCollection;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the saved collection — its slug is new after a rename. */
  onSaved: (collection: Collection) => void;
  onCloseAutoFocus?: ComponentProps<typeof DialogContent>["onCloseAutoFocus"];
}

/**
 * Edits a collection's name and description. Controlled, with no trigger of
 * its own, so it can be opened from a button or a dropdown menu item alike.
 * The form unmounts on close, so each opening starts from the saved values.
 */
export function EditCollectionDialog({
  collection,
  open,
  onOpenChange,
  onSaved,
  onCloseAutoFocus,
}: EditCollectionDialogProps) {
  const [isPending, setIsPending] = useState(false);

  return (
    <Dialog
      open={open}
      // Escape and the overlay are ignored mid-save, so the dialog cannot
      // close on a request whose outcome the user has not seen yet.
      onOpenChange={(next) => {
        if (!isPending) onOpenChange(next);
      }}
    >
      <DialogContent
        className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 p-0 sm:max-w-lg"
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <DialogHeader className="border-b p-4">
          <DialogTitle>Edit collection</DialogTitle>
          <DialogDescription>Change the name or description.</DialogDescription>
        </DialogHeader>

        <CollectionForm
          idPrefix={`collection-edit-${collection.id}`}
          initialName={collection.name}
          initialDescription={collection.description}
          submitLabel="Save"
          pendingLabel="Saving..."
          successMessage="Collection updated"
          submit={(values) => updateCollection(collection.id, values)}
          onPendingChange={setIsPending}
          onCancel={() => onOpenChange(false)}
          onSaved={(saved) => {
            onOpenChange(false);
            onSaved(saved);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
