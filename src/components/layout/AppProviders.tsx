import type { ReactNode } from "react";

import { AiProvider } from "@/components/ai/AiProvider";
import { CollectionOptionsProvider } from "@/components/collections/CollectionOptionsProvider";
import { EditorPreferencesProvider } from "@/components/editor/EditorPreferencesProvider";
import { ItemDrawerProvider } from "@/components/items/ItemDrawerProvider";
import { isAiConfigured } from "@/lib/ai/client";
import type { AppShellData } from "@/lib/app-shell";

interface AppProvidersProps {
  shell: Pick<AppShellData, "editorPreferences" | "collectionOptions">;
  isPro: boolean;
  children: ReactNode;
}

/**
 * The client state every signed-in shell mounts: editor preferences, the
 * collection picker's options, AI access and the item drawer. Both shells
 * have the search palette, which opens items in the drawer, and the drawer's
 * editors and edit form read the rest.
 */
export function AppProviders({ shell, isPro, children }: AppProvidersProps) {
  return (
    <EditorPreferencesProvider initialPreferences={shell.editorPreferences}>
      <CollectionOptionsProvider collections={shell.collectionOptions}>
        <AiProvider isPro={isPro} configured={isAiConfigured()}>
          <ItemDrawerProvider>{children}</ItemDrawerProvider>
        </AiProvider>
      </CollectionOptionsProvider>
    </EditorPreferencesProvider>
  );
}
