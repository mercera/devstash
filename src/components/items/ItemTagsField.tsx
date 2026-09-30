"use client";

import { useState } from "react";
import { Check, Loader2, WandSparkles, X } from "lucide-react";
import { toast } from "sonner";

import { useCanUseAi } from "@/components/ai/AiProvider";
import { ItemFormField } from "@/components/items/ItemFormField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAiRequest } from "@/hooks/use-ai-request";
import type { ItemForm } from "@/hooks/use-item-form";
import { appendTag } from "@/lib/item-form";
import type { ItemTypeFields } from "@/lib/item-fields";
import { TAG_CONTENT_MAX_CHARS, canSuggestTagsFor } from "@/lib/validations/ai";
import { parseTagInput } from "@/lib/validations/items";

const SUGGEST_TAGS_PATH = "/api/ai/tags";

interface ItemTagsFieldProps {
  form: ItemForm;
  typeSlug: string;
  fields: ItemTypeFields;
}

/**
 * The tags input, with a "Suggest Tags" button for Pro users on text types.
 * Suggestions appear as chips under the input; accepting one adds it to the
 * input, and nothing is saved until the form is.
 */
export function ItemTagsField({ form, typeSlug, fields }: ItemTagsFieldProps) {
  const { values, issues, idFor, bind, setValue } = form;
  const canSuggest = useCanUseAi() && canSuggestTagsFor(typeSlug);
  const { run, pending } = useAiRequest<{ tags: string[] }>(SUGGEST_TAGS_PATH);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const nothingToTag = values.title.trim() === "" && values.content.trim() === "";

  async function suggest() {
    // Only the fields this type shows: a value typed under another type in
    // New Item and left behind must not steer the suggestions.
    const data = await run({
      typeSlug,
      title: values.title,
      description: values.description,
      content: fields.content ? values.content.slice(0, TAG_CONTENT_MAX_CHARS) : "",
      language: fields.language ? values.language : "",
      url: fields.url ? values.url : "",
      tags: parseTagInput(values.tags),
    });

    if (!data) return;

    if (data.tags.length === 0) toast.info("No new tags to suggest.");

    setSuggestions(data.tags);
  }

  function dismiss(tag: string) {
    setSuggestions((current) => current.filter((suggestion) => suggestion !== tag));
  }

  function accept(tag: string) {
    setValue("tags", appendTag(values.tags, tag));
    dismiss(tag);
  }

  return (
    <ItemFormField
      label="Tags"
      htmlFor={idFor("tags")}
      issues={issues.tags}
      hint="Separate tags with commas."
      action={
        canSuggest && (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={suggest}
            disabled={pending || nothingToTag}
            title={nothingToTag ? "Add a title or content first" : undefined}
            className="text-muted-foreground"
          >
            {pending ? <Loader2 className="animate-spin" /> : <WandSparkles />}
            {pending ? "Suggesting..." : "Suggest Tags"}
          </Button>
        )
      }
    >
      <Input {...bind("tags")} placeholder="react, hooks" />
      {suggestions.length > 0 && (
        <ul aria-label="Suggested tags" className="flex flex-wrap gap-1.5">
          {suggestions.map((tag) => (
            <li
              key={tag}
              className="inline-flex h-7 items-center gap-0.5 rounded-md border border-dashed pr-0.5 pl-2 text-xs"
            >
              {tag}
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={`Add tag ${tag}`}
                onClick={() => accept(tag)}
                className="ml-0.5 size-5 text-emerald-400 hover:text-emerald-300"
              >
                <Check />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={`Dismiss tag ${tag}`}
                onClick={() => dismiss(tag)}
                className="size-5 text-muted-foreground"
              >
                <X />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </ItemFormField>
  );
}
