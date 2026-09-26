/**
 * Page sizes and the page-number arithmetic behind the paginated listings.
 *
 * Pages are 1-based and live in the URL as `?page=N`; page 1 is the bare path.
 */

export const ITEMS_PER_PAGE = 21;
export const COLLECTIONS_PER_PAGE = 21;

export const DASHBOARD_COLLECTIONS_LIMIT = 6;
export const DASHBOARD_RECENT_ITEMS_LIMIT = 10;

/**
 * The highest page a URL is taken at its word for. Anything above is read as
 * this, which the page then redirects to its real last page — it only keeps an
 * absurd `?page=` from becoming an absurd `OFFSET`.
 */
export const MAX_PAGE = 100_000;

/** Pages either side of the current one before the list collapses to "…". */
const SIBLING_PAGES = 1;

/** A slot in the page-number list: a page, or a gap. */
export type PageSlot = number | "ellipsis";

/**
 * The page a `?page=` search param asks for. Anything that is not a positive
 * whole number — missing, `0`, `-1`, `2.5`, `abc`, repeated — is page 1.
 */
export function parsePageParam(value: string | string[] | undefined): number {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return 1;

  const page = Number(value);

  return page < 1 ? 1 : Math.min(page, MAX_PAGE);
}

/** The Prisma `skip`/`take` for one page. */
export function getPageRange(
  page: number,
  perPage: number,
): { skip: number; take: number } {
  return { skip: (page - 1) * perPage, take: perPage };
}

/** How many pages `total` rows fill. An empty list still has one page. */
export function getTotalPages(total: number, perPage: number): number {
  return Math.max(1, Math.ceil(total / perPage));
}

/** The URL of one page of a listing. Page 1 has no query string. */
export function getPageHref(pathname: string, page: number): string {
  return page <= 1 ? pathname : `${pathname}?page=${page}`;
}

function range(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, index) => from + index);
}

/**
 * The numbered links to show: always the first and last page, the current one
 * and its neighbours, and "…" for any gap. The list is always the same length
 * once there are enough pages to need gaps, so the controls do not jump about
 * as the current page moves.
 *
 * A gap never stands in for a single page — `1 … 3` would be as long as
 * `1 2 3`, so the page is shown instead.
 */
export function getPageSlots(current: number, totalPages: number): PageSlot[] {
  // First, last, current, its siblings and two gaps.
  const slotCount = SIBLING_PAGES * 2 + 5;

  if (totalPages <= slotCount) return range(1, totalPages);

  const left = Math.max(current - SIBLING_PAGES, 1);
  const right = Math.min(current + SIBLING_PAGES, totalPages);
  const edgeRun = slotCount - 2;

  if (left <= 3) {
    return [...range(1, edgeRun), "ellipsis", totalPages];
  }

  if (right >= totalPages - 2) {
    return [1, "ellipsis", ...range(totalPages - edgeRun + 1, totalPages)];
  }

  return [1, "ellipsis", ...range(left, right), "ellipsis", totalPages];
}
