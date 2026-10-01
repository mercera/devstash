import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Folders } from "lucide-react";

import { SIGN_IN_PATH } from "@/auth.config";
import { CollectionCard } from "@/components/dashboard/CollectionCard";
import { EmptyState } from "@/components/layout/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import { Pagination } from "@/components/pagination/Pagination";
import { getCollectionsPage } from "@/lib/db/collections";
import {
  COLLECTIONS_PER_PAGE,
  getPageHref,
  getTotalPages,
  parsePageParam,
} from "@/lib/pagination";
import { COLLECTIONS_PATH } from "@/lib/routes";
import { getSessionUserId } from "@/lib/session";

export const metadata: Metadata = {
  title: "Collections | DevStash",
};


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

  if (page > totalPages) redirect(getPageHref(COLLECTIONS_PATH, totalPages));

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Collections"
        icon={<Folders />}
        description={`${total} ${total === 1 ? "collection" : "collections"}`}
      />

      {collections.length > 0 ? (
        <div className="grid gap-4 @xl:grid-cols-2 @4xl:grid-cols-3">
          {collections.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} />
          ))}
        </div>
      ) : (
        <EmptyState>No collections yet. Create one with New Collection.</EmptyState>
      )}

      <Pagination pathname={COLLECTIONS_PATH} page={page} totalPages={totalPages} />
    </div>
  );
}
