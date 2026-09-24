"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import Editor, { type BeforeMount, type OnMount } from "@monaco-editor/react";
import { Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { copyToClipboard } from "@/lib/clipboard";
import {
  CODE_EDITOR_LINE_HEIGHT,
  CODE_EDITOR_PADDING,
  estimateContentHeight,
  getCodeEditorHeight,
  resolveMonacoLanguage,
  type MonacoLanguageInfo,
} from "@/lib/code-editor";
import { cn } from "@/lib/utils";

const THEME = "devstash-dark";

/**
 * Monaco's languages, once any editor has loaded it. Later editors start from
 * this, so they are created highlighted rather than as plain text first.
 */
let knownLanguages: readonly MonacoLanguageInfo[] = [];

/** An editable editor never shrinks below six lines, so there is room to click into. */
const EDITABLE_MIN_HEIGHT = CODE_EDITOR_LINE_HEIGHT * 6 + CODE_EDITOR_PADDING * 2;

interface CodeEditorProps {
  value: string;
  /** The item's free-text language; shown in the header and used for highlighting. */
  language?: string | null;
  /** Display mode. Omit `onChange` along with it. */
  readOnly?: boolean;
  onChange?: (value: string) => void;
  /** Read by screen readers in place of a visible label on the editor itself. */
  ariaLabel?: string;
  invalid?: boolean;
}

/**
 * Monaco in a macOS-style window: traffic-light dots, the language and a copy
 * button in the header, and a body that grows with its content up to 400px
 * before it scrolls.
 *
 * Monaco itself is fetched from a CDN by `@monaco-editor/react` the first time
 * an editor mounts; until then the raw text stands in at the same height.
 */
export function CodeEditor({
  value,
  language,
  readOnly = false,
  onChange,
  ariaLabel = "Code",
  invalid = false,
}: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const minHeight = readOnly ? 0 : EDITABLE_MIN_HEIGHT;
  const [height, setHeight] = useState(() =>
    getCodeEditorHeight(estimateContentHeight(value), minHeight),
  );
  const [languages, setLanguages] = useState(() => knownLanguages);

  const languageLabel = language?.trim().toLowerCase() || "plain text";
  const monacoLanguage = resolveMonacoLanguage(language, languages);

  useEscapeGuard(containerRef, !readOnly);

  // Not `useMonaco()`: it leaves the loader's rejection unhandled when it
  // unmounts before Monaco arrives, which Strict Mode does on every mount.
  const handleBeforeMount: BeforeMount = (monaco) => {
    defineTheme(monaco);
    knownLanguages = monaco.languages.getLanguages();
    setLanguages(knownLanguages);
  };

  const handleMount: OnMount = (editor, instance) => {
    const fit = () =>
      setHeight(getCodeEditorHeight(editor.getContentHeight(), minHeight));
    editor.onDidContentSizeChange(fit);
    fit();

    // Monaco measures glyphs on mount, possibly before Geist Mono has loaded.
    void document.fonts.ready.then(() => instance.editor.remeasureFonts());
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex flex-col rounded-lg border bg-muted/30 transition-colors",
        !readOnly &&
          "focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
        invalid &&
          "border-destructive/50 ring-3 ring-destructive/40 focus-within:border-destructive/50 focus-within:ring-destructive/40",
      )}
    >
      <div className="flex h-9 shrink-0 items-center gap-2 border-b pr-1.5 pl-3">
        <div className="flex gap-1.5" aria-hidden>
          <span className="size-3 rounded-full bg-[#ff5f57]" />
          <span className="size-3 rounded-full bg-[#febc2e]" />
          <span className="size-3 rounded-full bg-[#28c840]" />
        </div>
        <span className="ml-auto font-mono text-xs text-muted-foreground">
          {languageLabel}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Copy code"
          disabled={value.trim() === ""}
          onClick={() => void copyToClipboard(value)}
        >
          <Copy />
        </Button>
      </div>

      <Editor
        height={height}
        value={value}
        language={monacoLanguage}
        theme={THEME}
        beforeMount={handleBeforeMount}
        onMount={handleMount}
        onChange={(next) => onChange?.(next ?? "")}
        loading={<LoadingText value={value} />}
        options={{
          readOnly,
          domReadOnly: readOnly,
          ariaLabel,
          fontFamily: "var(--font-mono), ui-monospace, monospace",
          fontSize: 13,
          lineHeight: CODE_EDITOR_LINE_HEIGHT,
          padding: { top: CODE_EDITOR_PADDING, bottom: CODE_EDITOR_PADDING },
          automaticLayout: true,
          scrollBeyondLastLine: false,
          minimap: { enabled: false },
          stickyScroll: { enabled: false },
          folding: false,
          glyphMargin: false,
          lineNumbersMinChars: 3,
          lineDecorationsWidth: 12,
          renderLineHighlight: readOnly ? "none" : "line",
          overviewRulerLanes: 0,
          overviewRulerBorder: false,
          hideCursorInOverviewRuler: true,
          // Monaco's context menu renders outside the drawer/dialog, where a
          // click would count as outside and dismiss it.
          contextmenu: false,
          tabSize: 2,
          scrollbar: {
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8,
            useShadows: false,
            // Let the wheel scroll the drawer once the editor has nowhere to go.
            alwaysConsumeMouseWheel: false,
          },
        }}
      />
    </div>
  );
}

const defineTheme: BeforeMount = (monaco) => {
  monaco.editor.defineTheme(THEME, {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: {
      // Transparent, so the wrapper's surface and rounded corners show through.
      "editor.background": "#00000000",
      "editorGutter.background": "#00000000",
      "editor.lineHighlightBackground": "#ffffff08",
      "editor.lineHighlightBorder": "#00000000",
      "editorLineNumber.foreground": "#525252",
      "editorLineNumber.activeForeground": "#a3a3a3",
      "editorWidget.background": "#171717",
      "editorWidget.border": "#ffffff1a",
      "editorSuggestWidget.background": "#171717",
      "editorSuggestWidget.border": "#ffffff1a",
      "scrollbar.shadow": "#00000000",
      "scrollbarSlider.background": "#ffffff1f",
      "scrollbarSlider.hoverBackground": "#ffffff33",
      "scrollbarSlider.activeBackground": "#ffffff47",
    },
  });
};

function LoadingText({ value }: { value: string }) {
  return (
    <pre className="size-full overflow-hidden px-4 py-3 font-mono text-[13px] leading-5 text-muted-foreground">
      {value}
    </pre>
  );
}

/**
 * Keeps an Escape pressed inside an editable editor from dismissing the
 * drawer or dialog around it.
 *
 * Radix listens for Escape on `document` in the capture phase, so it hears the
 * key before Monaco does, and an Escape meant to close Monaco's suggestions
 * would otherwise close the form and discard the edit. Marking the event
 * handled in a `window` capture listener, which runs first, tells Radix to
 * leave it alone; Monaco still receives it.
 */
function useEscapeGuard(
  containerRef: RefObject<HTMLDivElement | null>,
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.key === "Escape" &&
        event.target instanceof Node &&
        containerRef.current?.contains(event.target)
      ) {
        event.preventDefault();
      }
    }

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () =>
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [containerRef, enabled]);
}
