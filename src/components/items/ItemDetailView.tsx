"use client";

import { useState } from "react";
import { ExternalLink, Tag } from "lucide-react";

import { TypeIcon } from "@/components/dashboard/TypeIcon";
import { CodeEditor } from "@/components/items/CodeEditor";
import { ItemActions } from "@/components/items/ItemActions";
import { ItemEditForm } from "@/components/items/ItemEditForm";
import { MarkdownEditor } from "@/components/items/MarkdownEditor";
import {
  CollectionSection,
  DatesSection,
  Section,
} from "@/components/items/ItemSections";
import { Badge } from "@/components/ui/badge";
import { SheetTitle } from "@/components/ui/sheet";
import { getAccentTileClass } from "@/lib/icons";
import { getItemTypeFields } from "@/lib/item-fields";
import { cn } from "@/lib/utils";
import type { ItemDetail } from "@/types";

interface ItemDetailViewProps {
  item: ItemDetail;
  onSaved: (item: ItemDetail) => void;
  onDeleted: (id: string) => void;
}

/**
 * The drawer's loaded state: header, then either the action bar and a
 * scrolling body, or the edit form in their place.
 *
 * Edit mode is local state. It resets whenever the drawer loads an item,
 * because the loading skeleton unmounts this view, so unsaved edits never
 * carry over to the next item.
 */
export function ItemDetailView({
  item,
  onSaved,
  onDeleted,
}: ItemDetailViewProps) {
  const [editing, setEditing] = useState(false);

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

      {editing ? (
        <ItemEditForm
          item={item}
          onCancel={() => setEditing(false)}
          onSaved={(saved) => {
            setEditing(false);
            onSaved(saved);
          }}
        />
      ) : (
        <>
          <ItemActions
            item={item}
            onEdit={() => setEditing(true)}
            onDeleted={onDeleted}
          />

          <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
            <ItemBody item={item} />
            <hr />
            <TagsSection item={item} />
            <CollectionSection item={item} />
            <DatesSection item={item} />
          </div>
        </>
      )}
    </div>
  );
}

function ItemBody({ item }: { item: ItemDetail }) {
  const { code } = getItemTypeFields(item.type.slug);

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
          {code ? (
            <CodeEditor
              value={item.content}
              language={item.language}
              ariaLabel="Content"
              readOnly
            />
          ) : (
            <MarkdownEditor value={item.content} ariaLabel="Content" readOnly />
          )}
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

function TagsSection({ item }: { item: ItemDetail }) {
  return (
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
  );
}
