"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteItem } from "@/actions/items";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { ItemDetail } from "@/types";

const DELETE_FAILED = "Couldn't delete this item. Please try again.";

interface DeleteItemDialogProps {
  item: ItemDetail;
  /** Called once the item is gone, so the drawer can close. */
  onDeleted: (id: string) => void;
}

/**
 * The drawer's Delete button and its confirmation. A failure keeps the dialog
 * open with an error toast; success closes it, hands off to `onDeleted` and
 * refreshes the server-rendered cards underneath.
 */
export function DeleteItemDialog({ item, onDeleted }: DeleteItemDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      try {
        const result = await deleteItem(item.id);

        if (!result.success) {
          toast.error(result.error);
          return;
        }

        toast.success("Item deleted");
        setOpen(false);
        onDeleted(result.data.id);
        router.refresh();
      } catch {
        toast.error(DELETE_FAILED);
      }
    });
  }

  return (
    <AlertDialog
      open={open}
      // Escape and Cancel are ignored mid-delete, so the dialog cannot close
      // on a request whose outcome the user has not seen yet.
      onOpenChange={(next) => {
        if (!isPending) setOpen(next);
      }}
    >
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Delete"
          className="text-red-500 hover:bg-red-500/10 hover:text-red-500"
        >
          <Trash2 />
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this item?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes{" "}
            <span className="wrap-break-word text-foreground">{item.title}</span>.
            This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>

          {/* A plain Button, not `AlertDialogAction`: that closes the dialog on
              click, before the delete has succeeded or failed. */}
          <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
            {isPending && <Loader2 className="animate-spin" />}
            {isPending ? "Deleting..." : "Delete"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
