"use client";

import {
  useState,
  useTransition,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { createItem, type CreateItemField } from "@/actions/items";
import { TypeIcon } from "@/components/dashboard/TypeIcon";
import { CodeEditor } from "@/components/items/CodeEditor";
import { ItemFormField } from "@/components/items/ItemFormField";
import { MarkdownEditor } from "@/components/items/MarkdownEditor";
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
import { getAccentTextClass } from "@/lib/icons";
import {
  getItemTypeFields,
  isCreatableTypeSlug,
  singularTypeName,
  type CreatableTypeSlug,
  type ItemTypeFields,
} from "@/lib/item-fields";
import { cn } from "@/lib/utils";
import { parseTagInput, type CreateItemInput } from "@/lib/validations/items";
import type { ItemType } from "@/types";

const CREATE_FAILED = "Something went wrong. Please try again.";

interface NewItemDialogProps {
  /** The creatable item types, in sidebar order. */
  types: ItemType[];
  /** The type selected on opening. Defaults to the first of `types`. */
  defaultTypeSlug?: CreatableTypeSlug;
  /** The trigger's text, hidden on narrow screens where only the icon shows. */
  label?: string;
  variant?: "default" | "outline";
}

/**
 * A New Item button and the dialog it opens: in the top bar with no type
 * chosen, and on each type's page with that type selected.
 *
 * The form lives inside `DialogContent`, which unmounts on close, so every
 * opening starts from a blank form without any reset logic.
 */
export function NewItemDialog({
  types,
  defaultTypeSlug,
  label = "New Item",
  variant = "default",
}: NewItemDialogProps) {
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
        <Button variant={variant} aria-label={label}>
          <Plus />
          <span className="hidden sm:inline">{label}</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="border-b p-4">
          <DialogTitle>New item</DialogTitle>
          <DialogDescription>
            Save a snippet, prompt, command, note or link.
          </DialogDescription>
        </DialogHeader>

        <NewItemForm
          types={types}
          defaultTypeSlug={defaultTypeSlug}
          onPendingChange={setIsPending}
          onCancel={() => setOpen(false)}
          onCreated={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
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

type Issues = Partial<Record<CreateItemField, string[]>>;

const EMPTY_VALUES: FormValues = {
  title: "",
  description: "",
  content: "",
  language: "",
  url: "",
  tags: "",
};

interface NewItemFormProps {
  types: ItemType[];
  defaultTypeSlug?: CreatableTypeSlug;
  onPendingChange: (pending: boolean) => void;
  onCancel: () => void;
  onCreated: () => void;
}

function NewItemForm({
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
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [issues, setIssues] = useState<Issues>({});
  const [isPending, startTransition] = useTransition();
  const fields = getItemTypeFields(typeSlug);

  const canSubmit =
    values.title.trim() !== "" && (!fields.url || values.url.trim() !== "");

  function bind(name: keyof FormValues) {
    return {
      id: `item-new-${name}`,
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
    onPendingChange(true);

    startTransition(async () => {
      try {
        const result = await createItem(toPayload(typeSlug, values, fields));

        if (!result.success) {
          setIssues(result.issues ?? {});
          toast.error(result.error);
          return;
        }

        toast.success("Item created");
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
        <div className="flex flex-col gap-2">
          <span id="item-new-type" className="text-sm font-medium text-muted-foreground">
            Type
          </span>
          <div
            role="group"
            aria-labelledby="item-new-type"
            className="grid grid-cols-3 gap-2 sm:grid-cols-5"
          >
            {types.map((type) => {
              const selected = type.slug === typeSlug;

              return (
                <button
                  key={type.id}
                  type="button"
                  aria-pressed={selected}
                  disabled={isPending}
                  onClick={() => {
                    if (isCreatableTypeSlug(type.slug)) setTypeSlug(type.slug);
                  }}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-lg border px-2 py-2.5 text-xs transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50",
                    selected
                      ? "border-foreground/30 bg-accent text-foreground"
                      : "border-border text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                  )}
                >
                  <TypeIcon
                    type={type}
                    className={cn("size-4", getAccentTextClass(type.color))}
                  />
                  {singularTypeName(type.slug)}
                </button>
              );
            })}
          </div>
          {issues.typeSlug && (
            <p className="text-xs text-destructive">{issues.typeSlug.join(". ")}</p>
          )}
        </div>

        <ItemFormField label="Title" htmlFor="item-new-title" issues={issues.title}>
          <Input {...bind("title")} required autoFocus />
        </ItemFormField>

        <ItemFormField
          label="Description"
          htmlFor="item-new-description"
          issues={issues.description}
        >
          <Textarea {...bind("description")} className="min-h-16" />
        </ItemFormField>

        {fields.content && (
          <ItemFormField label="Content" htmlFor="item-new-content" issues={issues.content}>
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
              <MarkdownEditor
                id="item-new-content"
                name="content"
                value={values.content}
                invalid={Boolean(issues.content)}
                onChange={(content) =>
                  setValues((current) => ({ ...current, content }))
                }
              />
            )}
          </ItemFormField>
        )}

        {fields.language && (
          <ItemFormField
            label="Language"
            htmlFor="item-new-language"
            issues={issues.language}
          >
            <Input {...bind("language")} placeholder="e.g. typescript" />
          </ItemFormField>
        )}

        {fields.url && (
          <ItemFormField label="URL" htmlFor="item-new-url" issues={issues.url}>
            <Input {...bind("url")} type="url" placeholder="https://" required />
          </ItemFormField>
        )}

        <ItemFormField
          label="Tags"
          htmlFor="item-new-tags"
          issues={issues.tags}
          hint="Separate tags with commas."
        >
          <Input {...bind("tags")} placeholder="react, hooks" />
        </ItemFormField>
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

/**
 * Only the fields shown for the chosen type are sent, so a value typed under
 * another type and left behind cannot fail validation for a field that is not
 * on screen. The server drops any it does not expect regardless.
 */
function toPayload(
  typeSlug: CreatableTypeSlug,
  values: FormValues,
  fields: ItemTypeFields,
): CreateItemInput {
  return {
    typeSlug,
    title: values.title,
    description: values.description,
    tags: parseTagInput(values.tags),
    ...(fields.content ? { content: values.content } : {}),
    ...(fields.language ? { language: values.language } : {}),
    ...(fields.url ? { url: values.url } : {}),
  };
}
