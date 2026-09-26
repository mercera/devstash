"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

import {
  DEFAULT_EDITOR_PREFERENCES,
  type EditorPreferences,
} from "@/lib/editor-preferences";

interface EditorPreferencesContextValue {
  preferences: EditorPreferences;
  setPreferences: (preferences: EditorPreferences) => void;
}

export const EditorPreferencesContext =
  createContext<EditorPreferencesContextValue | null>(null);

/**
 * The signed-in user's editor settings. Outside a provider it returns the
 * defaults, so an editor never has to know whether one was mounted.
 */
export function useEditorPreferences(): EditorPreferences {
  return useContext(EditorPreferencesContext)?.preferences ?? DEFAULT_EDITOR_PREFERENCES;
}

/**
 * The settings and their setter, for the form that changes them. Must be used
 * inside `EditorPreferencesProvider`.
 */
export function useEditorPreferencesState(): EditorPreferencesContextValue {
  const value = useContext(EditorPreferencesContext);

  if (value === null) {
    throw new Error(
      "useEditorPreferencesState must be used inside EditorPreferencesProvider",
    );
  }

  return value;
}

/**
 * Holds the user's editor settings for the client components below it,
 * starting from what the server read. The settings form updates the state as
 * soon as a value changes, so the change shows before the save returns.
 *
 * Mounted by the `(app)` layout, around every editor, and by `/settings`,
 * which sits outside that group. Each reads the stored value on the server,
 * so a save on one is picked up by the other on the next navigation.
 */
export function EditorPreferencesProvider({
  initialPreferences,
  children,
}: {
  initialPreferences: EditorPreferences;
  children: ReactNode;
}) {
  const [preferences, setPreferences] = useState(initialPreferences);

  return (
    <EditorPreferencesContext.Provider value={{ preferences, setPreferences }}>
      {children}
    </EditorPreferencesContext.Provider>
  );
}
