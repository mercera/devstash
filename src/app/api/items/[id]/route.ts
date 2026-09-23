import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getItemById } from "@/lib/db/items";
import type { ItemDetail } from "@/types";

type ItemDetailResponse =
  | { success: true; data: ItemDetail }
  | { success: false; error: string };

/**
 * GET /api/items/[id]
 *
 * The full detail for one item, fetched by the item drawer when a card is
 * clicked. Cards already carry their own summary data from the server
 * component that rendered them, so this is only paid for on demand.
 *
 * `/api/*` sits outside the proxy matcher (the proxy answers with a redirect
 * to the sign-in page, which a `fetch` caller cannot use), so the session is
 * checked here. The lookup is scoped to the signed-in user: an item that
 * belongs to someone else is a 404, never a 403, so the route does not confirm
 * that it exists.
 */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/items/[id]">,
): Promise<NextResponse<ItemDetailResponse>> {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Sign in to view this item." },
      { status: 401 },
    );
  }

  const { id } = await params;

  try {
    const item = await getItemById(id, userId);

    if (item === null) {
      return NextResponse.json(
        { success: false, error: "This item could not be found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: item });
  } catch (error) {
    console.error("Failed to load item:", error);

    return NextResponse.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
