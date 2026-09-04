"use client";

import { useTransition } from "react";
import Link from "next/link";
import { ChevronsUpDown, LogOut, User } from "lucide-react";

import { signOutAction } from "@/actions/auth";
import { UserAvatar } from "@/components/auth/UserAvatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import type { CurrentUser } from "@/types";

/**
 * The sidebar footer's account control: avatar, name and email, opening a menu
 * upward with the profile link and sign-out.
 */
export function UserMenu({ user }: { user: CurrentUser }) {
  const [isSigningOut, startSignOut] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton size="lg">
          <UserAvatar user={user} />
          <div className="grid flex-1 text-left leading-tight">
            <span className="truncate font-medium">{user.name ?? user.email}</span>
            <span className="truncate text-xs text-sidebar-foreground/50">
              {user.email}
            </span>
          </div>
          <ChevronsUpDown className="ml-auto size-4 text-sidebar-foreground/50" />
        </SidebarMenuButton>
      </DropdownMenuTrigger>

      {/* `side="top"` because the trigger sits at the bottom of the viewport —
          the menu has to open upward or it would be clipped. */}
      <DropdownMenuContent
        side="top"
        align="start"
        sideOffset={8}
        className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
      >
        <DropdownMenuItem asChild>
          <Link href="/profile">
            <User />
            Profile
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          disabled={isSigningOut}
          // `preventDefault` keeps the menu open for the round trip, so the
          // pending label is actually visible — Radix would otherwise close and
          // unmount this item the instant it is selected. The action runs in a
          // transition rather than a nested form for the same reason: an
          // unmounted form cancels its own submit.
          onSelect={(event) => {
            event.preventDefault();
            startSignOut(async () => {
              await signOutAction();
            });
          }}
        >
          <LogOut />
          {isSigningOut ? "Signing out..." : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
