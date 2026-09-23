import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { ItemCard } from "@/components/dashboard/ItemCard";
import { TypeIcon } from "@/components/dashboard/TypeIcon";
import { getItemsByType } from "@/lib/db/items";
import { getAccentTileClass } from "@/lib/icons";
import { cn } from "@/lib/utils";

/**
 * `generateMetadata` and the page both need the type, so the lookup is
 * memoised for the request rather than run twice.
 */
const loadItemsByType = cache(getItemsByType);

export async function generateMetadata({
  params,
}: PageProps<"/items/[type]">): Promise<Metadata> {
  const { type } = await params;
  const result = await loadItemsByType(type);

  return { title: `${result?.type.name ?? "Items"} | DevStash` };
}

export default async function ItemsByTypePage({
  params,
}: PageProps<"/items/[type]">) {
  const { type: slug } = await params;
  const result = await loadItemsByType(slug);

  if (result === null) notFound();

  const { type, items } = result;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex items-center gap-3">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg",
            getAccentTileClass(type.color),
          )}
        >
          <TypeIcon type={type} className="size-5" />
        </span>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{type.name}</h1>
          <p className="mt-1 text-muted-foreground">
            {items.length} {items.length === 1 ? "item" : "items"}
          </p>
        </div>
      </header>

      {items.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No {type.name.toLowerCase()} yet.
        </p>
      )}
    </div>
  );
}
