import type { ReactNode } from "react";
import { CalendarDays, FolderOpen } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { formatLongDate } from "@/lib/format";
import type { ItemDetail } from "@/types";

/**
 * Drawer sections shared by the view and edit modes. The collection and the
 * dates are display-only in both.
 */

export function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}

export function CollectionSection({ item }: { item: ItemDetail }) {
  return (
    <Section title="Collections" icon={<FolderOpen className="size-3.5" />}>
      {item.collection ? (
        <div>
          <Badge variant="outline">{item.collection.name}</Badge>
        </div>
      ) : (
        <p className="text-muted-foreground">Not in a collection.</p>
      )}
    </Section>
  );
}

export function DatesSection({ item }: { item: ItemDetail }) {
  return (
    <Section title="Details" icon={<CalendarDays className="size-3.5" />}>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
        <dt className="text-muted-foreground">Created</dt>
        <dd className="text-right">{formatLongDate(item.createdAt)}</dd>
        <dt className="text-muted-foreground">Updated</dt>
        <dd className="text-right">{formatLongDate(item.updatedAt)}</dd>
      </dl>
    </Section>
  );
}
