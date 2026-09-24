"use client";

import {
  useState,
  useTransition,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { updateItem, type UpdateItemField } from "@/actions/items";
import { CodeEditor } from "@/components/items/CodeEditor";
import { ItemFormField } from "@/components/items/ItemFormField";
import { CollectionSection, DatesSection } from "@/components/items/ItemSections";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getItemTypeFields, type ItemTypeFields } from "@/lib/item-fields";
import { parseTagInput, type UpdateItemInput } from "@/lib/validations/items";
import type { ItemDetail } from "@/types";

interface ItemEditFormProps {
  item: ItemDetail;
  onCancel: () => void;
  onSaved: (item: ItemDetail) => void;
}

/** The raw input values. Tags stay one comma-separated string until submit. */
interface FormValues {
  title: string;
  description: string;
  content: string;
  language: string;
  url: string;
  tags: string;
}

type Issues = Partial<Record<UpdateItemField, string[]>>;

const SAVE_FAILED = "Something went wrong. Please try again.";

/**
 * Edit mode for the drawer. Replaces the action bar with Save and Cancel and
 * the body with inputs; the item type, collection and dates stay read-only.
 *
 * The title check here only arms the Save button — the server action
 * validates every field, and its per-field messages render under the inputs.
 */
export function ItemEditForm({ item, onCancel, onSaved }: ItemEditFormProps) {
  const router = useRouter();
  const fields = getItemTypeFields(item.type.slug);
  const [values, setValues] = useState(() => initialValues(item));
  const [issues, setIssues] = useState<Issues>({});
  const [isPending, startTransition] = useTransition();

  function bind(name: keyof FormValues) {
    return {
      id: `item-edit-${name}`,
      name,
      value: values[name],
      onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { value } = event.target;
        setValues((current) => ({ ...current, [name]: value }));
      },
      "aria-invalid": Boolean(issues[name]),
    };
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      try {
        const result = await updateItem(item.id, toPayload(values, fields));

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
        <ItemFormField label="Title" htmlFor="item-edit-title" issues={issues.title}>
          <Input {...bind("title")} required />
        </ItemFormField>

        <ItemFormField
          label="Description"
          htmlFor="item-edit-description"
          issues={issues.description}
        >
          <Textarea {...bind("description")} className="min-h-20" />
        </ItemFormField>

        {fields.content && (
          <ItemFormField label="Content" htmlFor="item-edit-content" issues={issues.content}>
            {fields.code ? (
              <CodeEditor
                value={values.content}
                language={values.language}
                ariaLabel="Content"
                invalid={Boolean(issues.content)}
                onChange={(content) =>
                  setValues((current) => ({ ...current, content }))
                }
              />
            ) : (
              <Textarea
                {...bind("content")}
                spellCheck={false}
                className="max-h-96 min-h-40 font-mono text-[13px] leading-relaxed md:text-[13px]"
              />
            )}
          </ItemFormField>
        )}

        {fields.language && (
          <ItemFormField
            label="Language"
            htmlFor="item-edit-language"
            issues={issues.language}
          >
            <Input {...bind("language")} placeholder="e.g. typescript" />
          </ItemFormField>
        )}

        {fields.url && (
          <ItemFormField label="URL" htmlFor="item-edit-url" issues={issues.url}>
            <Input {...bind("url")} type="url" placeholder="https://" />
          </ItemFormField>
        )}

        <ItemFormField
          label="Tags"
          htmlFor="item-edit-tags"
          issues={issues.tags}
          hint="Separate tags with commas."
        >
          <Input {...bind("tags")} placeholder="react, hooks" />
        </ItemFormField>

        <hr />
        <CollectionSection item={item} />
        <DatesSection item={item} />
      </div>
    </form>
  );
}

function initialValues(item: ItemDetail): FormValues {
  return {
    title: item.title,
    description: item.description ?? "",
    content: item.content ?? "",
    language: item.language ?? "",
    url: item.url ?? "",
    tags: item.tags.join(", "),
  };
}

/**
 * Only the fields shown for this type are sent. An absent field is left alone
 * by the server, so a hidden field can never clear a column.
 */
function toPayload(values: FormValues, fields: ItemTypeFields): UpdateItemInput {
  return {
    title: values.title,
    description: values.description,
    tags: parseTagInput(values.tags),
    ...(fields.content ? { content: values.content } : {}),
    ...(fields.language ? { language: values.language } : {}),
    ...(fields.url ? { url: values.url } : {}),
  };
}
