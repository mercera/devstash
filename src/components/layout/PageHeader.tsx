import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  /** The page's icon, shown in a tile beside the title. */
  icon: ReactNode;
  /** Tile colours, e.g. an item type's accent. Neutral when omitted. */
  tileClassName?: string;
  /** A line, or a few, under the title. */
  description?: ReactNode;
  /** Buttons on the right, such as "New Snippet". */
  actions?: ReactNode;
}

/**
 * The header of every signed-in page. Every page has the tile, so the title
 * starts at the same x on all of them and does not shift when navigating.
 */
export function PageHeader({
  title,
  icon,
  tileClassName,
  description,
  actions,
}: PageHeaderProps) {
  return (
    <header className="flex items-start gap-3">
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg [&_svg]:size-5",
          tileClassName ?? "bg-muted text-muted-foreground",
        )}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h1>
        {description && <div className="mt-1 text-muted-foreground">{description}</div>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}
