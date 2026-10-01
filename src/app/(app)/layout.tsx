import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { SIGN_IN_PATH } from "@/auth.config";
import { AiProvider } from "@/components/ai/AiProvider";
import { CollectionOptionsProvider } from "@/components/collections/CollectionOptionsProvider";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopBar } from "@/components/dashboard/TopBar";
import { EditorPreferencesProvider } from "@/components/editor/EditorPreferencesProvider";
import { ItemDrawerProvider } from "@/components/items/ItemDrawerProvider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { isAiConfigured } from "@/lib/ai/client";
import { getRecentCollections } from "@/lib/db/collections";
import { getItemTypesWithCounts, getSearchItems } from "@/lib/db/items";
import { getCurrentUser, getEditorPreferences } from "@/lib/db/user";
import { getSessionUser } from "@/lib/session";

/**
 * The signed-in app shell — sidebar, top bar and main area — shared by every
 * signed-in page. A route group, so it wraps them without adding a segment to
 * any URL.
 *
 * The sidebar's types, collections and footer user come from Prisma, so the
 * layout must render per-request — without this, Next.js would prerender it
 * once at build time and serve that frozen snapshot instead of live data.
 */
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const sessionUser = await getSessionUser();

  // The proxy already turns anonymous requests away; this covers the types.
  if (!sessionUser) {
    redirect(SIGN_IN_PATH);
  }

  const { id: userId, isPro } = sessionUser;

  const [itemTypes, collections, user, searchItems, editorPreferences] =
    await Promise.all([
      getItemTypesWithCounts(userId),
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
      <Sidebar
        itemTypes={itemTypes}
        collections={collections}
        user={user}
        isPro={isPro}
      />
      {/* A flex item will not shrink below its content by default, and the
          card grids size to their untruncated titles, so without min-w-0 the
          column widened past the window beside the sidebar at md. */}
      <SidebarInset className="min-w-0">
        <EditorPreferencesProvider initialPreferences={editorPreferences}>
          <CollectionOptionsProvider collections={collectionOptions}>
            <AiProvider isPro={isPro} configured={isAiConfigured()}>
              <ItemDrawerProvider>
                <TopBar
                  itemTypes={itemTypes}
                  searchItems={searchItems}
                  searchCollections={searchCollections}
                  isPro={isPro}
                />
                {/* One width for every page. It is also the query container
                    the page grids size their columns against, so they track
                    the space left beside the sidebar, not the window. */}
                <div className="min-w-0 flex-1 p-6">
                  <div className="@container mx-auto w-full max-w-6xl">
                    {children}
                  </div>
                </div>
              </ItemDrawerProvider>
            </AiProvider>
          </CollectionOptionsProvider>
        </EditorPreferencesProvider>
      </SidebarInset>
    </SidebarProvider>
  );
}
