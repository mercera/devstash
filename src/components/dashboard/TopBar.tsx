import { Sparkles, Star } from "lucide-react";
import Link from "next/link";

import { NewCollectionDialog } from "@/components/collections/NewCollectionDialog";
import { NewItemDialog } from "@/components/items/NewItemDialog";
import { GlobalSearch } from "@/components/search/GlobalSearch";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { getCreatableTypes } from "@/lib/item-fields";
import { UPGRADE_PATH } from "@/lib/routes";
import type { ItemType, SearchCollection, SearchItem } from "@/types";

interface TopBarProps {
  /** Every item type the user can see; the New Item dialog offers the creatable ones. */
  itemTypes: ItemType[];
  /** What the command palette searches, pre-fetched with the app shell. */
  searchItems: SearchItem[];
  searchCollections: SearchCollection[];
  isPro: boolean;
}

export function TopBar({
  itemTypes,
  searchItems,
  searchCollections,
  isPro,
}: TopBarProps) {
  const creatableTypes = getCreatableTypes(itemTypes);

  return (
    <header className="sticky top-0 z-20 flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background px-3">
      <SidebarTrigger className="hit-area shrink-0" />

      <GlobalSearch items={searchItems} collections={searchCollections} />

      <div className="ml-auto flex shrink-0 items-center gap-2">
        {!isPro && (
          <Button
            variant="ghost"
            asChild
            className="text-muted-foreground hover:text-foreground"
          >
            <Link href={UPGRADE_PATH} aria-label="Upgrade" title="Upgrade to Pro">
              <Sparkles />
              <span className="hidden lg:inline">Upgrade</span>
            </Link>
          </Button>
        )}
        <Button variant="ghost" size="icon" asChild>
          <Link href="/favorites" aria-label="Favorites" title="Favorites">
            <Star />
          </Link>
        </Button>
        <NewCollectionDialog />
        <NewItemDialog types={creatableTypes} isPro={isPro} labelFrom="lg" />
      </div>
    </header>
  );
}
