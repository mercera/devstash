"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FolderPlus } from "lucide-react";

import { createCollection } from "@/actions/collections";
import { CollectionForm } from "@/components/collections/CollectionForm";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/**
 * The top bar's New Collection button and the dialog it opens.
 *
 * The form lives inside `DialogContent`, which unmounts on close, so every
 * opening starts from a blank form without any reset logic.
 */
export function NewCollectionDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  return (
    <Dialog
      open={open}
      // Escape and the overlay are ignored mid-save, so the dialog cannot
      // close on a request whose outcome the user has not seen yet.
      onOpenChange={(next) => {
        if (!isPending) setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" aria-label="New Collection">
          <FolderPlus />
          <span className="hidden sm:inline">New Collection</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="border-b p-4">
          <DialogTitle>New collection</DialogTitle>
          <DialogDescription>Group related items under one name.</DialogDescription>
        </DialogHeader>

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
      </DialogContent>
    </Dialog>
  );
}
