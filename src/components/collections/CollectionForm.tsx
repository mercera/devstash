"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import type { CreateCollectionResult, UpdateCollectionResult } from "@/actions/collections";
import { ItemFormField } from "@/components/items/ItemFormField";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Collection } from "@/types";

const SAVE_FAILED = "Something went wrong. Please try again.";

type CollectionFormResult = CreateCollectionResult | UpdateCollectionResult;

type Issues = Extract<CollectionFormResult, { success: false }>["issues"];

interface CollectionFormProps {
  /** Prefixes the input ids, so two forms on one page cannot collide. */
  idPrefix: string;
  initialName?: string;
  initialDescription?: string | null;
  submitLabel: string;
  pendingLabel: string;
  successMessage: string;
  submit: (values: { name: string; description: string }) => Promise<CollectionFormResult>;
  onPendingChange: (pending: boolean) => void;
  onCancel: () => void;
  onSaved: (collection: Collection) => void;
}

/**
 * The New and Edit Collection dialogs' body: name, description and the footer.
 * Field issues from the server render under their inputs, and every outcome is
 * toasted; what happens after a save is the caller's.
 */
export function CollectionForm({
  idPrefix,
  initialName = "",
  initialDescription,
  submitLabel,
  pendingLabel,
  successMessage,
  submit,
  onPendingChange,
  onCancel,
  onSaved,
}: CollectionFormProps) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [issues, setIssues] = useState<Issues>({});
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onPendingChange(true);

    startTransition(async () => {
      try {
        const result = await submit({ name, description });

        if (!result.success) {
          setIssues(result.issues ?? {});
          toast.error(result.error);
          return;
        }

        toast.success(successMessage);
        onSaved(result.data);
      } catch {
        toast.error(SAVE_FAILED);
      } finally {
        onPendingChange(false);
      }
    });
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex min-h-0 flex-col">
      <div className="flex flex-col gap-5 overflow-y-auto p-4">
        <ItemFormField label="Name" htmlFor={`${idPrefix}-name`} issues={issues?.name}>
          <Input
            id={`${idPrefix}-name`}
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={Boolean(issues?.name)}
            required
            autoFocus
          />
        </ItemFormField>

        <ItemFormField
          label="Description"
          htmlFor={`${idPrefix}-description`}
          issues={issues?.description}
        >
          <Textarea
            id={`${idPrefix}-description`}
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
          {isPending ? pendingLabel : submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}
