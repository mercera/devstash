"use client";

import { useState } from "react";
import { Loader2, WandSparkles } from "lucide-react";

import { useCanUseAi } from "@/components/ai/AiProvider";
import { ItemFormField } from "@/components/items/ItemFormField";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAiRequest } from "@/hooks/use-ai-request";
import type { ItemForm } from "@/hooks/use-item-form";
import type { ItemTypeFields } from "@/lib/item-fields";
import { SUMMARY_CONTENT_MAX_CHARS } from "@/lib/validations/ai";

const SUMMARY_PATH = "/api/ai/summary";

interface ItemDescriptionFieldProps {
  form: ItemForm;
  typeSlug: string;
  fields: ItemTypeFields;
  /** A file or image's name, the most there is to go on besides the title. */
  fileName?: string | null;
  className?: string;
}

/**
 * The description input, with a button for Pro users that writes a one- or
 * two-sentence summary from what is in the form right now. The summary
 * replaces the input's text; nothing is saved until the form is, so Cancel
 * undoes it.
 */
export function ItemDescriptionField({
  form,
  typeSlug,
  fields,
  fileName,
  className,
}: ItemDescriptionFieldProps) {
  const { values, issues, idFor, bind, setValue } = form;
  const canUseAi = useCanUseAi();
  const { run, pending } = useAiRequest<{ summary: string }>(SUMMARY_PATH);
  const [announcement, setAnnouncement] = useState("");

  // Only the fields this type shows: a value typed under another type in New
  // Item and left behind must not steer the summary.
  const content = fields.content ? values.content : "";
  const url = fields.url ? values.url : "";
  const nothingToSummarise = [values.title, content, url, fileName ?? ""].every(
    (value) => value.trim() === "",
  );

  async function generate() {
    // Cleared first, so a second summary is announced like the first.
    setAnnouncement("");
    const data = await run({
      typeSlug,
      title: values.title,
      content: content.slice(0, SUMMARY_CONTENT_MAX_CHARS),
      language: fields.language ? values.language : "",
      url,
      fileName: fileName ?? "",
    });

    if (!data) return;

    setValue("description", data.summary);
    setAnnouncement("Description generated.");
  }

  const label = nothingToSummarise ? "Add a title or content first" : "Generate description with AI";

  return (
    <ItemFormField
      label="Description"
      htmlFor={idFor("description")}
      issues={issues.description}
      action={
        canUseAi && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={generate}
            disabled={pending || nothingToSummarise}
            aria-label="Generate description"
            title={pending ? "Generating..." : label}
            className="hit-area text-muted-foreground"
          >
            {pending ? <Loader2 className="animate-spin" /> : <WandSparkles />}
          </Button>
        )
      }
    >
      <Textarea {...bind("description")} aria-busy={pending} className={className} />
      <span aria-live="polite" className="sr-only">
        {announcement}
      </span>
    </ItemFormField>
  );
}
