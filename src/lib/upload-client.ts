import type { UploadKind, UploadedFile } from "@/lib/uploads";

/**
 * The browser side of `/api/uploads`, for the `FileUpload` component and the
 * New Item dialog.
 */

const UPLOAD_FAILED = "The upload failed. Please try again.";

export class UploadAbortedError extends Error {
  constructor() {
    super("Upload cancelled");
    this.name = "UploadAbortedError";
  }
}

/**
 * Uploads one file, reporting progress from 0 to 1.
 *
 * `XMLHttpRequest` rather than `fetch`: `fetch` has no upload progress events.
 * Rejects with the server's message on a refusal, and with
 * `UploadAbortedError` when `signal` aborts it.
 */
export function uploadFile(
  kind: UploadKind,
  file: File,
  onProgress: (fraction: number) => void,
  signal: AbortSignal,
): Promise<UploadedFile> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new UploadAbortedError());
      return;
    }

    const xhr = new XMLHttpRequest();
    const form = new FormData();
    form.append("kind", kind);
    form.append("file", file);

    const abort = () => xhr.abort();
    signal.addEventListener("abort", abort, { once: true });

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    });

    xhr.addEventListener("load", () => {
      signal.removeEventListener("abort", abort);

      const body = parseJson(xhr.responseText);

      if (xhr.status === 201 && isUploadSuccess(body)) {
        resolve(body.data);
      } else {
        reject(new Error(getErrorMessage(body) ?? UPLOAD_FAILED));
      }
    });

    xhr.addEventListener("error", () => {
      signal.removeEventListener("abort", abort);
      reject(new Error(UPLOAD_FAILED));
    });

    xhr.addEventListener("abort", () => reject(new UploadAbortedError()));

    xhr.open("POST", "/api/uploads");
    xhr.responseType = "text";
    xhr.send(form);
  });
}

/**
 * Asks the server to delete an upload that never became an item. Fire and
 * forget: `keepalive` lets it finish after the dialog, or the page, is gone,
 * and a failure only leaves an unused object behind.
 */
export function discardUpload(fileUrl: string): void {
  void fetch("/api/uploads", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileUrl }),
    keepalive: true,
  }).catch(() => undefined);
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function isUploadSuccess(
  body: unknown,
): body is { success: true; data: UploadedFile } {
  return (
    typeof body === "object" &&
    body !== null &&
    "success" in body &&
    body.success === true &&
    "data" in body
  );
}

function getErrorMessage(body: unknown): string | null {
  if (typeof body === "object" && body !== null && "error" in body) {
    return typeof body.error === "string" ? body.error : null;
  }

  return null;
}
