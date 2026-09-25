"use client";

import { Check, FolderOpen } from "lucide-react";

import { FieldError } from "@/components/auth/FieldError";
import { useCollectionOptions } from "@/components/collections/CollectionOptionsProvider";
import { cn } from "@/lib/utils";

interface CollectionPickerProps {
  /** Prefix for the label id, unique per form. */
  id: string;
  selected: string[];
  onChange: (collectionIds: string[]) => void;
  disabled?: boolean;
  issues?: string[];
}

/**
 * The item forms' collection input: one toggle per collection the user has,
 * any number of them on. Selection order is not meaningful — the drawer lists
 * an item's collections by name.
 */
export function CollectionPicker({
  id,
  selected,
  onChange,
  disabled = false,
  issues,
}: CollectionPickerProps) {
  const collections = useCollectionOptions();
  const labelId = `${id}-collections`;

  function toggle(collectionId: string) {
    onChange(
      selected.includes(collectionId)
        ? selected.filter((selectedId) => selectedId !== collectionId)
        : [...selected, collectionId],
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <span id={labelId} className="text-sm font-medium text-muted-foreground">
        Collections
      </span>

      {collections.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No collections yet. Create one with New Collection.
        </p>
      ) : (
        <div
          role="group"
          aria-labelledby={labelId}
          className="flex max-h-32 flex-wrap gap-2 overflow-y-auto"
        >
          {collections.map((collection) => {
            const isSelected = selected.includes(collection.id);

            return (
              <button
                key={collection.id}
                type="button"
                aria-pressed={isSelected}
                disabled={disabled}
                onClick={() => toggle(collection.id)}
                className={cn(
                  "flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50",
                  isSelected
                    ? "border-foreground/30 bg-accent text-foreground"
                    : "border-border text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                )}
              >
                {isSelected ? (
                  <Check className="size-3.5 shrink-0" />
                ) : (
                  <FolderOpen className="size-3.5 shrink-0" />
                )}
                <span className="truncate">{collection.name}</span>
              </button>
            );
          })}
        </div>
      )}

      <FieldError messages={issues} />
    </div>
  );
}
