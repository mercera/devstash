"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { ItemDrawer } from "@/components/items/ItemDrawer";
import type { ItemDetail } from "@/types";

/** What the drawer is showing. Kept after close so the slide-out animates content. */
export type ItemDrawerState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "loaded"; item: ItemDetail }
  | { status: "error"; id: string; message: string };

/** `ItemDetail` as it arrives over JSON — the dates are ISO strings. */
type ItemDetailJson = Omit<ItemDetail, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};

type ItemDetailResponse =
  | { success: true; data: ItemDetailJson }
  | { success: false; error: string };

const FALLBACK_ERROR = "Couldn't load this item. Please try again.";

const OpenItemContext = createContext<((id: string) => void) | null>(null);

/** Opens the item drawer on the given item. Must be used inside `ItemDrawerProvider`. */
export function useOpenItem(): (id: string) => void {
  const openItem = useContext(OpenItemContext);

  if (openItem === null) {
    throw new Error("useOpenItem must be used inside ItemDrawerProvider");
  }

  return openItem;
}

/**
 * Owns the item drawer for every page in the app shell.
 *
 * The pages are server components and render the cards, so the open/fetch
 * state has to live in a client component above them. Cards reach it through
 * `useOpenItem`; the drawer itself is rendered once, here.
 */
export function ItemDrawerProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<ItemDrawerState>({ status: "idle" });
  const controllerRef = useRef<AbortController | null>(null);
  // Radix only returns focus to a `SheetTrigger`. The cards open the drawer
  // programmatically, so focus is handed back to whichever card opened it.
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const load = useCallback(async (id: string) => {
    // A click on another card supersedes a request still in flight, so a slow
    // response can never replace the item the user most recently asked for.
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setState({ status: "loading" });

    try {
      const item = await fetchItemDetail(id, controller.signal);

      if (!controller.signal.aborted) setState({ status: "loaded", item });
    } catch (error) {
      if (controller.signal.aborted) return;

      setState({
        status: "error",
        id,
        message: error instanceof Error ? error.message : FALLBACK_ERROR,
      });
    }
  }, []);

  const openItem = useCallback(
    (id: string) => {
      returnFocusRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      setOpen(true);
      void load(id);
    },
    [load],
  );

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) controllerRef.current?.abort();
  }

  return (
    <OpenItemContext.Provider value={openItem}>
      {children}
      <ItemDrawer
        open={open}
        onOpenChange={handleOpenChange}
        state={state}
        onRetry={(id) => void load(id)}
        onCloseAutoFocus={(event) => {
          if (!returnFocusRef.current?.isConnected) return;
          event.preventDefault();
          returnFocusRef.current.focus();
        }}
      />
    </OpenItemContext.Provider>
  );
}

async function fetchItemDetail(
  id: string,
  signal: AbortSignal,
): Promise<ItemDetail> {
  const response = await fetch(`/api/items/${encodeURIComponent(id)}`, {
    signal,
  });

  let body: ItemDetailResponse;

  try {
    body = (await response.json()) as ItemDetailResponse;
  } catch (error) {
    // An abort mid-body must stay an abort; anything else is a non-JSON reply.
    if (signal.aborted) throw error;
    throw new Error(FALLBACK_ERROR);
  }

  if (!body.success) throw new Error(body.error);

  return {
    ...body.data,
    createdAt: new Date(body.data.createdAt),
    updatedAt: new Date(body.data.updatedAt),
  };
}
