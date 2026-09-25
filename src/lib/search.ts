/**
 * Client-side fuzzy search for the command palette.
 *
 * The palette's data is pre-fetched with the app shell, so every keystroke is
 * ranked here in the browser with no round trip. Kept free of React so it can
 * be unit tested and shared by the server getter that builds the previews.
 */

import type { SearchCollection, SearchItem } from "@/types";

export const SEARCH_PREVIEW_LENGTH = 120;

/** How many of each group show before anything is typed, most recent first. */
export const IDLE_RESULT_LIMIT = 5;

/** How many of each group show for a query, best match first. */
export const QUERY_RESULT_LIMIT = { items: 20, collections: 10 } as const;

// Every substring match outranks every subsequence match.
const SUBSTRING_BASE = 100;
const SUBSEQUENCE_CAP = SUBSTRING_BASE - 1;

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function isWordStart(text: string, index: number): boolean {
  return index === 0 || !/[\p{L}\p{N}]/u.test(text[index - 1]);
}

/**
 * How well `query` matches `text`: 0 for no match, higher is better.
 *
 * A contiguous match scores above 100, more at the start of the text or of a
 * word, and most for the whole text. Failing that, the query's characters
 * appearing in order score by how many sit together or at word starts, less
 * the gaps between them — so `dkr` finds "Docker", ranked below "dock".
 * Case and accents are ignored.
 */
export function fuzzyScore(text: string, query: string): number {
  const haystack = normalize(text);
  const needle = normalize(query).trim();

  if (needle === "" || needle.length > haystack.length) return 0;

  const index = haystack.indexOf(needle);

  if (index !== -1) {
    if (needle.length === haystack.length) return SUBSTRING_BASE + 60;
    if (index === 0) return SUBSTRING_BASE + 40;
    return SUBSTRING_BASE + (isWordStart(haystack, index) ? 20 : 0);
  }

  let score = 0;
  let from = 0;
  let first = -1;
  let previous = -2;

  for (const char of needle) {
    const found = haystack.indexOf(char, from);

    if (found === -1) return 0;
    if (first === -1) first = found;

    score += 1;
    if (found === previous + 1) score += 3;
    if (isWordStart(haystack, found)) score += 2;

    previous = found;
    from = found + 1;
  }

  // Letters scattered across the whole text are noise, not a match.
  const gaps = previous - first + 1 - needle.length;
  const total = score - gaps * 0.5;

  return total > 0 ? Math.min(SUBSEQUENCE_CAP, total) : 0;
}

function tokenize(query: string): string[] {
  return query.trim().split(/\s+/).filter(Boolean);
}

/**
 * Scores every query word against the best of the given fields and sums them,
 * or returns 0 if any word matches none. `strict` fields only count a
 * contiguous match — fuzzy-matching a long preview would find almost any
 * short query somewhere in it.
 */
function scoreFields(
  words: string[],
  fuzzy: { text: string; weight: number }[],
  strict: string[],
): number {
  let total = 0;

  for (const word of words) {
    let best = 0;

    for (const field of fuzzy) {
      best = Math.max(best, fuzzyScore(field.text, word) * field.weight);
    }

    const needle = normalize(word);
    if (strict.some((text) => normalize(text).includes(needle))) {
      best = Math.max(best, 10);
    }

    if (best === 0) return 0;
    total += best;
  }

  return total;
}

/** Ranks entries by score, dropping non-matches. Ties keep their input order. */
function rank<T>(entries: T[], score: (entry: T) => number, limit: number): T[] {
  return entries
    .map((entry) => ({ entry, score: score(entry) }))
    .filter((scored) => scored.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((scored) => scored.entry);
}

/**
 * Filters and orders the palette's items for a query. Titles weigh most, then
 * the type's name ("snippet" finds every snippet), then a contiguous match in
 * the preview. An empty query returns the first few items unchanged, which the
 * getter orders most recently updated first.
 */
export function searchItems(items: SearchItem[], query: string): SearchItem[] {
  const words = tokenize(query);

  if (words.length === 0) return items.slice(0, IDLE_RESULT_LIMIT);

  return rank(
    items,
    (item) =>
      scoreFields(
        words,
        [
          { text: item.title, weight: 2 },
          { text: item.type.name, weight: 1 },
        ],
        item.preview === null ? [] : [item.preview],
      ),
    QUERY_RESULT_LIMIT.items,
  );
}

/** Filters and orders the palette's collections for a query, by name. */
export function searchCollections(
  collections: SearchCollection[],
  query: string,
): SearchCollection[] {
  const words = tokenize(query);

  if (words.length === 0) return collections.slice(0, IDLE_RESULT_LIMIT);

  return rank(
    collections,
    (collection) =>
      scoreFields(words, [{ text: collection.name, weight: 1 }], []),
    QUERY_RESULT_LIMIT.collections,
  );
}

/**
 * The one-line preview shown under an item in the palette: its content, else
 * its URL, file name or description, whitespace collapsed and cut to
 * `SEARCH_PREVIEW_LENGTH`. Null when the item has none of them.
 */
export function toSearchPreview(item: {
  content: string | null;
  url: string | null;
  fileName: string | null;
  description: string | null;
}): string | null {
  const source = [item.content, item.url, item.fileName, item.description]
    .map((value) => value?.replace(/\s+/g, " ").trim() ?? "")
    .find((value) => value !== "");

  if (source === undefined) return null;

  return source.length > SEARCH_PREVIEW_LENGTH
    ? `${source.slice(0, SEARCH_PREVIEW_LENGTH - 1).trimEnd()}…`
    : source;
}
