"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, WandSparkles, X } from "lucide-react";
import { toast } from "sonner";

import { setItemContent } from "@/actions/items";
import { useAiAccess } from "@/components/ai/AiProvider";
import { AiHeaderButton } from "@/components/ai/AiHeaderButton";
import { MarkdownEditor } from "@/components/items/MarkdownEditor";
import { MarkdownPreview } from "@/components/items/MarkdownPreview";
import { Button } from "@/components/ui/button";
import { useAiRequest } from "@/hooks/use-ai-request";
import { canOptimizeType } from "@/lib/validations/ai";
import type { ItemDetail, ItemDetailPatch, PromptOptimization } from "@/types";

const OPTIMIZE_PATH = "/api/ai/optimize-prompt";
const ALREADY_GOOD = "This prompt already looks good. No changes suggested.";
const NETWORK_ERROR = "Could not save. Check your connection and try again.";

interface Suggestion {
  prompt: string;
  changes: string[];
}

interface ItemPromptViewProps {
  item: ItemDetail;
  onSaved: (patch: ItemDetailPatch) => void;
}

/**
 * A prompt's content in the drawer's read view, with the AI "Optimize" action
 * in the editor header.
 *
 * Optimize asks the AI for a rewrite and shows it under the prompt, with what
 * changed, for the user to accept or discard. Nothing is saved until "Use this
 * prompt"; closing the drawer (which unmounts this) cancels a request in
 * progress and drops an unanswered suggestion.
 */
export function ItemPromptView({ item, onSaved }: ItemPromptViewProps) {
  const router = useRouter();
  const { isPro, configured } = useAiAccess();
  const { run, pending } = useAiRequest<PromptOptimization>(OPTIMIZE_PATH);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [saving, startSaving] = useTransition();

  const optimizable = configured && canOptimizeType(item.type.slug);

  async function optimize() {
    const result = await run({ itemId: item.id });

    if (!result) return;

    if (result.optimizedPrompt === null) {
      setSuggestion(null);
      toast.info(ALREADY_GOOD);
      return;
    }

    setSuggestion({ prompt: result.optimizedPrompt, changes: result.changes });
  }

  function accept(prompt: string) {
    startSaving(async () => {
      let result: Awaited<ReturnType<typeof setItemContent>>;

      try {
        result = await setItemContent(item.id, prompt);
      } catch {
        // A server action rejects rather than returning when the request fails.
        result = { success: false, error: NETWORK_ERROR };
      }

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      const { data } = result;

      toast.success("Prompt updated");

      startSaving(() => {
        setSuggestion(null);
        onSaved(data);
        router.refresh();
      });
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <MarkdownEditor
        value={item.content ?? ""}
        ariaLabel="Content"
        readOnly
        headerActions={
          optimizable && (
            <AiHeaderButton
              label="Optimize"
              actionLabel="Optimize prompt"
              isPro={isPro}
              pending={pending}
              onClick={() => void optimize()}
            />
          )
        }
      />

      {suggestion && (
        <PromptSuggestion
          suggestion={suggestion}
          saving={saving}
          disabled={pending}
          onAccept={() => accept(suggestion.prompt)}
          onDiscard={() => setSuggestion(null)}
        />
      )}
    </div>
  );
}

interface PromptSuggestionProps {
  suggestion: Suggestion;
  saving: boolean;
  /** A new optimization is on its way, which will replace this one. */
  disabled: boolean;
  onAccept: () => void;
  onDiscard: () => void;
}

/** The AI's rewrite, what it changed, and the choice to use it or not. */
function PromptSuggestion({
  suggestion,
  saving,
  disabled,
  onAccept,
  onDiscard,
}: PromptSuggestionProps) {
  const busy = saving || disabled;

  return (
    <section
      aria-label="Optimized prompt"
      aria-live="polite"
      className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4"
    >
      <header className="flex items-center gap-2">
        <WandSparkles className="size-4 text-muted-foreground" />
        <h4 className="text-sm font-medium">Optimized prompt</h4>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="Discard optimized prompt"
          className="ml-auto"
          disabled={busy}
          onClick={onDiscard}
        >
          <X />
        </Button>
      </header>

      {suggestion.changes.length > 0 && (
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {suggestion.changes.map((change) => (
            <li key={change}>{change}</li>
          ))}
        </ul>
      )}

      <div
        role="region"
        aria-label="Optimized prompt text"
        aria-busy={disabled || undefined}
        tabIndex={0}
        className="scrollbar-themed max-h-100 overflow-y-auto rounded-md border bg-background/40 px-4 py-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <MarkdownPreview value={suggestion.prompt} />
      </div>

      <p className="text-sm text-muted-foreground">
        Use this prompt? It replaces the saved one.
      </p>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={onDiscard}>
          Discard
        </Button>
        <Button type="button" size="sm" disabled={busy} onClick={onAccept}>
          {saving ? <Loader2 className="animate-spin" /> : <Check />}
          {saving ? "Saving..." : "Use this prompt"}
        </Button>
      </div>
    </section>
  );
}
