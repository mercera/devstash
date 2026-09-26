import type { ReactNode } from "react";

interface FavoritesSectionProps {
  id: string;
  title: string;
  count: number;
  /** Shown in place of the list when `count` is zero. */
  emptyText: string;
  /** The section's `FavoriteRow`s. */
  children: ReactNode;
}

/** A labelled, counted list of favorite rows, divided by hairlines. */
export function FavoritesSection({
  id,
  title,
  count,
  emptyText,
  children,
}: FavoritesSectionProps) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <h2
        id={id}
        className="flex items-baseline gap-2 px-3 font-mono text-xs tracking-wider text-muted-foreground uppercase"
      >
        {title}
        <span className="tabular-nums">{count}</span>
      </h2>

      {count > 0 ? (
        <ul className="divide-y divide-border/50 border-y border-border/50">
          {children}
        </ul>
      ) : (
        <p className="px-3 font-mono text-xs text-muted-foreground">{emptyText}</p>
      )}
    </section>
  );
}
