import { Logo } from "@/components/brand/Logo";
import { GlobalSearch } from "@/components/search/GlobalSearch";
import { DASHBOARD_PATH } from "@/lib/routes";
import type { SearchCollection, SearchItem } from "@/types";

interface AccountTopBarProps {
  searchItems: SearchItem[];
  searchCollections: SearchCollection[];
}

/**
 * The top bar of the account pages: the logo, which leads back to the
 * dashboard, and the search. Nothing else — these pages are about the
 * account, not its contents.
 */
export function AccountTopBar({ searchItems, searchCollections }: AccountTopBarProps) {
  return (
    <header className="sticky top-0 z-20 flex h-12 shrink-0 items-center gap-4 border-b border-border bg-background px-4">
      <Logo href={DASHBOARD_PATH} className="shrink-0" />
      <GlobalSearch items={searchItems} collections={searchCollections} />
    </header>
  );
}
