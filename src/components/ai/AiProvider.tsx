"use client";

import { createContext, useContext, type ReactNode } from "react";

const AiContext = createContext(false);

/**
 * Whether the AI buttons should show: the user is Pro and an API key is
 * configured. Only decides what is shown; every AI route checks again.
 * False outside the provider, so a form rendered elsewhere simply has no AI.
 */
export function useCanUseAi(): boolean {
  return useContext(AiContext);
}

/**
 * Hands the layout's answer to the item forms. The New Item dialog and the
 * drawer's edit form both sit under the app layout, which already reads the
 * session, so this costs no query and saves threading `isPro` through both.
 */
export function AiProvider({ canUseAi, children }: { canUseAi: boolean; children: ReactNode }) {
  return <AiContext.Provider value={canUseAi}>{children}</AiContext.Provider>;
}
