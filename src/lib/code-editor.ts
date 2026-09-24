/**
 * Sizing and language rules for the Monaco-based code editor. Kept free of
 * Monaco and React so they can be unit-tested; the component passes in what
 * Monaco reports.
 */

export const CODE_EDITOR_MAX_HEIGHT = 400;
export const CODE_EDITOR_LINE_HEIGHT = 20;
/** Space above the first line and below the last. */
export const CODE_EDITOR_PADDING = 12;

/** The language Monaco falls back to, with no highlighting. */
export const PLAIN_TEXT_LANGUAGE = "plaintext";

/** The part of Monaco's `ILanguageExtensionPoint` used to match a language. */
export interface MonacoLanguageInfo {
  id: string;
  aliases?: string[];
  extensions?: string[];
}

/** Names people write that Monaco knows under another id, alias or extension. */
const EXTRA_ALIASES: Record<string, string> = {
  zsh: "shell",
  console: "shell",
  terminal: "shell",
  docker: "dockerfile",
  golang: "go",
};

/**
 * Maps an item's free-text language to one of Monaco's language ids.
 *
 * The name is matched, case-insensitively, against each language's id, then
 * its aliases (`ts`, `sh`), then its file extensions (`tsx`, `bash`, `yml`).
 * Anything unmatched, blank or absent is plain text.
 */
export function resolveMonacoLanguage(
  language: string | null | undefined,
  languages: readonly MonacoLanguageInfo[],
): string {
  const name = language?.trim().toLowerCase();
  if (!name) return PLAIN_TEXT_LANGUAGE;

  const wanted = EXTRA_ALIASES[name] ?? name;
  const matches = (values: string[] | undefined, target: string) =>
    values?.some((value) => value.toLowerCase() === target) ?? false;

  const match =
    languages.find((entry) => entry.id.toLowerCase() === wanted) ??
    languages.find((entry) => matches(entry.aliases, wanted)) ??
    languages.find((entry) => matches(entry.extensions, `.${wanted}`));

  return match?.id ?? PLAIN_TEXT_LANGUAGE;
}

/**
 * The editor's height: its content, no less than `minHeight` and no more than
 * the maximum, past which it scrolls.
 */
export function getCodeEditorHeight(contentHeight: number, minHeight = 0): number {
  return Math.min(Math.max(contentHeight, minHeight), CODE_EDITOR_MAX_HEIGHT);
}

/**
 * The content height Monaco will report for `value`, used to size the editor
 * before Monaco has loaded so the page does not jump when it arrives.
 */
export function estimateContentHeight(value: string): number {
  const lines = value.split("\n").length;
  return lines * CODE_EDITOR_LINE_HEIGHT + CODE_EDITOR_PADDING * 2;
}
