import type { ReactNode } from "react";
import { CalendarDays, ExternalLink, FolderOpen, Tag } from "lucide-react";

import { TypeIcon } from "@/components/dashboard/TypeIcon";
import { ItemActions } from "@/components/items/ItemActions";
import { Badge } from "@/components/ui/badge";
import { SheetTitle } from "@/components/ui/sheet";
import { formatLongDate } from "@/lib/format";
import { getAccentTileClass } from "@/lib/icons";
import { cn } from "@/lib/utils";
import type { ItemDetail } from "@/types";

/** The drawer's loaded state: header, action bar and a scrolling body. */
export function ItemDetailView({ item }: { item: ItemDetail }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-start gap-3 p-6 pr-12">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg",
            getAccentTileClass(item.type.color),
          )}
        >
          <TypeIcon type={item.type} className="size-5" />
        </span>
        <div className="flex min-w-0 flex-col gap-2">
          <SheetTitle className="text-lg font-semibold break-words">
            {item.title}
          </SheetTitle>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary">{item.type.name}</Badge>
            {item.language && <Badge variant="outline">{item.language}</Badge>}
          </div>
        </div>
      </header>

      <ItemActions item={item} />

      <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
        <ItemBody item={item} />
        <hr />
        <ItemMeta item={item} />
      </div>
    </div>
  );
}

function ItemBody({ item }: { item: ItemDetail }) {
  return (
    <>
      <Section title="Description">
        {item.description ? (
          <p>{item.description}</p>
        ) : (
          <p className="text-muted-foreground">No description.</p>
        )}
      </Section>

      {item.content && (
        <Section title="Content">
          <pre className="overflow-x-auto rounded-lg border bg-muted/40 p-4 font-mono text-[13px] leading-relaxed">
            <code>{item.content}</code>
          </pre>
        </Section>
      )}

      {item.url && (
        <Section title="URL">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex max-w-full items-center gap-1.5 text-blue-400 hover:underline"
          >
            <span className="truncate">{item.url}</span>
            <ExternalLink className="size-3.5 shrink-0" />
          </a>
        </Section>
      )}
    </>
  );
}

function ItemMeta({ item }: { item: ItemDetail }) {
  return (
    <>
      <Section title="Tags" icon={<Tag className="size-3.5" />}>
        {item.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {item.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No tags.</p>
        )}
      </Section>

      <Section title="Collections" icon={<FolderOpen className="size-3.5" />}>
        {item.collection ? (
          <div>
            <Badge variant="outline">{item.collection.name}</Badge>
          </div>
        ) : (
          <p className="text-muted-foreground">Not in a collection.</p>
        )}
      </Section>

      <Section title="Details" icon={<CalendarDays className="size-3.5" />}>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
          <dt className="text-muted-foreground">Created</dt>
          <dd className="text-right">{formatLongDate(item.createdAt)}</dd>
          <dt className="text-muted-foreground">Updated</dt>
          <dd className="text-right">{formatLongDate(item.updatedAt)}</dd>
        </dl>
      </Section>
    </>
  );
}

function Section({
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
