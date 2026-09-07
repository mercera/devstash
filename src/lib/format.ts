/** Display formatting helpers. */

/** Short calendar date, e.g. `Jan 15`. */
export function formatShortDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * A whole number of hours, pluralised — `1 hour`, `24 hours`.
 *
 * Link lifetimes are stated in both the email and the page that asks for a new
 * link, and the two flows differ (1 hour for a reset, 24 for a verification),
 * so neither can hardcode the noun.
 */
export function formatHours(hours: number): string {
  return `${hours} ${hours === 1 ? "hour" : "hours"}`;
}

/** Full calendar date, e.g. `January 15, 2026`. */
export function formatLongDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
