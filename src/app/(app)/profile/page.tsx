import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Boxes, FolderOpen, Folders, Star, UserRound } from "lucide-react";

import { SIGN_IN_PATH } from "@/auth.config";
import { UserAvatar } from "@/components/auth/UserAvatar";
import { StatCard } from "@/components/dashboard/StatCard";
import { TypeIcon } from "@/components/items/TypeIcon";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { getCollectionStats } from "@/lib/db/collections";
import { getItemStats, getItemTypesWithCounts } from "@/lib/db/items";
import { getProfileUser } from "@/lib/db/user";
import { formatLongDate } from "@/lib/format";
import { getAccentTextClass } from "@/lib/icons";
import { getSessionUserId } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Profile | DevStash",
};

/**
 * Live account data — this must never be served from a build-time snapshot.
 */
export const dynamic = "force-dynamic";

/**
 * The account page.
 *
 * Every stat is the signed-in user's own. The account actions live on
 * `/settings`.
 */
export default async function ProfilePage() {
  const [userId, user] = await Promise.all([getSessionUserId(), getProfileUser()]);

  // The proxy already turns anonymous requests away, so this is the second
  // lock: a session whose `User` row has since been deleted still carries a
  // valid JWT and would otherwise reach a page with nothing to render.
  if (!userId || !user) {
    redirect(SIGN_IN_PATH);
  }

  const [itemStats, collectionStats, itemTypes] = await Promise.all([
    getItemStats(userId),
    getCollectionStats(userId),
    getItemTypesWithCounts(userId),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Profile"
        icon={<UserRound />}
        description="Your account and what is in it."
      />

      <Card>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <UserAvatar user={user} className="size-16" />
          <div className="min-w-0 space-y-1">
            <h2 className="truncate text-xl font-semibold">
              {user.name ?? user.email}
            </h2>
            <p className="truncate text-sm text-muted-foreground">{user.email}</p>
            <p className="text-xs text-muted-foreground">
              Joined {formatLongDate(user.createdAt)}
              {" · "}
              {user.hasPassword ? "Email account" : "GitHub account"}
            </p>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Usage</h2>
        <div className="grid grid-cols-2 gap-4 @4xl:grid-cols-4">
          <StatCard label="Items" value={itemStats.itemCount} icon={Boxes} color="blue" />
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
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">By type</h2>
        <Card>
          <CardContent className="divide-y divide-border p-0">
            {itemTypes.map((type) => (
              <div
                key={type.id}
                className="flex items-center gap-3 px-4 py-2.5 first:pt-3 last:pb-3"
              >
                <TypeIcon
                  type={type}
                  className={cn("size-4 shrink-0", getAccentTextClass(type.color))}
                />
                <span className="min-w-0 flex-1 truncate text-sm">{type.name}</span>
                <span className="text-sm tabular-nums text-muted-foreground">
                  {type.itemCount}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
