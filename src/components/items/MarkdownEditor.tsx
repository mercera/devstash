"use client";

import type { ReactNode } from "react";
import { Tabs } from "radix-ui";

import {
  EditorCopyButton,
  EditorHeader,
  editorFrameClass,
} from "@/components/items/EditorChrome";
import { MarkdownPreview } from "@/components/items/MarkdownPreview";
import { cn } from "@/lib/utils";

interface MarkdownEditorProps {
  value: string;
  /** Display mode: the Preview tab only. Omit `onChange` along with it. */
  readOnly?: boolean;
  onChange?: (value: string) => void;
  /** Put on the Write textarea, so a `<label htmlFor>` names it. */
  id?: string;
  name?: string;
  ariaLabel?: string;
  invalid?: boolean;
  /** Extra header controls before the copy button, such as an AI action. */
  headerActions?: ReactNode;
}

const TRIGGER_CLASS =
  "rounded-md px-2 py-0.5 text-xs text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 data-[state=active]:bg-muted data-[state=active]:text-foreground";

/**
 * Markdown for prompts and notes, in the same window chrome as `CodeEditor`:
 * traffic-light dots, Write/Preview tabs and a copy button in the header, and
 * a body that grows with its content up to 400px before it scrolls.
 */
export function MarkdownEditor({
  value,
  readOnly = false,
  onChange,
  id,
  name,
  ariaLabel = "Content",
  invalid = false,
  headerActions,
}: MarkdownEditorProps) {
  return (
    <Tabs.Root
      defaultValue={readOnly ? "preview" : "write"}
      className={editorFrameClass({ readOnly, invalid })}
    >
      <EditorHeader className="gap-3">
        <Tabs.List aria-label={`${ariaLabel} view`} className="flex gap-1">
          {!readOnly && (
            <Tabs.Trigger value="write" className={TRIGGER_CLASS}>
              Write
            </Tabs.Trigger>
          )}
          <Tabs.Trigger value="preview" className={TRIGGER_CLASS}>
            Preview
          </Tabs.Trigger>
        </Tabs.List>
        <div className="ml-auto flex items-center gap-1">
          {headerActions}
          <EditorCopyButton value={value} label="Copy markdown" />
        </div>
      </EditorHeader>

      {!readOnly && (
        <Tabs.Content value="write" className="outline-none">
          <textarea
            id={id}
            name={name}
            value={value}
            onChange={(event) => onChange?.(event.target.value)}
            aria-label={id ? undefined : ariaLabel}
            aria-invalid={invalid || undefined}
            spellCheck={false}
            placeholder="Write in Markdown..."
            className="scrollbar-themed block field-sizing-content max-h-100 min-h-40 w-full resize-none bg-transparent px-4 py-3 font-mono text-[13px] leading-relaxed outline-none placeholder:text-muted-foreground"
          />
        </Tabs.Content>
      )}

      <Tabs.Content
        value="preview"
        className={cn(
          "scrollbar-themed max-h-100 overflow-y-auto px-4 py-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          !readOnly && "min-h-40",
        )}
      >
        {value.trim() === "" ? (
          <p className="text-sm text-muted-foreground">Nothing to preview.</p>
        ) : (
          <MarkdownPreview value={value} />
        )}
      </Tabs.Content>
    </Tabs.Root>
  );
}
