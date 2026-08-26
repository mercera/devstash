import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { Boxes, Clock, FolderOpen, Folders, Pin, Star } from "lucide-react";

import { CollectionCard } from "@/components/dashboard/CollectionCard";
import { ItemCard } from "@/components/dashboard/ItemCard";
import { StatCard } from "@/components/dashboard/StatCard";
import { getCollectionStats, getRecentCollections } from "@/lib/db/collections";
import { cn } from "@/lib/utils";
import { getDashboardStats, getPinnedItems, getRecentItems } from "@/lib/mock-data";

export const metadata: Metadata = {
  title: "Dashboard | DevStash",
};

/**
 * Collections now come from Prisma, so the page must render per-request —
 * without this, Next.js would prerender it once at build time and serve that
 * frozen snapshot instead of live data.
 */
export const dynamic = "force-dynamic";

const RECENT_ITEM_LIMIT = 10;
const COLLECTION_CARD_LIMIT = 6;

export default async function DashboardPage() {
  const stats = getDashboardStats();
  const pinnedItems = getPinnedItems();
  const recentItems = getRecentItems(RECENT_ITEM_LIMIT);
  const [collections, collectionStats] = await Promise.all([
    getRecentCollections(COLLECTION_CARD_LIMIT),
    getCollectionStats(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Your developer knowledge hub
        </p>
      </header>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Items"
          value={stats.itemCount}
          icon={Boxes}
          color="blue"
        />
        <StatCard
          label="Collections"
          value={collectionStats.collectionCount}
          icon={FolderOpen}
          color="purple"
        />
        <StatCard
          label="Favorite items"
          value={stats.favoriteItemCount}
          icon={Star}
          color="yellow"
        />
        <StatCard
          label="Favorite collections"
          value={collectionStats.favoriteCollectionCount}
          icon={Folders}
          color="green"
        />
      </section>

      <section>
        <SectionHeader
          title="Collections"
          variant="primary"
          action={
            <Link
              href="/collections"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              View all
            </Link>
          }
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {collections.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} />
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title="Pinned" icon={<Pin className="size-4" />} />
        <div className="flex flex-col gap-3">
          {pinnedItems.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title="Recent" icon={<Clock className="size-4" />} />
        <div className="flex flex-col gap-3">
          {recentItems.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      </section>
    </div>
  );
}

function SectionHeader({
  title,
  icon,
  action,
  variant = "muted",
}: {
  title: string;
  icon?: ReactNode;
  action?: ReactNode;
  /** `primary` is the large white heading used for the Collections grid. */
  variant?: "primary" | "muted";
}) {
  return (
    <div className="mb-4 flex h-8 items-center justify-between gap-4">
      <h2
        className={cn(
          "flex items-center gap-2 font-semibold",
          variant === "primary"
            ? "text-xl tracking-tight"
            : "text-base text-muted-foreground",
        )}
      >
        {icon}
        {title}
      </h2>
      {action}
    </div>
  );
}
