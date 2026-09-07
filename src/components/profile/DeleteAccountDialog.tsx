"use client";

import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";

import { deleteAccount, type DeleteAccountState } from "@/actions/profile";
import { FormError } from "@/components/auth/FieldError";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DELETE_CONFIRMATION_WORD } from "@/lib/validations/profile";

const INITIAL_STATE: DeleteAccountState = {};

interface DeleteAccountDialogProps {
  /** Shown in the dialog so it is obvious which account is about to go. */
  email: string;
}

export function DeleteAccountDialog({ email }: DeleteAccountDialogProps) {
  const [state, formAction, isPending] = useActionState(deleteAccount, INITIAL_STATE);
  const [confirmation, setConfirmation] = useState("");

  return (
    <AlertDialog
      onOpenChange={(open) => {
        // Reopening starts from a blank field rather than a still-armed
        // confirmation left over from last time.
        if (!open) {
          setConfirmation("");
        }
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="destructive">Delete account</Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete your account?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes <span className="text-foreground">{email}</span>{" "}
            along with every item, collection and tag it owns. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* The form wraps the field and the footer so the confirmation is
            actually posted — the action re-checks it rather than trusting the
            disabled button below. */}
        <form action={formAction} className="space-y-4">
          {/* Shown here rather than behind the dialog: a failure leaves the
              dialog open, so an error rendered on the page underneath could not
              be read. */}
          <FormError message={state.error} />

          <div className="space-y-1.5">
            <Label htmlFor="confirmation">
              Type <span className="font-mono">{DELETE_CONFIRMATION_WORD}</span> to
              confirm
            </Label>
            <Input
              id="confirmation"
              name="confirmation"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoComplete="off"
              className="h-9"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel type="button" disabled={isPending}>
              Cancel
            </AlertDialogCancel>

            {/* Deliberately a plain Button, not `AlertDialogAction`: that closes
                the dialog on click, which would unmount this form and cancel its
                own submit before the action ever ran. The dialog stays open for
                the round trip, and the redirect takes it down. */}
            <Button
              type="submit"
              variant="destructive"
              disabled={confirmation !== DELETE_CONFIRMATION_WORD || isPending}
            >
              {isPending && <Loader2 className="animate-spin" />}
              {isPending ? "Deleting..." : "Delete account"}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
