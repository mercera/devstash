import { describe, expect, it } from "vitest";

import { sortFavorites, type SortableFavorite } from "@/lib/favorites-sort";

function row(
  id: string,
  name: string,
  date: string,
  type?: string,
): SortableFavorite {
  return { id, name, date: new Date(date), type };
}

const ids = (rows: SortableFavorite[]) => rows.map((r) => r.id);

describe("sortFavorites", () => {
  it("does not mutate the input", () => {
    const rows = [row("a", "Zeta", "2026-01-01"), row("b", "Alpha", "2026-01-02")];
    const copy = [...rows];

    sortFavorites(rows, "name");

    expect(rows).toEqual(copy);
  });

  describe("name", () => {
    it("sorts A–Z ignoring case and accents", () => {
      const rows = [
        row("1", "zsh aliases", "2026-01-01"),
        row("2", "Élan", "2026-01-01"),
        row("3", "apple", "2026-01-01"),
        row("4", "Banana", "2026-01-01"),
      ];

      expect(ids(sortFavorites(rows, "name"))).toEqual(["3", "4", "2", "1"]);
    });

    it("orders numbers numerically", () => {
      const rows = [
        row("1", "Step 10", "2026-01-01"),
        row("2", "Step 2", "2026-01-01"),
      ];

      expect(ids(sortFavorites(rows, "name"))).toEqual(["2", "1"]);
    });

    it("breaks equal names by newest first, then id", () => {
      const rows = [
        row("c", "Same", "2026-01-01"),
        row("b", "same", "2026-01-01"),
        row("a", "Same", "2026-03-01"),
      ];

      expect(ids(sortFavorites(rows, "name"))).toEqual(["a", "b", "c"]);
    });
  });

  describe("date", () => {
    it("sorts most recently updated first", () => {
      const rows = [
        row("old", "A", "2026-01-01"),
        row("new", "B", "2026-05-01"),
        row("mid", "C", "2026-03-01"),
      ];

      expect(ids(sortFavorites(rows, "date"))).toEqual(["new", "mid", "old"]);
    });

    it("breaks equal dates by id, matching the server order", () => {
      const rows = [row("b", "A", "2026-01-01"), row("a", "B", "2026-01-01")];

      expect(ids(sortFavorites(rows, "date"))).toEqual(["a", "b"]);
    });
  });

  describe("type", () => {
    it("groups by type, then A–Z by name within each type", () => {
      const rows = [
        row("1", "Zed", "2026-01-01", "snippet"),
        row("2", "Kill port", "2026-01-01", "command"),
        row("3", "Alpha", "2026-01-01", "snippet"),
        row("4", "Docs", "2026-01-01", "link"),
      ];

      expect(ids(sortFavorites(rows, "type"))).toEqual(["2", "4", "3", "1"]);
    });

    it("puts rows without a type last", () => {
      const rows = [
        row("untyped", "A", "2026-01-01"),
        row("typed", "B", "2026-01-01", "snippet"),
      ];

      expect(ids(sortFavorites(rows, "type"))).toEqual(["typed", "untyped"]);
    });
  });
});
