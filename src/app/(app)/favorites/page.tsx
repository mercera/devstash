import { Folder, Star } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SIGN_IN_PATH } from "@/auth.config";
import { FavoriteRow } from "@/components/favorites/FavoriteRow";
import { FavoritesSection } from "@/components/favorites/FavoritesSection";
import { ItemCardButton } from "@/components/items/ItemCardButton";
import { TypeIcon } from "@/components/items/TypeIcon";
import { getFavoriteCollections } from "@/lib/db/collections";
import { getFavoriteItems } from "@/lib/db/items";
import { getAccentTextClass } from "@/lib/icons";
import { getSessionUserId } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Favorites | DevStash",
};

const ICON_CLASS = "size-4 shrink-0";

function plural(count: number, noun: string): string {
  return `${count} ${count === 1 ? noun : `${noun}s`}`;
}

/**
 * The signed-in user's favorited items and collections as a compact list,
 * most recently updated first. Scoped to the session user for both, so every
 * item listed is one the drawer's API will open.
 */
export default async function FavoritesPage() {
  const userId = await getSessionUserId();

  if (!userId) {
    redirect(SIGN_IN_PATH);
  }

  const [items, collections] = await Promise.all([
    getFavoriteItems(userId),
    getFavoriteCollections(userId),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Favorites</h1>
        <p className="mt-1 text-muted-foreground">
          {plural(items.length, "item")} · {plural(collections.length, "collection")}
        </p>
      </header>

      {items.length === 0 && collections.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          <Star className="size-5" aria-hidden />
          <p>No favorites yet. Favorited items and collections appear here.</p>
        </div>
      ) : (
        <>
          <FavoritesSection
            id="favorite-items"
            title="Items"
            count={items.length}
            emptyText="No favorite items."
          >
            {items.map((item) => (
              <FavoriteRow
                key={item.id}
                icon={
                  <TypeIcon
                    type={item.type}
                    className={cn(ICON_CLASS, getAccentTextClass(item.type.color))}
                  />
                }
                title={item.title}
                badge={item.type.slug}
                date={item.updatedAt}
              >
                <ItemCardButton itemId={item.id} title={item.title} />
              </FavoriteRow>
            ))}
          </FavoritesSection>

          <FavoritesSection
            id="favorite-collections"
            title="Collections"
            count={collections.length}
            emptyText="No favorite collections."
          >
            {collections.map((collection) => (
              <FavoriteRow
                key={collection.id}
                icon={
                  <Folder
                    className={cn(ICON_CLASS, "text-muted-foreground")}
                    aria-hidden
                  />
                }
                title={collection.name}
                badge={plural(collection.itemCount, "item")}
                date={collection.updatedAt}
              >
                <Link
                  href={`/collections/${collection.slug}`}
                  aria-label={`Open ${collection.name}`}
                  className="absolute inset-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                />
              </FavoriteRow>
            ))}
          </FavoritesSection>
        </>
      )}
    </div>
  );
}
