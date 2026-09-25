"use client";

import { useTransition, type ComponentProps } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { deleteCollection } from "@/actions/collections";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { EditableCollection } from "@/types";

const DELETE_FAILED = "Couldn't delete this collection. Please try again.";

interface DeleteCollectionDialogProps {
  collection: EditableCollection;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called once the collection is gone, to navigate or refresh. */
  onDeleted: () => void;
  onCloseAutoFocus?: ComponentProps<typeof AlertDialogContent>["onCloseAutoFocus"];
}

/**
 * The confirmation before a collection is deleted. Its items are kept — the
 * dialog says so, since "delete" alone reads as taking them too. A failure
 * keeps the dialog open with an error toast.
 */
export function DeleteCollectionDialog({
  collection,
  open,
  onOpenChange,
  onDeleted,
  onCloseAutoFocus,
}: DeleteCollectionDialogProps) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      try {
        const result = await deleteCollection(collection.id);

        if (!result.success) {
          toast.error(result.error);
          return;
        }

        toast.success("Collection deleted");
        onOpenChange(false);
        onDeleted();
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
        if (!isPending) onOpenChange(next);
      }}
    >
      <AlertDialogContent onCloseAutoFocus={onCloseAutoFocus}>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this collection?</AlertDialogTitle>
          <AlertDialogDescription>
            This deletes{" "}
            <span className="wrap-break-word text-foreground">{collection.name}</span>.
            Its items are kept and stay in any other collections they belong to.
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
