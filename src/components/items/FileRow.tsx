import { Download } from "lucide-react";
import { createElement } from "react";

import { ItemCardButton } from "@/components/items/ItemCardButton";
import { AccentTile } from "@/components/layout/AccentTile";
import { StatusMarks } from "@/components/layout/StatusMarks";
import { Button } from "@/components/ui/button";
import { getFileIconName } from "@/lib/file-icons";
import { formatShortDate } from "@/lib/format";
import { getIcon } from "@/lib/icons";
import { formatFileSize } from "@/lib/uploads";
import type { ItemWithRelations } from "@/types";

/**
 * One row of the Files list: an icon for the extension, the file name, its
 * size, the upload date and a download button.
 *
 * Like `ItemCard`, the row opens the drawer through `ItemCardButton`. The
 * download link sits above that overlay (`z-10`) as a sibling, not inside it,
 * so its clicks never reach the overlay and the drawer stays shut.
 */
export function FileRow({ item }: { item: ItemWithRelations }) {
  const name = item.fileName ?? item.title;

  return (
    <li className="relative flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/30">
      <AccentTile color={item.type.color}>
        {createElement(getIcon(getFileIconName(item.fileName)), { "aria-hidden": true })}
      </AccentTile>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate font-medium">{name}</span>
          <StatusMarks isPinned={item.isPinned} isFavorite={item.isFavorite} />
        </div>

        <div className="flex shrink-0 gap-3 text-xs text-muted-foreground sm:ml-auto sm:gap-4">
          {item.fileSize !== null && (
            <span className="tabular-nums sm:w-16 sm:text-right">
              {formatFileSize(item.fileSize)}
            </span>
          )}
          <time
            dateTime={item.createdAt.toISOString()}
            className="sm:w-14 sm:text-right"
          >
            {formatShortDate(item.createdAt)}
          </time>
        </div>
      </div>

      {/* Before the download link so Tab reaches Open first; `z-10` keeps the
          link above it regardless. */}
      <ItemCardButton itemId={item.id} title={item.title} />

      {item.fileUrl && (
        // Through the app's download route: a cross-origin link to R2 would
        // ignore `download` and open the file instead of saving it.
        <Button
          variant="ghost"
          size="icon-sm"
          className="hit-area z-10 shrink-0"
          asChild
        >
          <a
            href={`/api/items/${item.id}/download`}
            download
            aria-label={`Download ${name}`}
          >
            <Download />
          </a>
        </Button>
      )}
    </li>
  );
}
