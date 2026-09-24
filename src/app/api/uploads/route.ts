import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { isFileUrlInUse } from "@/lib/db/items";
import { createUploadKey, deleteUpload, getOwnedUploadKey, putUpload } from "@/lib/r2";
import {
  UPLOAD_RULES,
  checkUpload,
  isUploadKind,
  type UploadedFile,
} from "@/lib/uploads";

type UploadResponse =
  | { success: true; data: UploadedFile }
  | { success: false; error: string };

type DiscardResponse = { success: true } | { success: false; error: string };

const SIGN_IN = "Sign in to upload files.";
const SOMETHING_WENT_WRONG = "Something went wrong. Please try again.";

/** Room for the multipart boundaries and the `kind` field around the file. */
const MULTIPART_OVERHEAD_BYTES = 64 * 1024;

/** Stored names are for display only; this just keeps a pathological one sane. */
const MAX_FILE_NAME_LENGTH = 255;

function fail<T>(error: string, status: number): NextResponse<T> {
  return NextResponse.json({ success: false, error } as T, { status });
}

/**
 * POST /api/uploads
 *
 * Stores one file for a file or image item in R2 and returns what the New Item
 * dialog sends on to `createItem`. Multipart, with `kind` (`image` | `file`)
 * and `file`.
 *
 * A route handler rather than a server action because the dialog shows upload
 * progress, which needs an `XMLHttpRequest` against a real endpoint.
 *
 * The rules in `src/lib/uploads.ts` are applied here whatever the browser
 * checked. The object is stored under the caller's own prefix with the content
 * type mapped from its extension, never the one the browser sent.
 */
export async function POST(request: Request): Promise<NextResponse<UploadResponse>> {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) return fail(SIGN_IN, 401);

  // Refuse an oversized body before buffering it. The header can lie, so the
  // file's own size is checked again below.
  const declaredLength = Number(request.headers.get("content-length"));
  const largestAllowed = Math.max(...Object.values(UPLOAD_RULES).map((rule) => rule.maxBytes));

  if (declaredLength > largestAllowed + MULTIPART_OVERHEAD_BYTES) {
    return fail("That file is too large.", 413);
  }

  let form: FormData;

  try {
    form = await request.formData();
  } catch {
    return fail("Send the file as multipart form data.", 400);
  }

  const kind = form.get("kind");
  const file = form.get("file");

  if (!isUploadKind(kind)) return fail("Choose a file or an image upload.", 400);
  if (!(file instanceof File)) return fail("Choose a file to upload.", 400);

  const check = checkUpload(kind, file);

  if (!check.ok) return fail(check.error, 422);

  try {
    const key = createUploadKey(userId, check.extension);
    const body = new Uint8Array(await file.arrayBuffer());
    const fileUrl = await putUpload(key, body, check.contentType);

    return NextResponse.json(
      {
        success: true,
        data: {
          fileUrl,
          fileName: file.name.slice(0, MAX_FILE_NAME_LENGTH),
          fileSize: file.size,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to upload file:", error);

    return fail(SOMETHING_WENT_WRONG, 500);
  }
}

/**
 * DELETE /api/uploads
 *
 * Discards an upload that never became an item — the file was removed or
 * replaced in the dialog, or the dialog was cancelled. JSON body `{ fileUrl }`.
 *
 * Only the caller's own uploads can be discarded, and only while no item
 * stores that URL: an item's file goes when the item is deleted, not before.
 * A URL that fails either check is reported as not found.
 */
export async function DELETE(request: Request): Promise<NextResponse<DiscardResponse>> {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) return fail(SIGN_IN, 401);

  let fileUrl: unknown;

  try {
    ({ fileUrl } = (await request.json()) as { fileUrl?: unknown });
  } catch {
    return fail("Send the file URL as JSON.", 400);
  }

  const key = typeof fileUrl === "string" ? getOwnedUploadKey(fileUrl, userId) : null;

  if (typeof fileUrl !== "string" || key === null) {
    return fail("This upload could not be found.", 404);
  }

  try {
    if (await isFileUrlInUse(fileUrl)) {
      return fail("This upload could not be found.", 404);
    }

    await deleteUpload(key);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to discard upload:", error);

    return fail(SOMETHING_WENT_WRONG, 500);
  }
}
