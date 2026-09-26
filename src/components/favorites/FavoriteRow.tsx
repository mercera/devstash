import type { ReactNode } from "react";

import { formatShortDate } from "@/lib/format";

interface FavoriteRowProps {
  icon: ReactNode;
  title: string;
  badge: string;
  date: Date;
  /**
   * The row's click target, stretched over it (`absolute inset-0`) as a
   * sibling of the content — `ItemCardButton` for an item, a link for a
   * collection. Keeps the row itself a server component.
   */
  children: ReactNode;
}

/** One dense, monospace line of the favorites list. */
export function FavoriteRow({ icon, title, badge, date, children }: FavoriteRowProps) {
  return (
    <li className="relative flex items-center gap-3 px-3 py-1.5 font-mono text-sm transition-colors hover:bg-accent/40">
      {icon}
      <span className="min-w-0 flex-1 truncate">{title}</span>
      <span className="shrink-0 rounded border border-border/60 px-1.5 text-[11px] leading-5 text-muted-foreground">
        {badge}
      </span>
      <time
        dateTime={date.toISOString()}
        className="w-14 shrink-0 text-right text-xs tabular-nums text-muted-foreground"
      >
        {formatShortDate(date)}
      </time>
      {children}
    </li>
  );
}
