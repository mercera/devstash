"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createItem } from "@/actions/items";
import { FileUpload } from "@/components/items/FileUpload";
import { ItemContentFields } from "@/components/items/ItemContentFields";
import { ItemFormField } from "@/components/items/ItemFormField";
import { TypeIcon } from "@/components/items/TypeIcon";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useItemForm } from "@/hooks/use-item-form";
import { useUnsavedUpload } from "@/hooks/use-unsaved-upload";
import { getAccentTextClass } from "@/lib/icons";
import { EMPTY_ITEM_FORM_VALUES, toItemFieldsPayload } from "@/lib/item-form";
import {
  getItemTypeFields,
  isCreatableTypeSlug,
  singularTypeName,
  type CreatableTypeSlug,
} from "@/lib/item-fields";
import { discardUpload } from "@/lib/upload-client";
import type { UploadedFile } from "@/lib/uploads";
import { cn } from "@/lib/utils";
import type { ItemType } from "@/types";

const CREATE_FAILED = "Something went wrong. Please try again.";

interface NewItemFormProps {
  types: ItemType[];
  defaultTypeSlug?: CreatableTypeSlug;
  onPendingChange: (pending: boolean) => void;
  onCancel: () => void;
  onCreated: () => void;
}

/** The New Item dialog's body: type picker, the type's fields and the footer. */
export function NewItemForm({
  types,
  defaultTypeSlug,
  onPendingChange,
  onCancel,
  onCreated,
}: NewItemFormProps) {
  const router = useRouter();
  const [typeSlug, setTypeSlug] = useState<CreatableTypeSlug>(
    () =>
      defaultTypeSlug ??
      types.map((type) => type.slug).find(isCreatableTypeSlug) ??
      "snippet",
  );
  const form = useItemForm("item-new", EMPTY_ITEM_FORM_VALUES);
  const { values, issues, setIssues, idFor, bind } = form;
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const unsavedUpload = useUnsavedUpload();
  const fields = getItemTypeFields(typeSlug);

  function handleFileChange(next: UploadedFile | null) {
    unsavedUpload.track(next?.fileUrl ?? null);
    setFile(next);
  }

  function selectType(slug: CreatableTypeSlug) {
    if (slug === typeSlug) return;
    // A file uploaded for one type is not carried to another.
    if (file) discardUpload(file.fileUrl);
    handleFileChange(null);
    setTypeSlug(slug);
  }

  const canSubmit =
    values.title.trim() !== "" &&
    (!fields.url || values.url.trim() !== "") &&
    (!fields.upload || file !== null) &&
    !uploading;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onPendingChange(true);

    startTransition(async () => {
      try {
        const result = await createItem({
          typeSlug,
          ...toItemFieldsPayload(values, fields),
          ...(fields.upload && file ? { file } : {}),
        });

        if (!result.success) {
          setIssues(result.issues ?? {});
          toast.error(result.error);
          return;
        }

        toast.success("Item created");
        // The upload now belongs to the item, so it must survive the close.
        unsavedUpload.keep();
        onCreated();
        // The lists and sidebar counts are server-rendered, so they only pick
        // up the new item on a refresh.
        router.refresh();
      } catch {
        toast.error(CREATE_FAILED);
      } finally {
        onPendingChange(false);
      }
    });
  }

  return (
    // `noValidate`: the server's messages are the ones shown, not the browser's
    // own bubble for `type="url"`, which only disagrees with the schema.
    <form noValidate onSubmit={handleSubmit} className="flex min-h-0 flex-col">
      <div className="flex flex-col gap-5 overflow-y-auto p-4">
        <TypePicker
          types={types}
          selected={typeSlug}
          onSelect={selectType}
          disabled={isPending || uploading}
          issues={issues.typeSlug}
        />

        <ItemFormField label="Title" htmlFor={idFor("title")} issues={issues.title}>
          <Input {...bind("title")} required autoFocus />
        </ItemFormField>

        <ItemFormField
          label="Description"
          htmlFor={idFor("description")}
          issues={issues.description}
        >
          <Textarea {...bind("description")} className="min-h-16" />
        </ItemFormField>

        {fields.upload && (
          <ItemFormField
            label={fields.upload === "image" ? "Image" : "File"}
            htmlFor="item-new-file"
            issues={issues.file}
          >
            <FileUpload
              key={fields.upload}
              id="item-new-file"
              kind={fields.upload}
              value={file}
              onChange={handleFileChange}
              onUploadingChange={setUploading}
              disabled={isPending}
              invalid={Boolean(issues.file)}
            />
          </ItemFormField>
        )}

        <ItemContentFields form={form} fields={fields} urlRequired />
      </div>

      <DialogFooter className="mx-0 mb-0">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending || !canSubmit}>
          {isPending && <Loader2 className="animate-spin" />}
          {isPending ? "Creating..." : "Create"}
        </Button>
      </DialogFooter>
    </form>
  );
}

interface TypePickerProps {
  types: ItemType[];
  selected: CreatableTypeSlug;
  onSelect: (slug: CreatableTypeSlug) => void;
  disabled: boolean;
  issues?: string[];
}

/** One toggle button per creatable type, each icon in the type's accent color. */
function TypePicker({ types, selected, onSelect, disabled, issues }: TypePickerProps) {
  return (
    <div className="flex flex-col gap-2">
      <span id="item-new-type" className="text-sm font-medium text-muted-foreground">
        Type
      </span>
      <div
        role="group"
        aria-labelledby="item-new-type"
        className="grid grid-cols-4 gap-2 sm:grid-cols-7"
      >
        {types.map((type) => {
          const isSelected = type.slug === selected;

          return (
            <button
              key={type.id}
              type="button"
              aria-pressed={isSelected}
              disabled={disabled}
              onClick={() => {
                if (isCreatableTypeSlug(type.slug)) onSelect(type.slug);
              }}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-lg border px-2 py-2.5 text-xs transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50",
                isSelected
                  ? "border-foreground/30 bg-accent text-foreground"
                  : "border-border text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              )}
            >
              <TypeIcon type={type} className={cn("size-4", getAccentTextClass(type.color))} />
              {singularTypeName(type.slug)}
            </button>
          );
        })}
      </div>
      {issues && <p className="text-xs text-destructive">{issues.join(". ")}</p>}
    </div>
  );
}
