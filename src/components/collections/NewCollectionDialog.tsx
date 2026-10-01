"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FolderPlus } from "lucide-react";

import { createCollection } from "@/actions/collections";
import { CollectionForm } from "@/components/collections/CollectionForm";
import { FormDialog } from "@/components/layout/FormDialog";
import { Button } from "@/components/ui/button";

/** The top bar's New Collection button and the dialog it opens. */
export function NewCollectionDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      pending={isPending}
      title="New collection"
      description="Group related items under one name."
      trigger={
        <Button variant="outline" aria-label="New Collection">
          <FolderPlus />
          {/* From md the sidebar takes 256px of the top bar's row, so the
              label waits for lg. */}
          <span className="hidden lg:inline">New Collection</span>
        </Button>
      }
    >
      <CollectionForm
        idPrefix="collection-new"
        submitLabel="Create"
        pendingLabel="Creating..."
        successMessage="Collection created"
        submit={createCollection}
        onPendingChange={setIsPending}
        onCancel={() => setOpen(false)}
        onSaved={() => {
          setOpen(false);
          // The sidebar, the dashboard grid and the stat cards are
          // server-rendered, so they only pick up the collection on a refresh.
          router.refresh();
        }}
      />
    </FormDialog>
  );
}
