"use client";

import { CodeEditor } from "@/components/items/CodeEditor";
import { ItemFormField } from "@/components/items/ItemFormField";
import { ItemTagsField } from "@/components/items/ItemTagsField";
import { LanguageSelect } from "@/components/items/LanguageSelect";
import { MarkdownEditor } from "@/components/items/MarkdownEditor";
import { Input } from "@/components/ui/input";
import type { ItemForm } from "@/hooks/use-item-form";
import type { ItemTypeFields } from "@/lib/item-fields";

interface ItemContentFieldsProps {
  form: ItemForm;
  /** The item's type, for the tag suggestions. */
  typeSlug: string;
  fields: ItemTypeFields;
  /** Marks the URL input required; a link must have one when created. */
  urlRequired?: boolean;
}

/**
 * The type-dependent fields shared by both item forms — language, content and
 * URL, each only for the types that carry it — followed by tags.
 */
export function ItemContentFields({
  form,
  typeSlug,
  fields,
  urlRequired = false,
}: ItemContentFieldsProps) {
  const { values, issues, idFor, bind, setValue } = form;

  return (
    <>
      {/* Above the content, so the language is chosen before the code is
          typed and the editor highlights it as it goes. */}
      {fields.language && (
        <ItemFormField label="Language" htmlFor={idFor("language")} issues={issues.language}>
          <LanguageSelect
            id={idFor("language")}
            value={values.language}
            invalid={Boolean(issues.language)}
            onChange={(language) => setValue("language", language)}
          />
        </ItemFormField>
      )}

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

      {fields.url && (
        <ItemFormField label="URL" htmlFor={idFor("url")} issues={issues.url}>
          <Input {...bind("url")} type="url" placeholder="https://" required={urlRequired} />
        </ItemFormField>
      )}

      <ItemTagsField form={form} typeSlug={typeSlug} fields={fields} />
    </>
  );
}
