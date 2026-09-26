"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import Editor, { type BeforeMount, type OnMount } from "@monaco-editor/react";

import { useEditorPreferences } from "@/components/editor/EditorPreferencesProvider";
import {
  EditorCopyButton,
  EditorHeader,
  editorFrameClass,
} from "@/components/items/EditorChrome";
import {
  CODE_EDITOR_PADDING,
  estimateContentHeight,
  getCodeEditorHeight,
  getEditorLineHeight,
  resolveMonacoLanguage,
  type MonacoLanguageInfo,
} from "@/lib/code-editor";
import type { EditorFontSize } from "@/lib/editor-preferences";
import { MONACO_THEMES } from "@/lib/monaco-themes";
import { cn } from "@/lib/utils";

/**
 * Monaco's languages, once any editor has loaded it. Later editors start from
 * this, so they are created highlighted rather than as plain text first.
 */
let knownLanguages: readonly MonacoLanguageInfo[] = [];

/** An editable editor never shrinks below six lines, so there is room to click into. */
const EDITABLE_MIN_LINES = 6;

/** The placeholder's type, matched to each font size and its line height. */
const LOADING_TEXT_CLASS: Record<EditorFontSize, string> = {
  12: "text-[12px] leading-[18px]",
  13: "text-[13px] leading-5",
  14: "text-[14px] leading-[21px]",
  16: "text-[16px] leading-6",
  18: "text-[18px] leading-[27px]",
};

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
  const preferences = useEditorPreferences();
  const theme = MONACO_THEMES[preferences.theme];
  const lineHeight = getEditorLineHeight(preferences.fontSize);
  const minHeight = readOnly
    ? 0
    : lineHeight * EDITABLE_MIN_LINES + CODE_EDITOR_PADDING * 2;
  const [height, setHeight] = useState(() =>
    getCodeEditorHeight(estimateContentHeight(value, lineHeight), minHeight),
  );
  const [languages, setLanguages] = useState(() => knownLanguages);

  const languageLabel = language?.trim().toLowerCase() || "plain text";
  const monacoLanguage = resolveMonacoLanguage(language, languages);

  useEscapeGuard(containerRef, !readOnly);

  // Not `useMonaco()`: it leaves the loader's rejection unhandled when it
  // unmounts before Monaco arrives, which Strict Mode does on every mount.
  const handleBeforeMount: BeforeMount = (monaco) => {
    for (const { name, data } of Object.values(MONACO_THEMES)) {
      monaco.editor.defineTheme(name, data);
    }
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
      className={cn(editorFrameClass({ readOnly, invalid }), theme.surfaceClass)}
    >
      <EditorHeader>
        <span className="ml-auto font-mono text-xs text-muted-foreground">
          {languageLabel}
        </span>
        <EditorCopyButton value={value} label="Copy code" />
      </EditorHeader>

      <Editor
        height={height}
        value={value}
        language={monacoLanguage}
        theme={theme.name}
        beforeMount={handleBeforeMount}
        onMount={handleMount}
        onChange={(next) => onChange?.(next ?? "")}
        loading={
          <LoadingText
            value={value}
            className={cn(
              LOADING_TEXT_CLASS[preferences.fontSize],
              preferences.wordWrap && "whitespace-pre-wrap wrap-break-word",
            )}
          />
        }
        options={{
          readOnly,
          domReadOnly: readOnly,
          ariaLabel,
          fontFamily: "var(--font-mono), ui-monospace, monospace",
          fontSize: preferences.fontSize,
          lineHeight,
          padding: { top: CODE_EDITOR_PADDING, bottom: CODE_EDITOR_PADDING },
          automaticLayout: true,
          scrollBeyondLastLine: false,
          wordWrap: preferences.wordWrap ? "on" : "off",
          minimap: { enabled: preferences.minimap },
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
          tabSize: preferences.tabSize,
          // Otherwise Monaco guesses the tab size from the content and the
          // setting is ignored for any code that is already indented.
          detectIndentation: false,
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

function LoadingText({ value, className }: { value: string; className: string }) {
  return (
    <pre
      className={cn(
        "size-full overflow-hidden px-4 py-3 font-mono text-muted-foreground",
        className,
      )}
    >
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
