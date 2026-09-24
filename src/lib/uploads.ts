/**
 * The upload rules for file and image items, shared by the `FileUpload`
 * component (to refuse a bad file before sending it) and the upload route (to
 * refuse it for real).
 *
 * Client-safe on purpose: no SDK, no environment. The R2 half lives in
 * `src/lib/r2.ts`.
 */

export const UPLOAD_KINDS = ["image", "file"] as const;

export type UploadKind = (typeof UPLOAD_KINDS)[number];

export function isUploadKind(value: unknown): value is UploadKind {
  return (UPLOAD_KINDS as readonly unknown[]).includes(value);
}

/** What `POST /api/uploads` returns, and what `createItem` is sent. */
export interface UploadedFile {
  fileUrl: string;
  fileName: string;
  /** Bytes. */
  fileSize: number;
}

const MB = 1024 * 1024;

interface UploadRule {
  maxBytes: number;
  /**
   * Allowed extensions, each mapped to the content type the object is stored
   * with. The stored type comes from here rather than from the browser, which
   * sends whatever the OS associates with the extension, or nothing.
   */
  extensions: Record<string, string>;
  /** The content types a browser may report for an allowed file. */
  mimeTypes: readonly string[];
}

export const UPLOAD_RULES: Record<UploadKind, UploadRule> = {
  image: {
    maxBytes: 5 * MB,
    extensions: {
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      gif: "image/gif",
      webp: "image/webp",
      svg: "image/svg+xml",
    },
    mimeTypes: [
      "image/png",
      "image/jpeg",
      "image/gif",
      "image/webp",
      "image/svg+xml",
    ],
  },
  file: {
    maxBytes: 10 * MB,
    extensions: {
      pdf: "application/pdf",
      txt: "text/plain",
      md: "text/markdown",
      json: "application/json",
      yaml: "application/x-yaml",
      yml: "application/x-yaml",
      xml: "application/xml",
      csv: "text/csv",
      toml: "application/toml",
      ini: "text/plain",
    },
    mimeTypes: [
      "application/pdf",
      "text/plain",
      "text/markdown",
      "application/json",
      "application/x-yaml",
      "text/yaml",
      "application/xml",
      "text/xml",
      "text/csv",
      "application/toml",
    ],
  },
};

/** The lower-cased extension without its dot, or null when there is none. */
export function getFileExtension(fileName: string): string | null {
  const dot = fileName.lastIndexOf(".");

  if (dot <= 0 || dot === fileName.length - 1) return null;

  return fileName.slice(dot + 1).toLowerCase();
}

/** The `accept` attribute for a file input of this kind. */
export function getAcceptAttribute(kind: UploadKind): string {
  return Object.keys(UPLOAD_RULES[kind].extensions)
    .map((extension) => `.${extension}`)
    .join(",");
}

export interface UploadCandidate {
  name: string;
  /** The browser's reported type; empty when it did not recognise the file. */
  type: string;
  size: number;
}

/**
 * Types a browser reports when it does not really know the file, treated like
 * no type at all. Windows reports `.csv` as Excel's type whenever Excel is
 * installed.
 */
const UNKNOWN_BROWSER_TYPES = new Set([
  "",
  "application/octet-stream",
  "application/vnd.ms-excel",
]);

export type UploadCheck =
  | { ok: true; extension: string; contentType: string }
  | { ok: false; error: string };

/**
 * Whether a file may be uploaded as this kind.
 *
 * The extension decides: it must be on the list, and the stored content type
 * is the one mapped to it. The browser's type is only a cross-check — a
 * missing or generic one is accepted, since browsers report nothing for
 * extensions the OS does not know (`.toml`, often `.md` and `.yaml`), but a
 * specific type off the list is refused.
 */
export function checkUpload(kind: UploadKind, file: UploadCandidate): UploadCheck {
  const rule = UPLOAD_RULES[kind];
  const extension = getFileExtension(file.name);
  const contentType =
    extension === null ? undefined : rule.extensions[extension];

  if (extension === null || contentType === undefined) {
    return {
      ok: false,
      error: `Choose a ${Object.keys(rule.extensions).join(", ")} file.`,
    };
  }

  if (!UNKNOWN_BROWSER_TYPES.has(file.type) && !rule.mimeTypes.includes(file.type)) {
    return { ok: false, error: `.${extension} files of type ${file.type} are not supported.` };
  }

  if (file.size === 0) {
    return { ok: false, error: "That file is empty." };
  }

  if (file.size > rule.maxBytes) {
    return {
      ok: false,
      error: `${kind === "image" ? "Images" : "Files"} can be up to ${formatFileSize(rule.maxBytes)}.`,
    };
  }

  return { ok: true, extension, contentType };
}

/** `1536` → `1.5 KB`. Bytes under a kilobyte are shown whole. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;

  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;

  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }

  // One decimal, dropped when it is zero: `5 MB`, not `5.0 MB`.
  return `${Number(value.toFixed(1))} ${units[unit]}`;
}
