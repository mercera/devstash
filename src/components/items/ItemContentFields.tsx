"use client";

import { CodeEditor } from "@/components/items/CodeEditor";
import { ItemFormField } from "@/components/items/ItemFormField";
import { MarkdownEditor } from "@/components/items/MarkdownEditor";
import { Input } from "@/components/ui/input";
import type { ItemForm } from "@/hooks/use-item-form";
import type { ItemTypeFields } from "@/lib/item-fields";

interface ItemContentFieldsProps {
  form: ItemForm;
  fields: ItemTypeFields;
  /** Marks the URL input required; a link must have one when created. */
  urlRequired?: boolean;
}

/**
 * The type-dependent fields shared by both item forms — content, language and
 * URL, each only for the types that carry it — followed by tags.
 */
export function ItemContentFields({
  form,
  fields,
  urlRequired = false,
}: ItemContentFieldsProps) {
  const { values, issues, idFor, bind, setValue } = form;

  return (
    <>
      {fields.content && (
        <ItemFormField label="Content" htmlFor={idFor("content")} issues={issues.content}>
          {fields.code ? (
            <CodeEditor
              value={values.content}
              language={values.language}
              ariaLabel="Content"
              invalid={Boolean(issues.content)}
              onChange={(content) => setValue("content", content)}
            />
          ) : (
            <MarkdownEditor
              id={idFor("content")}
              name="content"
              value={values.content}
              invalid={Boolean(issues.content)}
              onChange={(content) => setValue("content", content)}
            />
          )}
        </ItemFormField>
      )}

      {fields.language && (
        <ItemFormField label="Language" htmlFor={idFor("language")} issues={issues.language}>
          <Input {...bind("language")} placeholder="e.g. typescript" />
        </ItemFormField>
      )}

      {fields.url && (
        <ItemFormField label="URL" htmlFor={idFor("url")} issues={issues.url}>
          <Input {...bind("url")} type="url" placeholder="https://" required={urlRequired} />
        </ItemFormField>
      )}

      <ItemFormField
        label="Tags"
        htmlFor={idFor("tags")}
        issues={issues.tags}
        hint="Separate tags with commas."
      >
        <Input {...bind("tags")} placeholder="react, hooks" />
      </ItemFormField>
    </>
  );
}
