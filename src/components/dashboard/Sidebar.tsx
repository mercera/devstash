"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Folder, Layers, Settings, Star } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sidebar as SidebarRoot,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { TypeIcon } from "@/components/dashboard/TypeIcon";
import { getAccentTextClass } from "@/lib/icons";
import {
  currentUser,
  getFavoriteCollections,
  getItemTypesWithCounts,
  getRecentCollections,
} from "@/lib/mock-data";

const itemTypes = getItemTypesWithCounts();
const favoriteCollections = getFavoriteCollections();
/** Favorites already have their own section, so they are excluded here. */
const otherCollections = getRecentCollections().filter(
  (collection) => !collection.isFavorite,
);

const userInitials = currentUser.name
  .split(" ")
  .map((part) => part[0])
  .join("")
  .slice(0, 2)
  .toUpperCase();

export function Sidebar() {
  const pathname = usePathname();

  return (
    <SidebarRoot>
      <SidebarHeader className="h-12 shrink-0 flex-row items-center border-b border-sidebar-border px-4 py-0">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <span className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
            <Layers className="size-4 text-white" />
          </span>
          <span className="text-base font-semibold tracking-tight">
            DevStash
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <NavSection label="Types">
          <SidebarGroupContent>
            <SidebarMenu>
              {itemTypes.map((type) => {
                const href = `/items/${type.slug}`;

                return (
                  <SidebarMenuItem key={type.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === href}
                    >
                      <Link href={href}>
                        <TypeIcon
                          type={type}
                          className={getAccentTextClass(type.color)}
                        />
                        <span>{type.name}</span>
                      </Link>
                    </SidebarMenuButton>
                    <SidebarMenuBadge className="text-sidebar-foreground/50">
                      {type.itemCount}
                    </SidebarMenuBadge>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </NavSection>

        <SidebarSeparator className="mx-0" />

        <NavSection label="Collections">
          <SidebarGroupContent className="space-y-1">
            <SubLabel>Favorites</SubLabel>
            <SidebarMenu>
              {favoriteCollections.map((collection) => (
                <CollectionItem
                  key={collection.id}
                  href={`/collections/${collection.slug}`}
                  isActive={pathname === `/collections/${collection.slug}`}
                  name={collection.name}
                >
                  <SidebarMenuBadge>
                    <Star className="size-3.5 fill-yellow-400 text-yellow-400" />
                  </SidebarMenuBadge>
                </CollectionItem>
              ))}
            </SidebarMenu>

            <SubLabel>All Collections</SubLabel>
            <SidebarMenu>
              {otherCollections.map((collection) => (
                <CollectionItem
                  key={collection.id}
                  href={`/collections/${collection.slug}`}
                  isActive={pathname === `/collections/${collection.slug}`}
                  name={collection.name}
                >
                  <SidebarMenuBadge className="text-sidebar-foreground/50">
                    {collection.itemCount}
                  </SidebarMenuBadge>
                </CollectionItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </NavSection>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg">
              <Avatar className="size-8">
                <AvatarImage src={currentUser.image ?? undefined} alt="" />
                <AvatarFallback className="text-xs">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate font-medium">{currentUser.name}</span>
                <span className="truncate text-xs text-sidebar-foreground/50">
                  {currentUser.email}
                </span>
              </div>
            </SidebarMenuButton>
            <SidebarMenuAction className="top-1/2 -translate-y-1/2 text-sidebar-foreground/50">
              <Settings />
              <span className="sr-only">Settings</span>
            </SidebarMenuAction>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </SidebarRoot>
  );
}

/** A collapsible sidebar section with a chevron in its header. */
function NavSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Collapsible defaultOpen className="group/section">
      <SidebarGroup>
        <SidebarGroupLabel
          asChild
          className="text-sm text-sidebar-foreground/80 hover:text-sidebar-foreground"
        >
          <CollapsibleTrigger>
            {label}
            <ChevronDown className="ml-1 transition-transform group-data-[state=closed]/section:-rotate-90" />
          </CollapsibleTrigger>
        </SidebarGroupLabel>
        <CollapsibleContent>{children}</CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}

function SubLabel({ children }: { children: ReactNode }) {
  return (
    <p className="px-2 pt-2 text-[11px] font-medium tracking-wider text-sidebar-foreground/40 uppercase">
      {children}
    </p>
  );
}

function CollectionItem({
  href,
  isActive,
  name,
  children,
}: {
  href: string;
  isActive: boolean;
  name: string;
  children: ReactNode;
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive}>
        <Link href={href}>
          <Folder className="text-sidebar-foreground/60" />
          <span>{name}</span>
        </Link>
      </SidebarMenuButton>
      {children}
    </SidebarMenuItem>
  );
}
