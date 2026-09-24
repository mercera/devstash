"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { FileText, Loader2, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { UploadAbortedError, discardUpload, uploadFile } from "@/lib/upload-client";
import {
  UPLOAD_RULES,
  checkUpload,
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

interface InFlight {
  name: string;
  size: number;
  progress: number;
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
  const abortRef = useRef<AbortController | null>(null);
  const [inFlight, setInFlight] = useState<InFlight | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const rule = UPLOAD_RULES[kind];

  // An upload still running when the form goes away is abandoned.
  useEffect(() => () => abortRef.current?.abort(), []);

  // Object URLs hold the file in memory until revoked.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function clear() {
    abortRef.current?.abort();
    if (value) discardUpload(value.fileUrl);
    onChange(null);
    setPreviewUrl(null);
  }

  async function start(file: File) {
    setError(null);

    const check = checkUpload(kind, file);

    if (!check.ok) {
      setError(check.error);
      return;
    }

    clear();

    const controller = new AbortController();
    abortRef.current = controller;
    setInFlight({ name: file.name, size: file.size, progress: 0 });
    setPreviewUrl(kind === "image" ? URL.createObjectURL(file) : null);
    onUploadingChange(true);

    try {
      const uploaded = await uploadFile(
        kind,
        file,
        (progress) => setInFlight((current) => current && { ...current, progress }),
        controller.signal,
      );

      onChange(uploaded);
    } catch (reason) {
      if (reason instanceof UploadAbortedError) return;

      setError(reason instanceof Error ? reason.message : "The upload failed.");
      setPreviewUrl(null);
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setInFlight(null);
        onUploadingChange(false);
      }
    }
  }

  function handleInput(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset, so choosing the same file again still fires `change`.
    event.target.value = "";
    if (file) void start(file);
  }

  function handleDragOver(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    if (!disabled) setDragging(true);
  }

  function handleDragLeave(event: DragEvent<HTMLElement>) {
    // Moving onto a child fires `dragleave` on the zone; only leaving it counts.
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setDragging(false);
    }
  }

  function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setDragging(false);

    const file = event.dataTransfer.files[0];
    if (file && !disabled) void start(file);
  }

  const noun = kind === "image" ? "image" : "file";
  const showPreview = inFlight !== null || value !== null;

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

      {showPreview ? (
        <div
          className={cn(
            "flex flex-col gap-3 rounded-lg border p-3",
            invalid && "border-destructive",
          )}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {kind === "image" && (previewUrl ?? value?.fileUrl) && (
            <div className="flex justify-center overflow-hidden rounded-md bg-muted/40">
              {/* eslint-disable-next-line @next/next/no-img-element -- a local blob: preview; nothing to optimise */}
              <img
                src={previewUrl ?? value?.fileUrl}
                alt=""
                className="max-h-48 w-auto object-contain"
              />
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
              ) : (
                <span className="text-xs text-muted-foreground">
                  {value && formatFileSize(value.fileSize)}
                </span>
              )}
            </div>
            {!inFlight && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => inputRef.current?.click()}
                disabled={disabled}
              >
                Replace
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={clear}
              disabled={disabled}
              aria-label={inFlight ? "Cancel upload" : `Remove ${noun}`}
            >
              <X />
            </Button>
          </div>
        </div>
      ) : (
        <button
          id={id}
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
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
      )}

      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
