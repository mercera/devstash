import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Boxes,
  Clock,
  FolderOpen,
  Folders,
  LayoutDashboard,
  Pin,
  Star,
} from "lucide-react";

import { SIGN_IN_PATH } from "@/auth.config";
import { CollectionCard } from "@/components/dashboard/CollectionCard";
import { ItemCard } from "@/components/items/ItemCard";
import { StatCard } from "@/components/dashboard/StatCard";
import { EmptyState } from "@/components/layout/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import { getCollectionStats, getRecentCollections } from "@/lib/db/collections";
import { getItemStats, getPinnedItems, getRecentItems } from "@/lib/db/items";
import {
  DASHBOARD_COLLECTIONS_LIMIT,
  DASHBOARD_RECENT_ITEMS_LIMIT,
} from "@/lib/pagination";
import { getSessionUserId } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Dashboard | DevStash",
};

/**
 * Collections and items now come from Prisma, so the page must render
 * per-request — without this, Next.js would prerender it once at build time
 * and serve that frozen snapshot instead of live data.
 */
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const userId = await getSessionUserId();

  if (!userId) {
    redirect(SIGN_IN_PATH);
  }

  const [collections, collectionStats, pinnedItems, recentItems, itemStats] =
    await Promise.all([
      getRecentCollections(userId, DASHBOARD_COLLECTIONS_LIMIT),
      getCollectionStats(userId),
      getPinnedItems(userId),
      getRecentItems(userId, DASHBOARD_RECENT_ITEMS_LIMIT),
      getItemStats(userId),
    ]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Dashboard"
        icon={<LayoutDashboard />}
        description="Your developer knowledge hub"
      />

      <section className="grid grid-cols-2 gap-4 @4xl:grid-cols-4">
        <StatCard
          label="Items"
          value={itemStats.itemCount}
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
          value={itemStats.favoriteItemCount}
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
              className="hit-area text-sm text-muted-foreground hover:text-foreground"
            >
              View all
            </Link>
          }
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
      </section>

      {pinnedItems.length > 0 && (
        <section>
          <SectionHeader title="Pinned" icon={<Pin className="size-4" />} />
          <div className="flex flex-col gap-3">
            {pinnedItems.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionHeader title="Recent" icon={<Clock className="size-4" />} />
        {recentItems.length > 0 ? (
          <div className="flex flex-col gap-3">
            {recentItems.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <EmptyState>No items yet. Create one with New Item.</EmptyState>
        )}
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
