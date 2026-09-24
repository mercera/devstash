import type { ReactNode } from "react";
import { Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { copyToClipboard } from "@/lib/clipboard";
import { cn } from "@/lib/utils";

/**
 * The macOS-style window shared by `CodeEditor` and `MarkdownEditor`, so a
 * snippet and a note look the same in the drawer.
 */

/** The window's outer frame: a focus ring when editable, red when invalid. */
export function editorFrameClass({
  readOnly,
  invalid,
}: {
  readOnly: boolean;
  invalid: boolean;
}): string {
  return cn(
    "flex flex-col rounded-lg border bg-muted/30 transition-colors",
    !readOnly && "focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
    invalid &&
      "border-destructive/50 ring-3 ring-destructive/40 focus-within:border-destructive/50 focus-within:ring-destructive/40",
  );
}

/** The header bar: traffic-light dots, then whatever the editor puts after them. */
export function EditorHeader({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-9 shrink-0 items-center gap-2 border-b pr-1.5 pl-3",
        className,
      )}
    >
      <div className="flex gap-1.5" aria-hidden>
        <span className="size-3 rounded-full bg-[#ff5f57]" />
        <span className="size-3 rounded-full bg-[#febc2e]" />
        <span className="size-3 rounded-full bg-[#28c840]" />
      </div>
      {children}
    </div>
  );
}

/** Copies the editor's text; disabled while there is nothing to copy. */
export function EditorCopyButton({
  value,
  label,
  className,
}: {
  value: string;
  label: string;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      className={className}
      disabled={value.trim() === ""}
      onClick={() => void copyToClipboard(value)}
    >
      <Copy />
    </Button>
  );
}
