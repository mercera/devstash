"use client";

import { useEffect, useRef, useState } from "react";

import { UploadAbortedError, discardUpload, uploadFile } from "@/lib/upload-client";
import { checkUpload, type UploadKind, type UploadedFile } from "@/lib/uploads";

export interface InFlightUpload {
  name: string;
  size: number;
  /** 0 to 1. */
  progress: number;
}

interface UseFileUploadOptions {
  kind: UploadKind;
  /** The finished upload, owned by the form. */
  value: UploadedFile | null;
  onChange: (file: UploadedFile | null) => void;
  onUploadingChange: (uploading: boolean) => void;
}

/**
 * The upload behind `FileUpload`: checks the file against the same rules as
 * the server, sends it to R2 with progress, and keeps a local preview for an
 * image.
 *
 * `start` replaces any previous upload, discarding it on the server; `clear`
 * cancels one in flight or discards the finished one.
 */
export function useFileUpload({
  kind,
  value,
  onChange,
  onUploadingChange,
}: UseFileUploadOptions) {
  const abortRef = useRef<AbortController | null>(null);
  const [inFlight, setInFlight] = useState<InFlightUpload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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

  return { inFlight, error, previewUrl, start, clear };
}
