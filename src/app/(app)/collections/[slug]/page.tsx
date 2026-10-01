import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { FolderOpen } from "lucide-react";

import { SIGN_IN_PATH } from "@/auth.config";
import { CollectionActions } from "@/components/collections/CollectionActions";
import { ItemCard } from "@/components/items/ItemCard";
import { BackLink } from "@/components/layout/BackLink";
import { EmptyState } from "@/components/layout/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import { Pagination } from "@/components/pagination/Pagination";
import { getCollectionBySlug } from "@/lib/db/collections";
import { getItemsByCollection } from "@/lib/db/items";
import {
  ITEMS_PER_PAGE,
  getPageHref,
  getTotalPages,
  parsePageParam,
} from "@/lib/pagination";
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
  searchParams,
}: PageProps<"/collections/[slug]">) {
  const [{ slug }, query, userId] = await Promise.all([
    params,
    searchParams,
    getSessionUserId(),
  ]);

  if (!userId) {
    redirect(SIGN_IN_PATH);
  }

  const collection = await loadCollection(userId, slug);

  if (collection === null) notFound();

  const page = parsePageParam(query.page);
  const pathname = `/collections/${collection.slug}`;
  const { rows: items, total } = await getItemsByCollection(
    userId,
    collection.id,
    page,
  );
  const totalPages = getTotalPages(total, ITEMS_PER_PAGE);

  if (page > totalPages) redirect(getPageHref(pathname, totalPages));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <BackLink href="/collections" label="All collections" />
        <PageHeader
          title={collection.name}
          icon={<FolderOpen />}
          description={
            <>
              {collection.description && <p>{collection.description}</p>}
              <p className="mt-1 text-sm">
                {total} {total === 1 ? "item" : "items"}
              </p>
            </>
          }
          actions={
            <CollectionActions
              collection={{
                id: collection.id,
                name: collection.name,
                slug: collection.slug,
                description: collection.description,
                isFavorite: collection.isFavorite,
              }}
            />
          }
        />
      </div>

      {items.length > 0 ? (
        <div className="grid gap-4 @xl:grid-cols-2 @4xl:grid-cols-3">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <EmptyState>
          No items in this collection yet. Add items to it from New Item or an
          item&apos;s Edit.
        </EmptyState>
      )}

      <Pagination pathname={pathname} page={page} totalPages={totalPages} />
    </div>
  );
}
