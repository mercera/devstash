"use client";

import { ItemDetailView } from "@/components/items/ItemDetailView";
import type { ItemDrawerState } from "@/components/items/ItemDrawerProvider";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

interface ItemDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: ItemDrawerState;
  onRetry: (id: string) => void;
  onCloseAutoFocus: (event: Event) => void;
}

/**
 * The right-hand item detail sheet. Stateless — `ItemDrawerProvider` decides
 * what it shows. `aria-describedby` is cleared because the sheet's body is the
 * description; Radix would otherwise warn that none is set.
 */
export function ItemDrawer({
  open,
  onOpenChange,
  state,
  onRetry,
  onCloseAutoFocus,
}: ItemDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        aria-describedby={undefined}
        onCloseAutoFocus={onCloseAutoFocus}
        className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-lg"
      >
        {state.status === "loaded" ? (
          <ItemDetailView item={state.item} />
        ) : state.status === "error" ? (
          <ItemDrawerError
            message={state.message}
            onRetry={() => onRetry(state.id)}
          />
        ) : (
          <ItemDrawerSkeleton />
        )}
      </SheetContent>
    </Sheet>
  );
}

function ItemDrawerSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col">
      <SheetTitle className="sr-only">Loading item</SheetTitle>

      <div className="flex items-start gap-3 p-6 pr-12">
        <Skeleton className="size-10 shrink-0 rounded-lg" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-5 w-2/3" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20" />
          </div>
        </div>
      </div>

      <div className="flex gap-2 border-b px-6 pb-4">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-18" />
      </div>

      <div className="flex flex-col gap-6 p-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-full" />
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-40 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

function ItemDrawerError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <SheetTitle>Couldn&apos;t load item</SheetTitle>
      <p role="alert" className="text-muted-foreground">
        {message}
      </p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
