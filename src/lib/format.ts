/** Display formatting helpers. */

/** Short calendar date, e.g. `Jan 15`. */
export function formatShortDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
