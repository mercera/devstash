/**
 * The languages the item forms offer for code content (snippets and
 * commands). Client-safe, with no Monaco dependency.
 *
 * Each value is what gets stored in `Item.language`, a lowercase name that
 * `resolveMonacoLanguage` in `src/lib/code-editor.ts` maps to Monaco's
 * highlighting (`bash` → `shell`, for example). The column stays free text,
 * so a stored value outside this list is still valid (see
 * `getLanguageOptions`).
 */

export interface LanguageOption {
  value: string;
  label: string;
}

/** Alphabetical by label. */
export const CODE_LANGUAGES: readonly LanguageOption[] = [
  { value: "bash", label: "Bash" },
  { value: "c", label: "C" },
  { value: "csharp", label: "C#" },
  { value: "cpp", label: "C++" },
  { value: "css", label: "CSS" },
  { value: "dockerfile", label: "Dockerfile" },
  { value: "go", label: "Go" },
  { value: "graphql", label: "GraphQL" },
  { value: "html", label: "HTML" },
  { value: "java", label: "Java" },
  { value: "javascript", label: "JavaScript" },
  { value: "json", label: "JSON" },
  { value: "kotlin", label: "Kotlin" },
  { value: "markdown", label: "Markdown" },
  { value: "php", label: "PHP" },
  { value: "powershell", label: "PowerShell" },
  { value: "python", label: "Python" },
  { value: "ruby", label: "Ruby" },
  { value: "rust", label: "Rust" },
  { value: "scss", label: "SCSS" },
  { value: "sql", label: "SQL" },
  { value: "swift", label: "Swift" },
  { value: "typescript", label: "TypeScript" },
  { value: "xml", label: "XML" },
  { value: "yaml", label: "YAML" },
];

/**
 * The option for "no language". Radix Select cannot use an empty string as an
 * item value, so this stands in for the blank form value.
 */
export const PLAIN_TEXT_OPTION: LanguageOption = {
  value: "__plain__",
  label: "Plain text",
};

/**
 * The listed option matching a stored language, compared case-insensitively
 * and ignoring surrounding space, or undefined when it is not listed.
 */
function findListedLanguage(language: string): LanguageOption | undefined {
  const name = language.trim().toLowerCase();
  return CODE_LANGUAGES.find((option) => option.value === name);
}

/**
 * The dropdown's options for an item whose current language is `current`:
 * Plain text, then the list. A stored language that is not in the list is
 * added after Plain text under its own name, so an existing item keeps it
 * rather than having it silently replaced.
 */
export function getLanguageOptions(current: string): LanguageOption[] {
  const name = current.trim();

  if (name === "" || findListedLanguage(name)) {
    return [PLAIN_TEXT_OPTION, ...CODE_LANGUAGES];
  }

  return [PLAIN_TEXT_OPTION, { value: name, label: name }, ...CODE_LANGUAGES];
}

/** The form's language value as the dropdown's selected value. */
export function toLanguageSelectValue(language: string): string {
  const name = language.trim();
  if (name === "") return PLAIN_TEXT_OPTION.value;

  return findListedLanguage(name)?.value ?? name;
}

/** The dropdown's selected value as the form's language value. */
export function fromLanguageSelectValue(value: string): string {
  return value === PLAIN_TEXT_OPTION.value ? "" : value;
}
