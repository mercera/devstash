"use client";

import { Fragment, useState, type ReactNode } from "react";

import {
  DEFAULT_FAVORITE_SORT,
  FAVORITE_SORT_LABELS,
  sortFavorites,
  type FavoriteSort,
  type SortableFavorite,
} from "@/lib/favorites-sort";
import { cn } from "@/lib/utils";

/** One row of the section: its sort fields plus the server-rendered row. */
export interface FavoritesSectionRow extends SortableFavorite {
  node: ReactNode;
}

interface FavoritesSectionProps {
  id: string;
  title: string;
  /** Shown in place of the list when there are no rows. */
  emptyText: string;
  /** The orders this section offers, in the order the control shows them. */
  sorts: readonly FavoriteSort[];
  rows: FavoritesSectionRow[];
}

/**
 * A labelled, counted list of favorite rows, divided by hairlines, with its
 * own sort control. The rows arrive already rendered, so `FavoriteRow` stays a
 * server component and only the ordering happens here.
 */
export function FavoritesSection({ id, title, emptyText, sorts, rows }: FavoritesSectionProps) {
  const [sort, setSort] = useState<FavoriteSort>(DEFAULT_FAVORITE_SORT);
  const sorted = sortFavorites(rows, sort);

  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3 px-3">
        <h2
          id={id}
          className="flex items-baseline gap-2 font-mono text-xs tracking-wider text-muted-foreground uppercase"
        >
          {title}
          <span className="tabular-nums">{rows.length}</span>
        </h2>

        {rows.length > 1 && (
          <div
            role="group"
            aria-label={`Sort ${title.toLowerCase()}`}
            className="flex items-center gap-0.5 font-mono text-[11px]"
          >
            {sorts.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={sort === option}
                onClick={() => setSort(option)}
                className={cn(
                  "rounded px-1.5 leading-5 text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
                  sort === option && "bg-accent text-foreground",
                )}
              >
                {FAVORITE_SORT_LABELS[option]}
              </button>
            ))}
          </div>
        )}
      </div>

      {rows.length > 0 ? (
        <ul className="divide-y divide-border/50 border-y border-border/50">
          {sorted.map((row) => (
            <Fragment key={row.id}>{row.node}</Fragment>
          ))}
        </ul>
      ) : (
        <p className="px-3 font-mono text-xs text-muted-foreground">{emptyText}</p>
      )}
    </section>
  );
}
