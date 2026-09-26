/** Client-side ordering for the rows of `/favorites`. */

export const FAVORITE_SORTS = ["name", "date", "type"] as const;

export type FavoriteSort = (typeof FAVORITE_SORTS)[number];

export const DEFAULT_FAVORITE_SORT: FavoriteSort = "date";

export const FAVORITE_SORT_LABELS: Record<FavoriteSort, string> = {
  name: "Name",
  date: "Date",
  type: "Type",
};

/** What a favorites row is sorted by. Collections have no `type`. */
export interface SortableFavorite {
  id: string;
  name: string;
  date: Date;
  type?: string;
}

const collator = new Intl.Collator("en", { sensitivity: "base", numeric: true });

function byName(a: SortableFavorite, b: SortableFavorite): number {
  return collator.compare(a.name, b.name);
}

function byDateDesc(a: SortableFavorite, b: SortableFavorite): number {
  return b.date.getTime() - a.date.getTime();
}

/** Rows without a type sort after every typed row. */
function byType(a: SortableFavorite, b: SortableFavorite): number {
  if (a.type === undefined || b.type === undefined) {
    return Number(a.type === undefined) - Number(b.type === undefined);
  }
  return collator.compare(a.type, b.type);
}

function byId(a: SortableFavorite, b: SortableFavorite): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

const COMPARATORS: Record<FavoriteSort, ((a: SortableFavorite, b: SortableFavorite) => number)[]> = {
  name: [byName, byDateDesc, byId],
  date: [byDateDesc, byId],
  type: [byType, byName, byId],
};

/**
 * A sorted copy of `rows`. Name is A–Z ignoring case and accents, with numbers
 * in numeric order; date is most recently updated first; type groups by type
 * slug, A–Z within each type. `id` breaks every remaining tie, so the order
 * never depends on the input's.
 */
export function sortFavorites<T extends SortableFavorite>(
  rows: readonly T[],
  sort: FavoriteSort,
): T[] {
  const comparators = COMPARATORS[sort];

  return [...rows].sort((a, b) => {
    for (const compare of comparators) {
      const result = compare(a, b);
      if (result !== 0) return result;
    }
    return 0;
  });
}
