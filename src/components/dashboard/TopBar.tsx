import Link from "next/link";
import { Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function TopBar() {
  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-4">
      <Link
        href="/"
        className="shrink-0 text-sm font-semibold tracking-tight sm:text-base"
      >
        Dev<span className="text-muted-foreground">Stash</span>
      </Link>

      <div className="relative mx-auto w-full max-w-md">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search items, tags, collections..."
          aria-label="Search"
          className="h-9 pl-8"
        />
      </div>

      <Button size="lg" aria-label="New Item" className="shrink-0">
        <Plus />
        <span className="hidden sm:inline">New Item</span>
      </Button>
    </header>
  );
}
