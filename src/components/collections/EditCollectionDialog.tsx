"use client";

import { useState, type ComponentProps } from "react";

import { updateCollection } from "@/actions/collections";
import { CollectionForm } from "@/components/collections/CollectionForm";
import { FormDialog } from "@/components/layout/FormDialog";
import type { Collection, EditableCollection } from "@/types";

interface EditCollectionDialogProps {
  collection: EditableCollection;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the saved collection — its slug is new after a rename. */
  onSaved: (collection: Collection) => void;
  onCloseAutoFocus?: ComponentProps<typeof FormDialog>["onCloseAutoFocus"];
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
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      pending={isPending}
      title="Edit collection"
      description="Change the name or description."
      onCloseAutoFocus={onCloseAutoFocus}
    >
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
    </FormDialog>
  );
}
