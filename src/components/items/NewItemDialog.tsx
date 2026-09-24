"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { NewItemForm } from "@/components/items/NewItemForm";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { CreatableTypeSlug } from "@/lib/item-fields";
import type { ItemType } from "@/types";

interface NewItemDialogProps {
  /** The creatable item types, in sidebar order. */
  types: ItemType[];
  /** The type selected on opening. Defaults to the first of `types`. */
  defaultTypeSlug?: CreatableTypeSlug;
  /** The trigger's text, hidden on narrow screens where only the icon shows. */
  label?: string;
  variant?: "default" | "outline";
}

/**
 * A New Item button and the dialog it opens: in the top bar with no type
 * chosen, and on each type's page with that type selected.
 *
 * The form lives inside `DialogContent`, which unmounts on close, so every
 * opening starts from a blank form without any reset logic.
 */
export function NewItemDialog({
  types,
  defaultTypeSlug,
  label = "New Item",
  variant = "default",
}: NewItemDialogProps) {
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
        <Button variant={variant} aria-label={label}>
          <Plus />
          <span className="hidden sm:inline">{label}</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="border-b p-4">
          <DialogTitle>New item</DialogTitle>
          <DialogDescription>
            Save a snippet, prompt, command, note, file, image or link.
          </DialogDescription>
        </DialogHeader>

        <NewItemForm
          types={types}
          defaultTypeSlug={defaultTypeSlug}
          onPendingChange={setIsPending}
          onCancel={() => setOpen(false)}
          onCreated={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
