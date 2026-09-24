import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getItemById } from "@/lib/db/items";
import { getOwnedUploadKey, getUpload } from "@/lib/r2";

type ErrorResponse = { success: false; error: string };

const NOT_FOUND = "This file could not be found.";

function fail(error: string, status: number): NextResponse<ErrorResponse> {
  return NextResponse.json({ success: false, error }, { status });
}

/**
 * `Content-Disposition` for the stored name. The quoted `filename` is an ASCII
 * fallback with anything awkward replaced; `filename*` carries the real name
 * for every browser that reads it (RFC 6266).
 */
function attachmentDisposition(fileName: string): string {
  const fallback = fileName.replace(/[^\x20-\x7e]|["\\]/g, "_");

  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

/**
 * GET /api/items/[id]/download
 *
 * Streams a file or image item's upload back from R2 as a download under its
 * original name.
 *
 * It goes through the app rather than linking to the R2 URL because a browser
 * ignores the `download` attribute on a cross-origin link — it would open the
 * file, or refuse it, instead of saving it — and reading the public URL with
 * `fetch` would need CORS configured on the bucket.
 *
 * Scoped to the signed-in user like `GET /api/items/[id]`: another user's item
 * is a 404. Always sent as an attachment with `nosniff`, so nothing a user
 * uploaded (an SVG with a script in it, say) is ever rendered on this origin.
 */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/items/[id]/download">,
): Promise<Response> {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) return fail("Sign in to download this file.", 401);

  const { id } = await params;

  try {
    const item = await getItemById(id, userId);
    const key =
      item?.fileUrl != null ? getOwnedUploadKey(item.fileUrl, userId) : null;

    if (item === null || key === null) return fail(NOT_FOUND, 404);

    const upload = await getUpload(key);

    if (upload === null) return fail(NOT_FOUND, 404);

    const headers = new Headers({
      "Content-Type": upload.contentType ?? "application/octet-stream",
      "Content-Disposition": attachmentDisposition(item.fileName ?? key),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    });

    if (upload.contentLength !== undefined) {
      headers.set("Content-Length", String(upload.contentLength));
    }

    return new Response(upload.body, { headers });
  } catch (error) {
    console.error("Failed to download file:", error);

    return fail("Something went wrong. Please try again.", 500);
  }
}
