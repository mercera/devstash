import { getRecentCollections } from "@/lib/db/collections";
import { getSearchItems } from "@/lib/db/items";
import { getEditorPreferences } from "@/lib/db/user";
import type { EditorPreferences } from "@/lib/editor-preferences";
import type {
  CollectionCardData,
  ItemCollectionSummary,
  SearchCollection,
  SearchItem,
} from "@/types";

/** What every signed-in shell needs for its search and providers. */
export interface AppShellData {
  /** Every collection, most recently updated first, for the sidebar. */
  collections: CollectionCardData[];
  /** The same collections by name, for the collection picker. */
  collectionOptions: ItemCollectionSummary[];
  searchItems: SearchItem[];
  searchCollections: SearchCollection[];
  editorPreferences: EditorPreferences;
}

/**
 * Loads the data shared by the app shell (sidebar) and the account shell (no
 * sidebar): the search palette's items and collections, the collection
 * picker's options and the editor preferences. The collections are read once
 * and reshaped for each use.
 */
export async function loadAppShellData(userId: string): Promise<AppShellData> {
  const [collections, searchItems, editorPreferences] = await Promise.all([
    getRecentCollections(userId),
    getSearchItems(userId),
    getEditorPreferences(userId),
  ]);

  const collectionOptions = collections
    .map(({ id, name, slug }) => ({ id, name, slug }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const searchCollections = collections.map(({ id, name, slug, itemCount }) => ({
    id,
    name,
    slug,
    itemCount,
  }));

  return { collections, collectionOptions, searchItems, searchCollections, editorPreferences };
}
