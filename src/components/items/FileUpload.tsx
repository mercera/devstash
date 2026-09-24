"use client";

import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { FileText, Loader2, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useFileUpload, type InFlightUpload } from "@/hooks/use-file-upload";
import {
  UPLOAD_RULES,
  formatFileSize,
  getAcceptAttribute,
  type UploadKind,
  type UploadedFile,
} from "@/lib/uploads";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  kind: UploadKind;
  /** Put on the drop zone, so a `<label htmlFor>` names it. */
  id: string;
  /** The finished upload, owned by the form. */
  value: UploadedFile | null;
  onChange: (file: UploadedFile | null) => void;
  /** Lets the form hold its submit while a file is still on its way. */
  onUploadingChange: (uploading: boolean) => void;
  disabled?: boolean;
  invalid?: boolean;
}

interface DropHandlers {
  onDragOver: (event: DragEvent<HTMLElement>) => void;
  onDragLeave: (event: DragEvent<HTMLElement>) => void;
  onDrop: (event: DragEvent<HTMLElement>) => void;
}

/**
 * Drag-and-drop (or click-to-browse) upload for file and image items.
 *
 * The file goes to R2 as soon as it is chosen, with a progress bar, so the
 * form's Create only has to send the result. Choosing another file, or
 * removing this one, discards the previous upload on the server.
 *
 * The browser checks the same rules as the server first, so an obviously bad
 * file is refused without sending it. Images preview from the local file.
 */
export function FileUpload({
  kind,
  id,
  value,
  onChange,
  onUploadingChange,
  disabled = false,
  invalid = false,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const upload = useFileUpload({ kind, value, onChange, onUploadingChange });

  function browse() {
    inputRef.current?.click();
  }

  function handleInput(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset, so choosing the same file again still fires `change`.
    event.target.value = "";
    if (file) void upload.start(file);
  }

  const dropHandlers: DropHandlers = {
    onDragOver(event) {
      event.preventDefault();
      if (!disabled) setDragging(true);
    },
    onDragLeave(event) {
      // Moving onto a child fires `dragleave` on the zone; only leaving it counts.
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
        setDragging(false);
      }
    },
    onDrop(event) {
      event.preventDefault();
      setDragging(false);

      const file = event.dataTransfer.files[0];
      if (file && !disabled) void upload.start(file);
    },
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept={getAcceptAttribute(kind)}
        onChange={handleInput}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden
        className="sr-only"
      />

      {upload.inFlight !== null || value !== null ? (
        <UploadPreview
          kind={kind}
          value={value}
          inFlight={upload.inFlight}
          previewUrl={upload.previewUrl}
          disabled={disabled}
          invalid={invalid}
          dropHandlers={dropHandlers}
          onBrowse={browse}
          onRemove={upload.clear}
        />
      ) : (
        <DropZone
          id={id}
          kind={kind}
          disabled={disabled}
          invalid={invalid}
          dragging={dragging}
          dropHandlers={dropHandlers}
          onBrowse={browse}
        />
      )}

      {upload.error && (
        <p role="alert" className="text-xs text-destructive">
          {upload.error}
        </p>
      )}
    </div>
  );
}

interface DropZoneProps {
  id: string;
  kind: UploadKind;
  disabled: boolean;
  invalid: boolean;
  dragging: boolean;
  dropHandlers: DropHandlers;
  onBrowse: () => void;
}

/** The empty state: a dashed target that also opens the file picker. */
function DropZone({
  id,
  kind,
  disabled,
  invalid,
  dragging,
  dropHandlers,
  onBrowse,
}: DropZoneProps) {
  const rule = UPLOAD_RULES[kind];

  return (
    <button
      id={id}
      type="button"
      onClick={onBrowse}
      {...dropHandlers}
      disabled={disabled}
      aria-describedby={`${id}-rules`}
      className={cn(
        "flex flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center transition-colors outline-none hover:bg-accent/40 focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50",
        invalid && "border-destructive",
        dragging && "border-foreground/40 bg-accent/60",
      )}
    >
      <Upload className="size-5 text-muted-foreground" />
      <span className="text-sm">
        Drop {kind === "image" ? "an image" : "a file"} here, or{" "}
        <span className="text-blue-400">browse</span>
      </span>
      <span id={`${id}-rules`} className="text-xs text-muted-foreground">
        {Object.keys(rule.extensions).join(", ").toUpperCase()} · up to{" "}
        {formatFileSize(rule.maxBytes)}
      </span>
    </button>
  );
}

interface UploadPreviewProps {
  kind: UploadKind;
  value: UploadedFile | null;
  inFlight: InFlightUpload | null;
  previewUrl: string | null;
  disabled: boolean;
  invalid: boolean;
  dropHandlers: DropHandlers;
  onBrowse: () => void;
  onRemove: () => void;
}

/**
 * The chosen file: an image preview when there is one, the name, and either
 * the progress bar or the size with Replace and Remove. Still a drop target,
 * so another file can be dropped straight onto it.
 */
function UploadPreview({
  kind,
  value,
  inFlight,
  previewUrl,
  disabled,
  invalid,
  dropHandlers,
  onBrowse,
  onRemove,
}: UploadPreviewProps) {
  const imageUrl = kind === "image" ? (previewUrl ?? value?.fileUrl) : undefined;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border p-3",
        invalid && "border-destructive",
      )}
      {...dropHandlers}
    >
      {imageUrl && (
        <div className="flex justify-center overflow-hidden rounded-md bg-muted/40">
          {/* eslint-disable-next-line @next/next/no-img-element -- a local blob: preview; nothing to optimise */}
          <img src={imageUrl} alt="" className="max-h-48 w-auto object-contain" />
        </div>
      )}

      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
          {inFlight ? (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          ) : (
            <FileText className="size-4 text-muted-foreground" />
          )}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate text-sm font-medium">
            {inFlight?.name ?? value?.fileName}
          </span>
          {inFlight ? (
            <UploadProgress inFlight={inFlight} />
          ) : (
            <span className="text-xs text-muted-foreground">
              {value && formatFileSize(value.fileSize)}
            </span>
          )}
        </div>
        {!inFlight && (
          <Button type="button" variant="ghost" size="sm" onClick={onBrowse} disabled={disabled}>
            Replace
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onRemove}
          disabled={disabled}
          aria-label={inFlight ? "Cancel upload" : `Remove ${kind === "image" ? "image" : "file"}`}
        >
          <X />
        </Button>
      </div>
    </div>
  );
}

function UploadProgress({ inFlight }: { inFlight: InFlightUpload }) {
  return (
    <div className="flex items-center gap-2">
      <progress
        value={inFlight.progress}
        max={1}
        aria-label={`Uploading ${inFlight.name}`}
        className="h-1.5 flex-1 appearance-none overflow-hidden rounded-full [&::-moz-progress-bar]:bg-primary [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:bg-primary [&::-webkit-progress-value]:transition-all"
      />
      <span className="w-9 text-right text-xs text-muted-foreground tabular-nums">
        {Math.round(inFlight.progress * 100)}%
      </span>
    </div>
  );
}
