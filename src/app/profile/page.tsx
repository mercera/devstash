import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Boxes, FolderOpen, Folders, Star } from "lucide-react";

import { SIGN_IN_PATH } from "@/auth.config";
import { UserAvatar } from "@/components/auth/UserAvatar";
import { ChangePasswordForm } from "@/components/profile/ChangePasswordForm";
import { DeleteAccountDialog } from "@/components/profile/DeleteAccountDialog";
import { StatCard } from "@/components/dashboard/StatCard";
import { TypeIcon } from "@/components/dashboard/TypeIcon";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCollectionStats } from "@/lib/db/collections";
import { getItemStats, getItemTypesWithCounts } from "@/lib/db/items";
import { getProfileUser } from "@/lib/db/user";
import { formatLongDate } from "@/lib/format";
import { getAccentTextClass } from "@/lib/icons";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Profile · DevStash",
};

/**
 * Live account data — this must never be served from a build-time snapshot.
 */
export const dynamic = "force-dynamic";

/**
 * The account page.
 *
 * `/profile` sits outside the dashboard's route segment, so it does not inherit
 * the sidebar; the header carries a link back instead. Moving it under the
 * dashboard layout would mean restructuring both routes into a shared group,
 * which is more than this feature needs.
 *
 * The **usage stats below are the seeded demo account's**, not the signed-in
 * user's: `getItemStats`, `getItemTypesWithCounts` and `getCollectionStats` are
 * all still scoped to `seed-user-demo`. The identity card above them is the real
 * session user, so the two disagree. That is deliberate for now — moving every
 * getter onto the session is its own change, and it would take the dashboard
 * with it. The account **actions** are session-scoped; only the reads are not.
 */
export default async function ProfilePage() {
  const user = await getProfileUser();

  // The proxy already turns anonymous requests away, so this is the second
  // lock: a session whose `User` row has since been deleted still carries a
  // valid JWT and would otherwise reach a page with nothing to render.
  if (!user) {
    redirect(SIGN_IN_PATH);
  }

  const [itemStats, collectionStats, itemTypes] = await Promise.all([
    getItemStats(),
    getCollectionStats(),
    getItemTypesWithCounts(),
  ]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to dashboard
      </Link>

      <div className="space-y-8">
        <Card>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <UserAvatar user={user} className="size-16" />
            <div className="min-w-0 space-y-1">
              <h1 className="truncate text-xl font-semibold">
                {user.name ?? user.email}
              </h1>
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
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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

        {/* Absent, not disabled, for a GitHub account — there is no password to
            change and the action refuses to set a first one. */}
        {user.hasPassword && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Change password</CardTitle>
              <CardDescription>
                You will stay signed in on this device.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChangePasswordForm />
            </CardContent>
          </Card>
        )}

        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-base">Delete account</CardTitle>
            <CardDescription>
              Permanently removes your account and everything in it. This cannot be
              undone.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DeleteAccountDialog email={user.email} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
