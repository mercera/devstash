"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { useAiAccess } from "@/components/ai/AiProvider";
import { ExplainButton } from "@/components/ai/ExplainButton";
import { CodeEditor } from "@/components/items/CodeEditor";
import { MarkdownPreview } from "@/components/items/MarkdownPreview";
import { useAiStream } from "@/hooks/use-ai-stream";
import { canExplainType } from "@/lib/validations/ai";
import type { ItemDetail } from "@/types";

const EXPLAIN_PATH = "/api/ai/explain";

type CodeView = "code" | "explain";

const VIEW_BUTTON_CLASS =
  "rounded-md px-2 py-0.5 text-xs text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:bg-muted aria-pressed:text-foreground";

/**
 * A snippet's or command's code in the drawer's read view, with the AI
 * "Explain" action in the editor header.
 *
 * Clicking Explain switches to the explanation, which streams into the space
 * the code occupied. Once there is one, Code / Explain tabs switch between
 * the two. Explanations are never stored: each click writes a new one, and
 * closing the drawer (which unmounts this) cancels one in progress.
 */
export function ItemCodeView({ item }: { item: ItemDetail }) {
  const { isPro, configured } = useAiAccess();
  const { text, status, start } = useAiStream(EXPLAIN_PATH);
  const [view, setView] = useState<CodeView>("code");

  const explainable = configured && canExplainType(item.type.slug);
  const pending = status === "pending" || status === "streaming";
  // A first run that fails leaves nothing to show, so fall back to the code.
  const showExplanation = view === "explain" && status !== "idle";

  function explain() {
    setView("explain");
    void start({ itemId: item.id });
  }

  return (
    <CodeEditor
      value={item.content ?? ""}
      language={item.language}
      ariaLabel="Content"
      readOnly
      headerStart={
        status !== "idle" && (
          <ViewToggle view={showExplanation ? "explain" : "code"} onChange={setView} />
        )
      }
      headerActions={
        explainable && <ExplainButton isPro={isPro} pending={pending} onExplain={explain} />
      }
      panel={
        showExplanation ? <ExplanationPanel text={text} streaming={pending} /> : undefined
      }
    />
  );
}

function ViewToggle({
  view,
  onChange,
}: {
  view: CodeView;
  onChange: (view: CodeView) => void;
}) {
  return (
    <div role="group" aria-label="Content view" className="flex gap-1">
      {(["code", "explain"] as const).map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={view === option}
          className={VIEW_BUTTON_CLASS}
          onClick={() => onChange(option)}
        >
          {option === "code" ? "Code" : "Explain"}
        </button>
      ))}
    </div>
  );
}

/**
 * The explanation, rendered as Markdown as it streams in. Until the first
 * words arrive (on a first run) it shows a spinner; a regeneration keeps the
 * previous explanation up until the new one starts.
 */
function ExplanationPanel({ text, streaming }: { text: string; streaming: boolean }) {
  return (
    <div
      role="region"
      aria-label="Explanation"
      aria-busy={streaming}
      tabIndex={0}
      className="scrollbar-themed max-h-100 overflow-y-auto px-4 py-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {text ? (
        <MarkdownPreview value={text} />
      ) : (
        <p className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Explaining...
        </p>
      )}
    </div>
  );
}
