import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SIGN_IN_PATH } from "@/auth.config";
import { CollectionCard } from "@/components/dashboard/CollectionCard";
import { getRecentCollections } from "@/lib/db/collections";
import { getSessionUserId } from "@/lib/session";

export const metadata: Metadata = {
  title: "Collections | DevStash",
};

/** Every one of the signed-in user's collections, most recently updated first. */
export default async function CollectionsPage() {
  const userId = await getSessionUserId();

  if (!userId) {
    redirect(SIGN_IN_PATH);
  }

  const collections = await getRecentCollections(userId);

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Collections</h1>
        <p className="mt-1 text-muted-foreground">
          {collections.length}{" "}
          {collections.length === 1 ? "collection" : "collections"}
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
    </div>
  );
}
