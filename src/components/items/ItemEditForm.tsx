"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { updateItem } from "@/actions/items";
import { CollectionPicker } from "@/components/items/CollectionPicker";
import { ItemContentFields } from "@/components/items/ItemContentFields";
import { ItemFormField } from "@/components/items/ItemFormField";
import { DatesSection } from "@/components/items/ItemSections";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useItemForm } from "@/hooks/use-item-form";
import { itemToFormValues, toItemFieldsPayload } from "@/lib/item-form";
import { getItemTypeFields } from "@/lib/item-fields";
import type { ItemDetail } from "@/types";

interface ItemEditFormProps {
  item: ItemDetail;
  onCancel: () => void;
  onSaved: (item: ItemDetail) => void;
}

const SAVE_FAILED = "Something went wrong. Please try again.";

/**
 * Edit mode for the drawer. Replaces the action bar with Save and Cancel and
 * the body with inputs; the item type and dates stay read-only.
 *
 * The title check here only arms the Save button — the server action
 * validates every field, and its per-field messages render under the inputs.
 */
export function ItemEditForm({ item, onCancel, onSaved }: ItemEditFormProps) {
  const router = useRouter();
  const fields = getItemTypeFields(item.type.slug);
  const form = useItemForm("item-edit", () => itemToFormValues(item));
  const { values, issues, setIssues, idFor, bind } = form;
  const [collectionIds, setCollectionIds] = useState(() =>
    item.collections.map((collection) => collection.id),
  );
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      try {
        const result = await updateItem(item.id, {
          ...toItemFieldsPayload(values, fields),
          collectionIds,
        });

        if (!result.success) {
          setIssues(result.issues ?? {});
          toast.error(result.error);
          return;
        }

        toast.success("Item saved");
        onSaved(result.data);
        // The cards underneath are server-rendered, so they only pick up the
        // new title, tags and ordering on a refresh.
        router.refresh();
      } catch {
        toast.error(SAVE_FAILED);
      }
    });
  }

  return (
    // `noValidate`: the server's messages are the ones shown, not the browser's
    // own bubble for `type="url"`, which only disagrees with the schema.
    <form
      noValidate
      onSubmit={handleSubmit}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex items-center justify-end gap-2 border-b px-4 pb-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={isPending || values.title.trim() === ""}
        >
          {isPending ? "Saving..." : "Save"}
        </Button>
      </div>

      <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
        <ItemFormField label="Title" htmlFor={idFor("title")} issues={issues.title}>
          <Input {...bind("title")} required />
        </ItemFormField>

        <ItemFormField
          label="Description"
          htmlFor={idFor("description")}
          issues={issues.description}
        >
          <Textarea {...bind("description")} className="min-h-20" />
        </ItemFormField>

        <ItemContentFields form={form} fields={fields} />

        <CollectionPicker
          id="item-edit"
          selected={collectionIds}
          onChange={setCollectionIds}
          disabled={isPending}
          issues={issues.collectionIds}
        />

        <hr />
        <DatesSection item={item} />
      </div>
    </form>
  );
}
