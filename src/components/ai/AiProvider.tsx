"use client";

import { createContext, useContext, type ReactNode } from "react";

import { canUseAi } from "@/lib/usage-limits";

interface AiAccess {
  isPro: boolean;
  /** Whether an OpenAI API key is set on the server. */
  configured: boolean;
}

const AiContext = createContext<AiAccess>({ isPro: false, configured: false });

/**
 * Whether the AI buttons should show: the user is Pro and an API key is
 * configured. Only decides what is shown; every AI route checks again.
 * False outside the provider, so a form rendered elsewhere simply has no AI.
 */
export function useCanUseAi(): boolean {
  const { isPro, configured } = useContext(AiContext);

  return canUseAi(isPro) && configured;
}

/**
 * The plan and configuration separately, for a control that shows Free users
 * an upgrade prompt rather than hiding itself.
 */
export function useAiAccess(): AiAccess {
  return useContext(AiContext);
}

/**
 * Hands the layout's answer to the item forms and the drawer. Both sit under
 * the app layout, which already reads the session, so this costs no query and
 * saves threading `isPro` through them.
 */
export function AiProvider({
  isPro,
  configured,
  children,
}: AiAccess & { children: ReactNode }) {
  return (
    <AiContext.Provider value={{ isPro, configured }}>{children}</AiContext.Provider>
  );
}
