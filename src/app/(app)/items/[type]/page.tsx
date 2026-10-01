import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";

import { SIGN_IN_PATH } from "@/auth.config";
import { UpgradePrompt } from "@/components/billing/UpgradePrompt";
import { ItemCard } from "@/components/items/ItemCard";
import { TypeIcon } from "@/components/items/TypeIcon";
import { FileRow } from "@/components/items/FileRow";
import { ImageCard } from "@/components/items/ImageCard";
import { NewItemDialog } from "@/components/items/NewItemDialog";
import { EmptyState } from "@/components/layout/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
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
import { getItemTypePath } from "@/lib/routes";
import { getSessionUser, getSessionUserId } from "@/lib/session";
import { canViewTypeSlug } from "@/lib/usage-limits";

/**
 * `generateMetadata` and the page both need the type, so the lookup is
 * memoised for the request rather than run twice.
 */
const loadItemType = cache(getItemTypeBySlug);

export async function generateMetadata({
  params,
}: PageProps<"/items/[type]">): Promise<Metadata> {
  const [{ type: slug }, userId] = await Promise.all([params, getSessionUserId()]);
  const type = userId ? await loadItemType(userId, slug) : null;

  return { title: `${type?.name ?? "Items"} | DevStash` };
}

export default async function ItemsByTypePage({
  params,
  searchParams,
}: PageProps<"/items/[type]">) {
  const [{ type: slug }, query] = await Promise.all([params, searchParams]);
  const page = parsePageParam(query.page);
  const sessionUser = await getSessionUser();

  // The proxy and the layout already turn anonymous requests away.
  if (!sessionUser) redirect(SIGN_IN_PATH);

  const { id: userId, isPro } = sessionUser;
  const [type, itemTypes] = await Promise.all([
    loadItemType(userId, slug),
    getItemTypesWithCounts(userId),
  ]);

  if (type === null) notFound();

  const typeIcon = <TypeIcon type={type} />;
  const tileClassName = getAccentTileClass(type.color);

  if (type.isSystem && !canViewTypeSlug(type.slug, isPro)) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title={type.name} icon={typeIcon} tileClassName={tileClassName} />
        <UpgradePrompt type={type} />
      </div>
    );
  }

  const pathname = getItemTypePath(type.slug);
  const { rows: items, total } = await getItemsByType(userId, type.id, page);
  const totalPages = getTotalPages(total, ITEMS_PER_PAGE);

  if (page > totalPages) redirect(getPageHref(pathname, totalPages));

  // Custom types cannot be created yet, so their pages get no button.
  const createSlug =
    type.isSystem && isCreatableTypeSlug(type.slug) ? type.slug : null;
  const isGallery = type.isSystem && type.slug === "image";
  const isFileList = type.isSystem && type.slug === "file";

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={type.name}
        icon={typeIcon}
        tileClassName={tileClassName}
        description={`${total} ${total === 1 ? "item" : "items"}`}
        actions={
          createSlug && (
            <NewItemDialog
              types={getCreatableTypes(itemTypes)}
              defaultTypeSlug={createSlug}
              isPro={isPro}
              label={`New ${singularTypeName(createSlug)}`}
              variant="outline"
            />
          )
        }
      />

      {items.length > 0 && isFileList ? (
        <ul className="divide-y overflow-hidden rounded-xl border bg-card">
          {items.map((item) => (
            <FileRow key={item.id} item={item} />
          ))}
        </ul>
      ) : items.length > 0 ? (
        <div className="grid gap-4 @xl:grid-cols-2 @4xl:grid-cols-3">
          {items.map((item) =>
            isGallery ? (
              <ImageCard key={item.id} item={item} />
            ) : (
              <ItemCard key={item.id} item={item} />
            ),
          )}
        </div>
      ) : (
        <EmptyState>No {type.name.toLowerCase()} yet.</EmptyState>
      )}

      <Pagination pathname={pathname} page={page} totalPages={totalPages} />
    </div>
  );
}
