"use client";

import { useState, useTransition, type ComponentProps, type ReactNode } from "react";
import { toast } from "sonner";

import { PendingButton } from "@/components/layout/PendingButton";
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
import type { ActionResult } from "@/types/actions";

interface ConfirmDeleteDialogProps {
  title: string;
  description: ReactNode;
  /** Runs the delete. */
  onConfirm: () => Promise<ActionResult<unknown>>;
  /** Toasted once the delete has succeeded. */
  successMessage: string;
  /** Toasted when the request itself fails, rather than returning an error. */
  failureMessage: string;
  /** Runs after a successful delete, once the dialog has closed. */
  onDeleted: () => void;
  /** The button that opens it. Omit and pass `open` to control it instead. */
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCloseAutoFocus?: ComponentProps<typeof AlertDialogContent>["onCloseAutoFocus"];
}

/**
 * A delete confirmation. A failure keeps the dialog open with an error toast;
 * success closes it, toasts, and hands off to `onDeleted`.
 *
 * Escape and Cancel are ignored mid-delete, so the dialog cannot close on a
 * request whose outcome the user has not seen yet. Works with its own
 * `trigger`, or controlled through `open` and `onOpenChange`.
 */
export function ConfirmDeleteDialog({
  title,
  description,
  onConfirm,
  successMessage,
  failureMessage,
  onDeleted,
  trigger,
  open: controlledOpen,
  onOpenChange,
  onCloseAutoFocus,
}: ConfirmDeleteDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const open = controlledOpen ?? uncontrolledOpen;

  function setOpen(next: boolean) {
    setUncontrolledOpen(next);
    onOpenChange?.(next);
  }

  function handleDelete() {
    startTransition(async () => {
      try {
        const result = await onConfirm();

        if (!result.success) {
          toast.error(result.error);
          return;
        }

        toast.success(successMessage);
        setOpen(false);
        onDeleted();
      } catch {
        toast.error(failureMessage);
      }
    });
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!isPending) setOpen(next);
      }}
    >
      {trigger && <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>}

      <AlertDialogContent onCloseAutoFocus={onCloseAutoFocus}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>

          {/* A plain button, not `AlertDialogAction`: that closes the dialog on
              click, before the delete has succeeded or failed. */}
          <PendingButton
            variant="destructive"
            onClick={handleDelete}
            pending={isPending}
            pendingLabel="Deleting..."
          >
            Delete
          </PendingButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
