"use client";

import { useState } from "react";
import { ExternalLink, FileText, Tag } from "lucide-react";

import { TypeIcon } from "@/components/items/TypeIcon";
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
import { formatFileSize } from "@/lib/uploads";
import { cn } from "@/lib/utils";
import type { ItemDetail, ItemDetailPatch } from "@/types";

interface ItemDetailViewProps {
  item: ItemDetail;
  onSaved: (patch: ItemDetailPatch) => void;
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
            onSaved={onSaved}
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
  const { code, upload } = getItemTypeFields(item.type.slug);

  return (
    <>
      <Section title="Description">
        {item.description ? (
          <p>{item.description}</p>
        ) : (
          <p className="text-muted-foreground">No description.</p>
        )}
      </Section>

      {item.fileUrl && (
        <Section title={upload === "image" ? "Image" : "File"}>
          <UploadedFileView item={item} image={upload === "image"} />
        </Section>
      )}

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

/**
 * An image item's picture, or a file item's name and size.
 *
 * The image loads straight from its public R2 URL. It is an `<img>`, so an
 * SVG's scripts never run, and the URL is on R2's origin rather than this one.
 */
function UploadedFileView({ item, image }: { item: ItemDetail; image: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      {image && item.fileUrl && (
        <div className="flex justify-center overflow-hidden rounded-lg border bg-muted/40">
          {/* eslint-disable-next-line @next/next/no-img-element -- user uploads on R2, any size or format; nothing to optimise */}
          <img
            src={item.fileUrl}
            alt={item.title}
            className="max-h-80 w-auto object-contain"
          />
        </div>
      )}
      <div className="flex items-center gap-3 rounded-lg border p-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
          <FileText className="size-4 text-muted-foreground" />
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{item.fileName ?? "Untitled file"}</span>
          {item.fileSize !== null && (
            <span className="text-xs text-muted-foreground">
              {formatFileSize(item.fileSize)}
            </span>
          )}
        </div>
      </div>
    </div>
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
