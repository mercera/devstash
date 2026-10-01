"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { NewItemForm } from "@/components/items/NewItemForm";
import { FormDialog } from "@/components/layout/FormDialog";
import { Button } from "@/components/ui/button";
import type { CreatableTypeSlug } from "@/lib/item-fields";
import type { ItemType } from "@/types";

interface NewItemDialogProps {
  /** The creatable item types, in sidebar order. */
  types: ItemType[];
  /** The type selected on opening. Defaults to the first of `types`. */
  defaultTypeSlug?: CreatableTypeSlug;
  /** Free users see the Pro-only types locked in the picker. */
  isPro: boolean;
  /** The trigger's text, hidden on narrow screens where only the icon shows. */
  label?: string;
  variant?: "default" | "outline";
  /** The breakpoint the label appears from. The top bar uses `lg`: from `md`
   *  the sidebar takes 256px of its row. */
  labelFrom?: "sm" | "lg";
}

const LABEL_CLASS = {
  sm: "hidden sm:inline",
  lg: "hidden lg:inline",
} as const;

/**
 * A New Item button and the dialog it opens: in the top bar with no type
 * chosen, and on each type's page with that type selected.
 */
export function NewItemDialog({
  types,
  defaultTypeSlug,
  isPro,
  label = "New Item",
  variant = "default",
  labelFrom = "sm",
}: NewItemDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      pending={isPending}
      title="New item"
      description="Save a snippet, prompt, command, note, file, image or link."
      trigger={
        <Button variant={variant} aria-label={label}>
          <Plus />
          <span className={LABEL_CLASS[labelFrom]}>{label}</span>
        </Button>
      }
    >
      <NewItemForm
        types={types}
        defaultTypeSlug={defaultTypeSlug}
        isPro={isPro}
        onPendingChange={setIsPending}
        onCancel={() => setOpen(false)}
        onCreated={() => setOpen(false)}
      />
    </FormDialog>
  );
}
