/** Used when a name has no letters or digits to build a slug from, e.g. "🚀". */
const FALLBACK_SLUG = "collection";

/**
 * A URL-safe slug from a display name: lowercase ASCII letters and digits
 * joined by single hyphens, with accents folded (`Café Notes` → `cafe-notes`).
 */
export function slugify(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || FALLBACK_SLUG;
}

/**
 * `base` if it is free, else the first of `base-2`, `base-3`, … that is not in
 * `taken`.
 */
export function uniqueSlug(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base;

  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) suffix += 1;

  return `${base}-${suffix}`;
}

/**
 * Whether `slug` is one `uniqueSlug` could have produced for `base` — `base`
 * itself or `base-N`. A rename that keeps the name keeps a slug like
 * `react-patterns-2` rather than moving it to `react-patterns` once that frees
 * up.
 */
export function isSlugFor(slug: string, base: string): boolean {
  return slug === base || new RegExp(`^${base}-[1-9]\\d*$`).test(slug);
}
