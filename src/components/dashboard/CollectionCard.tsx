import Link from "next/link";
import { Star } from "lucide-react";

import { TypeIcon } from "@/components/dashboard/TypeIcon";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAccentBorderClass, getAccentTextClass } from "@/lib/icons";
import { cn } from "@/lib/utils";
import type { CollectionCardData } from "@/types";

export function CollectionCard({
  collection,
}: {
  collection: CollectionCardData;
}) {
  return (
    <Card
      className={cn(
        "border-l-4 transition-colors hover:bg-accent/30",
        getAccentBorderClass(collection.accentColor),
      )}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          <Link
            href={`/collections/${collection.slug}`}
            className="truncate hover:underline"
          >
            {collection.name}
          </Link>
          {collection.isFavorite && (
            <Star className="size-3.5 shrink-0 fill-yellow-400 text-yellow-400" />
          )}
        </CardTitle>
        <CardDescription className="text-xs">
          {collection.itemCount} items
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        {collection.description && (
          <p className="text-sm text-muted-foreground">
            {collection.description}
          </p>
        )}

        <div className="flex items-center gap-2">
          {collection.types.map((type) => (
            <TypeIcon
              key={type.id}
              type={type}
              label={type.name}
              className={cn("size-4", getAccentTextClass(type.color))}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
