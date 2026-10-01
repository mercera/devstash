import type { ComponentProps, ReactNode } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * While true, Escape and the overlay are ignored, so the dialog cannot close
   * on a request whose outcome the user has not seen yet.
   */
  pending: boolean;
  title: string;
  description: ReactNode;
  /** The button that opens it. Omit for a dialog opened from elsewhere. */
  trigger?: ReactNode;
  onCloseAutoFocus?: ComponentProps<typeof DialogContent>["onCloseAutoFocus"];
  /** The form, with its own footer. It unmounts on close. */
  children: ReactNode;
}

/**
 * The shell of the New Item and collection dialogs: a header over a form that
 * scrolls, capped to the viewport. The form lives inside `DialogContent`,
 * which unmounts on close, so every opening starts from a fresh form.
 */
export function FormDialog({
  open,
  onOpenChange,
  pending,
  title,
  description,
  trigger,
  onCloseAutoFocus,
  children,
}: FormDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) onOpenChange(next);
      }}
    >
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}

      <DialogContent
        className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 p-0 sm:max-w-lg"
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <DialogHeader className="border-b p-4">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {children}
      </DialogContent>
    </Dialog>
  );
}
