import { Pin, Star } from "lucide-react";

import { TypeIcon } from "@/components/dashboard/TypeIcon";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatShortDate } from "@/lib/format";
import { getAccentBorderClass, getAccentTileClass } from "@/lib/icons";
import { cn } from "@/lib/utils";
import type { ItemWithRelations } from "@/types";

export function ItemCard({ item }: { item: ItemWithRelations }) {
  return (
    <Card
      className={cn(
        "flex-row items-start gap-3 border-l-4 px-4 transition-colors hover:bg-accent/30",
        getAccentBorderClass(item.type.color),
      )}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg",
          getAccentTileClass(item.type.color),
        )}
      >
        <TypeIcon type={item.type} className="size-4.5" />
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          <h3 className="truncate font-medium">{item.title}</h3>
          {item.isPinned && (
            <Pin className="size-3.5 shrink-0 text-muted-foreground" />
          )}
          {item.isFavorite && (
            <Star className="size-3.5 shrink-0 fill-yellow-400 text-yellow-400" />
          )}
        </div>

        {item.description && (
          <p className="truncate text-sm text-muted-foreground">
            {item.description}
          </p>
        )}

        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {item.tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="font-normal text-muted-foreground"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <time
        dateTime={item.updatedAt.toISOString()}
        className="shrink-0 text-xs text-muted-foreground"
      >
        {formatShortDate(item.updatedAt)}
      </time>
    </Card>
  );
}
