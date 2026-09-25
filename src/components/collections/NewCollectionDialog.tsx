"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FolderPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createCollection, type CreateCollectionResult } from "@/actions/collections";
import { ItemFormField } from "@/components/items/ItemFormField";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const CREATE_FAILED = "Something went wrong. Please try again.";

type Issues = Extract<CreateCollectionResult, { success: false }>["issues"];

/**
 * The top bar's New Collection button and the dialog it opens.
 *
 * The form lives inside `DialogContent`, which unmounts on close, so every
 * opening starts from a blank form without any reset logic.
 */
export function NewCollectionDialog() {
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

        <NewCollectionForm
          onPendingChange={setIsPending}
          onCancel={() => setOpen(false)}
          onCreated={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

interface NewCollectionFormProps {
  onPendingChange: (pending: boolean) => void;
  onCancel: () => void;
  onCreated: () => void;
}

/** The dialog's body: name, description and the footer. */
function NewCollectionForm({ onPendingChange, onCancel, onCreated }: NewCollectionFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [issues, setIssues] = useState<Issues>({});
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onPendingChange(true);

    startTransition(async () => {
      try {
        const result = await createCollection({ name, description });

        if (!result.success) {
          setIssues(result.issues ?? {});
          toast.error(result.error);
          return;
        }

        toast.success("Collection created");
        onCreated();
        // The sidebar, the dashboard grid and the stat cards are
        // server-rendered, so they only pick up the collection on a refresh.
        router.refresh();
      } catch {
        toast.error(CREATE_FAILED);
      } finally {
        onPendingChange(false);
      }
    });
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex min-h-0 flex-col">
      <div className="flex flex-col gap-5 overflow-y-auto p-4">
        <ItemFormField label="Name" htmlFor="collection-new-name" issues={issues?.name}>
          <Input
            id="collection-new-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={Boolean(issues?.name)}
            required
            autoFocus
          />
        </ItemFormField>

        <ItemFormField
          label="Description"
          htmlFor="collection-new-description"
          issues={issues?.description}
        >
          <Textarea
            id="collection-new-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            aria-invalid={Boolean(issues?.description)}
            className="min-h-20"
          />
        </ItemFormField>
      </div>

      <DialogFooter className="mx-0 mb-0">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending || name.trim() === ""}>
          {isPending && <Loader2 className="animate-spin" />}
          {isPending ? "Creating..." : "Create"}
        </Button>
      </DialogFooter>
    </form>
  );
}
