"use client";

import { useRef, type ReactNode } from "react";
import { toast } from "sonner";

import { updateEditorPreferences } from "@/actions/editor-preferences";
import { useEditorPreferencesState } from "@/components/editor/EditorPreferencesProvider";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  EDITOR_FONT_SIZES,
  EDITOR_TAB_SIZES,
  EDITOR_THEME_LABELS,
  EDITOR_THEMES,
  type EditorPreferences,
} from "@/lib/editor-preferences";

/** One id, so a burst of changes replaces its toast rather than stacking them. */
const TOAST_ID = "editor-preferences";

/**
 * Applies a change straight away and saves it in the background. There is no
 * save button: every change is sent, whole, as it is made.
 *
 * A failed save puts back the last set the server accepted — but only for the
 * newest save, so a slow failure cannot undo a change made after it.
 */
function useAutoSavedPreferences() {
  const { preferences, setPreferences } = useEditorPreferencesState();
  const saved = useRef(preferences);
  const latest = useRef(0);

  async function update(change: Partial<EditorPreferences>) {
    const next = { ...preferences, ...change };
    const save = ++latest.current;

    setPreferences(next);

    // A network failure rejects rather than returning a result.
    const result = await updateEditorPreferences(next).catch(() => ({
      success: false as const,
      error: "Could not save. Check your connection and try again.",
    }));

    if (result.success) {
      saved.current = result.data;
      toast.success("Editor preferences saved", { id: TOAST_ID });
      return;
    }

    if (save === latest.current) {
      setPreferences(saved.current);
    }
    toast.error(result.error, { id: TOAST_ID });
  }

  return { preferences, update };
}

/** The options' values as the strings Radix Select works in. */
function findOption<T extends string | number>(
  options: readonly T[],
  value: string,
): T | undefined {
  return options.find((option) => String(option) === value);
}

/** The editor section on `/settings`. Changes apply to every code editor. */
export function EditorPreferencesForm() {
  const { preferences, update } = useAutoSavedPreferences();

  function selectHandler<T extends string | number>(
    options: readonly T[],
    apply: (value: T) => Partial<EditorPreferences>,
  ) {
    return (value: string) => {
      const option = findOption(options, value);
      if (option !== undefined) void update(apply(option));
    };
  }

  return (
    <div className="divide-y">
      <SettingRow id="editor-theme" label="Theme">
        <Select
          value={preferences.theme}
          onValueChange={selectHandler(EDITOR_THEMES, (theme) => ({ theme }))}
        >
          <SelectTrigger id="editor-theme" className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EDITOR_THEMES.map((theme) => (
              <SelectItem key={theme} value={theme}>
                {EDITOR_THEME_LABELS[theme]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingRow>

      <SettingRow id="editor-font-size" label="Font size">
        <Select
          value={String(preferences.fontSize)}
          onValueChange={selectHandler(EDITOR_FONT_SIZES, (fontSize) => ({ fontSize }))}
        >
          <SelectTrigger id="editor-font-size" className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EDITOR_FONT_SIZES.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}px
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingRow>

      <SettingRow id="editor-tab-size" label="Tab size">
        <Select
          value={String(preferences.tabSize)}
          onValueChange={selectHandler(EDITOR_TAB_SIZES, (tabSize) => ({ tabSize }))}
        >
          <SelectTrigger id="editor-tab-size" className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EDITOR_TAB_SIZES.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size} spaces
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingRow>

      <SettingRow
        id="editor-word-wrap"
        label="Word wrap"
        description="Wrap long lines instead of scrolling sideways."
      >
        <Switch
          id="editor-word-wrap"
          checked={preferences.wordWrap}
          onCheckedChange={(wordWrap) => void update({ wordWrap })}
        />
      </SettingRow>

      <SettingRow
        id="editor-minimap"
        label="Minimap"
        description="Show an overview of the code beside the editor."
      >
        <Switch
          id="editor-minimap"
          checked={preferences.minimap}
          onCheckedChange={(minimap) => void update({ minimap })}
        />
      </SettingRow>
    </div>
  );
}

function SettingRow({
  id,
  label,
  description,
  children,
}: {
  id: string;
  label: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div className="space-y-0.5">
        <Label htmlFor={id}>{label}</Label>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}
