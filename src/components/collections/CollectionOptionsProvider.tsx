"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { ItemCollectionSummary } from "@/types";

const CollectionOptionsContext = createContext<ItemCollectionSummary[] | null>(null);

/**
 * The signed-in user's collections, by name, for the item forms' collection
 * picker. Must be used inside `CollectionOptionsProvider`.
 */
export function useCollectionOptions(): ItemCollectionSummary[] {
  const collections = useContext(CollectionOptionsContext);

  if (collections === null) {
    throw new Error("useCollectionOptions must be used inside CollectionOptionsProvider");
  }

  return collections;
}

/**
 * Hands the app layout's collection list to the item forms. The New Item
 * dialog sits in the top bar and on each type's page, and the edit form in the
 * drawer, so a context saves threading the list through all three. The layout
 * re-renders on `router.refresh()`, so a collection created a moment ago is
 * offered straight away.
 */
export function CollectionOptionsProvider({
  collections,
  children,
}: {
  collections: ItemCollectionSummary[];
  children: ReactNode;
}) {
  return (
    <CollectionOptionsContext.Provider value={collections}>
      {children}
    </CollectionOptionsContext.Provider>
  );
}
