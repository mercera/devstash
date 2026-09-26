import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SIGN_IN_PATH } from "@/auth.config";
import { CollectionCard } from "@/components/dashboard/CollectionCard";
import { Pagination } from "@/components/pagination/Pagination";
import { getCollectionsPage } from "@/lib/db/collections";
import {
  COLLECTIONS_PER_PAGE,
  getPageHref,
  getTotalPages,
  parsePageParam,
} from "@/lib/pagination";
import { getSessionUserId } from "@/lib/session";

export const metadata: Metadata = {
  title: "Collections | DevStash",
};

const PATHNAME = "/collections";

/** The signed-in user's collections, a page at a time, most recently updated first. */
export default async function CollectionsPage({
  searchParams,
}: PageProps<"/collections">) {
  const [userId, query] = await Promise.all([
    getSessionUserId(),
    searchParams,
  ]);

  if (!userId) {
    redirect(SIGN_IN_PATH);
  }

  const page = parsePageParam(query.page);
  const { rows: collections, total } = await getCollectionsPage(userId, page);
  const totalPages = getTotalPages(total, COLLECTIONS_PER_PAGE);

  if (page > totalPages) redirect(getPageHref(PATHNAME, totalPages));

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Collections</h1>
        <p className="mt-1 text-muted-foreground">
          {total} {total === 1 ? "collection" : "collections"}
        </p>
      </header>

      {collections.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {collections.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} />
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No collections yet. Create one with New Collection.
        </p>
      )}

      <Pagination pathname={PATHNAME} page={page} totalPages={totalPages} />
    </div>
  );
}
