import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";

import { ItemCard } from "@/components/items/ItemCard";
import { TypeIcon } from "@/components/items/TypeIcon";
import { FileRow } from "@/components/items/FileRow";
import { ImageCard } from "@/components/items/ImageCard";
import { NewItemDialog } from "@/components/items/NewItemDialog";
import { Pagination } from "@/components/pagination/Pagination";
import {
  getItemTypeBySlug,
  getItemTypesWithCounts,
  getItemsByType,
} from "@/lib/db/items";
import { getAccentTileClass } from "@/lib/icons";
import {
  getCreatableTypes,
  isCreatableTypeSlug,
  singularTypeName,
} from "@/lib/item-fields";
import {
  ITEMS_PER_PAGE,
  getPageHref,
  getTotalPages,
  parsePageParam,
} from "@/lib/pagination";
import { cn } from "@/lib/utils";

/**
 * `generateMetadata` and the page both need the type, so the lookup is
 * memoised for the request rather than run twice.
 */
const loadItemType = cache(getItemTypeBySlug);

export async function generateMetadata({
  params,
}: PageProps<"/items/[type]">): Promise<Metadata> {
  const { type: slug } = await params;
  const type = await loadItemType(slug);

  return { title: `${type?.name ?? "Items"} | DevStash` };
}

export default async function ItemsByTypePage({
  params,
  searchParams,
}: PageProps<"/items/[type]">) {
  const [{ type: slug }, query] = await Promise.all([params, searchParams]);
  const page = parsePageParam(query.page);
  const [type, itemTypes] = await Promise.all([
    loadItemType(slug),
    getItemTypesWithCounts(),
  ]);

  if (type === null) notFound();

  const pathname = `/items/${type.slug}`;
  const { rows: items, total } = await getItemsByType(type.id, page);
  const totalPages = getTotalPages(total, ITEMS_PER_PAGE);

  if (page > totalPages) redirect(getPageHref(pathname, totalPages));

  // Custom types cannot be created yet, so their pages get no button.
  const createSlug =
    type.isSystem && isCreatableTypeSlug(type.slug) ? type.slug : null;
  const isGallery = type.isSystem && type.slug === "image";
  const isFileList = type.isSystem && type.slug === "file";

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
            {total} {total === 1 ? "item" : "items"}
          </p>
        </div>
        {createSlug && (
          <div className="ml-auto">
            <NewItemDialog
              types={getCreatableTypes(itemTypes)}
              defaultTypeSlug={createSlug}
              label={`New ${singularTypeName(createSlug)}`}
              variant="outline"
            />
          </div>
        )}
      </header>

      {items.length > 0 && isFileList ? (
        <ul className="divide-y overflow-hidden rounded-xl border bg-card">
          {items.map((item) => (
            <FileRow key={item.id} item={item} />
          ))}
        </ul>
      ) : items.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) =>
            isGallery ? (
              <ImageCard key={item.id} item={item} />
            ) : (
              <ItemCard key={item.id} item={item} />
            ),
          )}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No {type.name.toLowerCase()} yet.
        </p>
      )}

      <Pagination pathname={pathname} page={page} totalPages={totalPages} />
    </div>
  );
}
