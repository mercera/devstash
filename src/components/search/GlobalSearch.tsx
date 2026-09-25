"use client";

import { FolderOpen, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { TypeIcon } from "@/components/items/TypeIcon";
import { useOpenItem } from "@/components/items/ItemDrawerProvider";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getAccentTextClass } from "@/lib/icons";
import { searchCollections, searchItems } from "@/lib/search";
import type { SearchCollection, SearchItem } from "@/types";

interface GlobalSearchProps {
  items: SearchItem[];
  collections: SearchCollection[];
}

/**
 * The top bar's search field and the command palette it opens.
 *
 * Everything searchable arrives with the app shell, so filtering happens here
 * on every keystroke with no server round trip. Cmd+K (Ctrl+K off Apple
 * platforms) toggles the palette from anywhere in the shell.
 */
export function GlobalSearch({ items, collections }: GlobalSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  // An item chosen in the palette, opened once the palette has let go of focus.
  const pendingItemRef = useRef<string | null>(null);
  const openItem = useOpenItem();
  const router = useRouter();
  const shortcut = useShortcutLabel();

  const itemResults = useMemo(() => searchItems(items, query), [items, query]);
  const collectionResults = useMemo(
    () => searchCollections(collections, query),
    [collections, query],
  );

  // Each opening starts from a blank query. Done on open rather than after the
  // close animation, which a quick reopen would cut short. A pending item from
  // a close that never finished is dropped for the same reason.
  function changeOpen(next: boolean) {
    if (next) {
      setQuery("");
      pendingItemRef.current = null;
    }
    setOpen(next);
  }

  const togglePalette = useEffectEvent(() => changeOpen(!open));

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // A focused editor (Monaco binds Ctrl+K chords) that claimed the key keeps it.
      if (event.defaultPrevented) return;
      if (event.key.toLowerCase() !== "k") return;
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) {
        return;
      }

      event.preventDefault();
      togglePalette();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  function selectItem(id: string) {
    pendingItemRef.current = id;
    setOpen(false);
  }

  function selectCollection(slug: string) {
    setOpen(false);
    router.push(`/collections/${slug}`);
  }

  // Runs once the palette has unmounted. Radix then restores focus to wherever
  // it was before the palette opened; the drawer is opened a microtask later so
  // it records that element, not the vanished palette input, to return to.
  function handleCloseAutoFocus() {
    const itemId = pendingItemRef.current;
    if (itemId === null) return;

    pendingItemRef.current = null;
    queueMicrotask(() => openItem(itemId));
  }

  const hasData = items.length > 0 || collections.length > 0;

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="Search items and collections"
          className="relative flex h-8 w-full max-w-sm items-center rounded-lg border border-input bg-transparent pr-14 pl-8 text-left text-sm text-muted-foreground transition-colors outline-none hover:bg-input/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        >
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <span className="truncate">Search items...</span>
          {shortcut !== null && (
            <kbd className="pointer-events-none absolute top-1/2 right-2 hidden -translate-y-1/2 items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium select-none sm:flex">
              {shortcut}
            </kbd>
          )}
        </button>
      </DialogTrigger>

      <DialogContent
        showCloseButton={false}
        onCloseAutoFocus={handleCloseAutoFocus}
        className="top-[15%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-lg"
      >
        <DialogTitle className="sr-only">Search</DialogTitle>
        <DialogDescription className="sr-only">
          Search your items and collections by name or content.
        </DialogDescription>

        {/* cmdk's vim bindings claim Ctrl+K for "previous item", which would
            stop the shortcut from closing the palette it opened. */}
        <Command shouldFilter={false} vimBindings={false} className="rounded-none!">
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Search items and collections..."
          />
          <CommandList className="max-h-80">
            <CommandEmpty>
              {hasData ? "No results found." : "Nothing to search yet."}
            </CommandEmpty>

            {itemResults.length > 0 && (
              <CommandGroup heading="Items">
                {itemResults.map((item) => (
                  <SearchItemRow
                    key={item.id}
                    item={item}
                    onSelect={() => selectItem(item.id)}
                  />
                ))}
              </CommandGroup>
            )}

            {collectionResults.length > 0 && (
              <CommandGroup heading="Collections">
                {collectionResults.map((collection) => (
                  <SearchCollectionRow
                    key={collection.id}
                    collection={collection}
                    onSelect={() => selectCollection(collection.slug)}
                  />
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

function SearchItemRow({
  item,
  onSelect,
}: {
  item: SearchItem;
  onSelect: () => void;
}) {
  return (
    <CommandItem value={`item-${item.id}`} onSelect={onSelect}>
      <TypeIcon type={item.type} className={getAccentTextClass(item.type.color)} />
      <div className="min-w-0 flex-1">
        <p className="truncate">{item.title}</p>
        {item.preview !== null && (
          <p className="truncate font-mono text-xs text-muted-foreground">
            {item.preview}
          </p>
        )}
      </div>
      <CommandShortcut className="tracking-normal">{item.type.name}</CommandShortcut>
    </CommandItem>
  );
}

function SearchCollectionRow({
  collection,
  onSelect,
}: {
  collection: SearchCollection;
  onSelect: () => void;
}) {
  return (
    <CommandItem value={`collection-${collection.id}`} onSelect={onSelect}>
      <FolderOpen className="text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate">{collection.name}</span>
      <CommandShortcut className="tracking-normal">
        {collection.itemCount} {collection.itemCount === 1 ? "item" : "items"}
      </CommandShortcut>
    </CommandItem>
  );
}

function subscribeToNothing() {
  return () => {};
}

/**
 * "⌘K" on Apple platforms, "Ctrl K" elsewhere. Null during server rendering and
 * hydration, since the platform is only known in the browser — the hint appears
 * once it is, rather than flashing the wrong symbol.
 */
function useShortcutLabel(): string | null {
  return useSyncExternalStore(
    subscribeToNothing,
    () => (/Mac|iPhone|iPad|iPod/.test(navigator.userAgent) ? "⌘K" : "Ctrl K"),
    () => null,
  );
}
