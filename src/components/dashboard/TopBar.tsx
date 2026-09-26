import { Star } from "lucide-react";
import Link from "next/link";

import { NewCollectionDialog } from "@/components/collections/NewCollectionDialog";
import { NewItemDialog } from "@/components/items/NewItemDialog";
import { GlobalSearch } from "@/components/search/GlobalSearch";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { getCreatableTypes } from "@/lib/item-fields";
import type { ItemType, SearchCollection, SearchItem } from "@/types";

interface TopBarProps {
  /** Every item type the user can see; the New Item dialog offers the creatable ones. */
  itemTypes: ItemType[];
  /** What the command palette searches, pre-fetched with the app shell. */
  searchItems: SearchItem[];
  searchCollections: SearchCollection[];
}

export function TopBar({
  itemTypes,
  searchItems,
  searchCollections,
}: TopBarProps) {
  const creatableTypes = getCreatableTypes(itemTypes);

  return (
    <header className="sticky top-0 z-20 flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background px-3">
      <SidebarTrigger className="shrink-0" />

      <GlobalSearch items={searchItems} collections={searchCollections} />

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/favorites" aria-label="Favorites" title="Favorites">
            <Star />
          </Link>
        </Button>
        <NewCollectionDialog />
        <NewItemDialog types={creatableTypes} />
      </div>
    </header>
  );
}
