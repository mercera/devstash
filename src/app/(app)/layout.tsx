import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { SIGN_IN_PATH } from "@/auth.config";
import { CollectionOptionsProvider } from "@/components/collections/CollectionOptionsProvider";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopBar } from "@/components/dashboard/TopBar";
import { EditorPreferencesProvider } from "@/components/editor/EditorPreferencesProvider";
import { ItemDrawerProvider } from "@/components/items/ItemDrawerProvider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getRecentCollections } from "@/lib/db/collections";
import { getItemTypesWithCounts, getSearchItems } from "@/lib/db/items";
import { getCurrentUser, getEditorPreferences } from "@/lib/db/user";
import { getSessionUserId } from "@/lib/session";

/**
 * The signed-in app shell — sidebar, top bar and main area — shared by
 * `/dashboard` and `/items/[type]`. A route group, so it wraps both without
 * adding a segment to either URL.
 *
 * The sidebar's types, collections and footer user come from Prisma, so the
 * layout must render per-request — without this, Next.js would prerender it
 * once at build time and serve that frozen snapshot instead of live data.
 */
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const userId = await getSessionUserId();

  // The proxy already turns anonymous requests away; this covers the types.
  if (!userId) {
    redirect(SIGN_IN_PATH);
  }

  const [itemTypes, collections, user, searchItems, editorPreferences] =
    await Promise.all([
      getItemTypesWithCounts(),
      getRecentCollections(userId),
      getCurrentUser(),
      getSearchItems(userId),
      getEditorPreferences(userId),
    ]);

  const collectionOptions = collections
    .map(({ id, name, slug }) => ({ id, name, slug }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const searchCollections = collections.map(
    ({ id, name, slug, itemCount }) => ({ id, name, slug, itemCount }),
  );

  // The drawer provider wraps the top bar too, so the command palette in it
  // can open an item in the drawer.
  return (
    <SidebarProvider className="min-h-full flex-1">
      <Sidebar itemTypes={itemTypes} collections={collections} user={user} />
      <SidebarInset>
        <EditorPreferencesProvider initialPreferences={editorPreferences}>
          <CollectionOptionsProvider collections={collectionOptions}>
            <ItemDrawerProvider>
              <TopBar
                itemTypes={itemTypes}
                searchItems={searchItems}
                searchCollections={searchCollections}
              />
              <div className="min-w-0 flex-1 p-6">{children}</div>
            </ItemDrawerProvider>
          </CollectionOptionsProvider>
        </EditorPreferencesProvider>
      </SidebarInset>
    </SidebarProvider>
  );
}
