import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { FolderOpen, Star } from "lucide-react";

import { SIGN_IN_PATH } from "@/auth.config";
import { ItemCard } from "@/components/items/ItemCard";
import { getCollectionBySlug } from "@/lib/db/collections";
import { getItemsByCollection } from "@/lib/db/items";
import { getSessionUserId } from "@/lib/session";

/**
 * `generateMetadata` and the page both need the collection, so the lookup is
 * memoised for the request rather than run twice.
 */
const loadCollection = cache(getCollectionBySlug);

export async function generateMetadata({
  params,
}: PageProps<"/collections/[slug]">): Promise<Metadata> {
  const [{ slug }, userId] = await Promise.all([params, getSessionUserId()]);
  const collection = userId ? await loadCollection(userId, slug) : null;

  return { title: `${collection?.name ?? "Collection"} | DevStash` };
}

/**
 * One of the signed-in user's collections and its items. Another user's
 * collection 404s the same as a missing one.
 */
export default async function CollectionPage({
  params,
}: PageProps<"/collections/[slug]">) {
  const [{ slug }, userId] = await Promise.all([params, getSessionUserId()]);

  if (!userId) {
    redirect(SIGN_IN_PATH);
  }

  const collection = await loadCollection(userId, slug);

  if (collection === null) notFound();

  const items = await getItemsByCollection(userId, collection.id);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <FolderOpen className="size-5" />
        </span>
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight">
            <span className="truncate">{collection.name}</span>
            {collection.isFavorite && (
              <Star
                aria-label="Favorite"
                className="size-5 shrink-0 fill-yellow-400 text-yellow-400"
              />
            )}
          </h1>
          {collection.description && (
            <p className="mt-1 text-muted-foreground">
              {collection.description}
            </p>
          )}
          <p className="mt-1 text-sm text-muted-foreground">
            {items.length} {items.length === 1 ? "item" : "items"}
          </p>
        </div>
      </header>

      {items.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No items in this collection yet.
        </p>
      )}
    </div>
  );
}
