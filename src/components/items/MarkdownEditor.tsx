"use client";

import { Tabs } from "radix-ui";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import {
  EditorCopyButton,
  EditorHeader,
  editorFrameClass,
} from "@/components/items/EditorChrome";
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
}

/**
 * Open every link in a new tab, like the drawer's URL link. A link whose URL
 * react-markdown stripped as unsafe (`javascript:` and the like) arrives with
 * an empty `href`, and renders as its text.
 */
const MARKDOWN_COMPONENTS: Components = {
  a: ({ href, title, children }) =>
    href ? (
      <a href={href} title={title} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ) : (
      <span>{children}</span>
    ),
};

const TRIGGER_CLASS =
  "rounded-md px-2 py-0.5 text-xs text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 data-[state=active]:bg-muted data-[state=active]:text-foreground";

/**
 * Markdown for prompts and notes, in the same window chrome as `CodeEditor`:
 * traffic-light dots, Write/Preview tabs and a copy button in the header, and
 * a body that grows with its content up to 400px before it scrolls.
 *
 * Rendering goes through `react-markdown`, which escapes raw HTML and drops
 * `javascript:` URLs by default. Keep it that way: no `rehype-raw`.
 */
export function MarkdownEditor({
  value,
  readOnly = false,
  onChange,
  id,
  name,
  ariaLabel = "Content",
  invalid = false,
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
        <EditorCopyButton value={value} label="Copy markdown" className="ml-auto" />
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
          <div className="markdown-preview">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={MARKDOWN_COMPONENTS}
            >
              {value}
            </ReactMarkdown>
          </div>
        )}
      </Tabs.Content>
    </Tabs.Root>
  );
}
