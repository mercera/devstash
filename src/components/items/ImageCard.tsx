import { Pin, Star } from "lucide-react";

import { TypeIcon } from "@/components/dashboard/TypeIcon";
import { ItemCardButton } from "@/components/items/ItemCardButton";
import { Card } from "@/components/ui/card";
import { formatShortDate } from "@/lib/format";
import { getAccentTileClass } from "@/lib/icons";
import { cn } from "@/lib/utils";
import type { ItemWithRelations } from "@/types";

/**
 * A gallery thumbnail for an image item: the picture on top, title and date
 * below. Like `ItemCard`, it opens the item drawer through `ItemCardButton`.
 *
 * The frame's `overflow-hidden` keeps the hover zoom inside the card.
 */
export function ImageCard({ item }: { item: ItemWithRelations }) {
  return (
    <Card className="relative gap-0 py-0 transition-colors hover:bg-accent/30">
      <div className="aspect-video overflow-hidden bg-muted/40">
        {item.fileUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- user uploads on R2, any size or format; nothing to optimise
          <img
            src={item.fileUrl}
            alt={item.title}
            loading="lazy"
            className="size-full object-cover transition-transform duration-300 group-hover/card:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <span
              className={cn(
                "flex size-10 items-center justify-center rounded-lg",
                getAccentTileClass(item.type.color),
              )}
            >
              <TypeIcon type={item.type} className="size-5" />
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 px-4 py-3">
        <h3 className="truncate font-medium">{item.title}</h3>
        {item.isPinned && (
          <Pin className="size-3.5 shrink-0 text-muted-foreground" />
        )}
        {item.isFavorite && (
          <Star className="size-3.5 shrink-0 fill-yellow-400 text-yellow-400" />
        )}
        <time
          dateTime={item.updatedAt.toISOString()}
          className="ml-auto shrink-0 pl-2 text-xs text-muted-foreground"
        >
          {formatShortDate(item.updatedAt)}
        </time>
      </div>

      <ItemCardButton itemId={item.id} title={item.title} />
    </Card>
  );
}
