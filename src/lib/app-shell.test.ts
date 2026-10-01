import { describe, expect, it, vi } from "vitest";

import { DEFAULT_EDITOR_PREFERENCES } from "@/lib/editor-preferences";
import type { CollectionCardData } from "@/types";

/** The three getters are mocked, so nothing here reaches Neon. */

const mocks = vi.hoisted(() => ({
  getRecentCollections: vi.fn(),
  getSearchItems: vi.fn(),
  getEditorPreferences: vi.fn(),
}));

vi.mock("@/lib/db/collections", () => ({
  getRecentCollections: mocks.getRecentCollections,
}));
vi.mock("@/lib/db/items", () => ({ getSearchItems: mocks.getSearchItems }));
vi.mock("@/lib/db/user", () => ({
  getEditorPreferences: mocks.getEditorPreferences,
}));

import { loadAppShellData } from "@/lib/app-shell";

function collection(id: string, name: string, itemCount: number): CollectionCardData {
  return {
    id,
    name,
    slug: id,
    description: null,
    isFavorite: false,
    itemCount,
    accentColor: "gray",
    types: [],
  };
}

describe("loadAppShellData", () => {
  it("reads every source for the given user", async () => {
    mocks.getRecentCollections.mockResolvedValue([]);
    mocks.getSearchItems.mockResolvedValue([]);
    mocks.getEditorPreferences.mockResolvedValue(DEFAULT_EDITOR_PREFERENCES);

    await loadAppShellData("user-1");

    expect(mocks.getRecentCollections).toHaveBeenCalledWith("user-1");
    expect(mocks.getSearchItems).toHaveBeenCalledWith("user-1");
    expect(mocks.getEditorPreferences).toHaveBeenCalledWith("user-1");
  });

  it("keeps the collections in recency order and reshapes them for the picker and search", async () => {
    const collections = [
      collection("devops", "DevOps", 4),
      collection("ai", "AI Workflows", 2),
    ];
    const searchItems = [{ id: "item-1" }];
    mocks.getRecentCollections.mockResolvedValue(collections);
    mocks.getSearchItems.mockResolvedValue(searchItems);
    mocks.getEditorPreferences.mockResolvedValue(DEFAULT_EDITOR_PREFERENCES);

    const shell = await loadAppShellData("user-1");

    expect(shell.collections).toBe(collections);
    expect(shell.collectionOptions).toEqual([
      { id: "ai", name: "AI Workflows", slug: "ai" },
      { id: "devops", name: "DevOps", slug: "devops" },
    ]);
    expect(shell.searchCollections).toEqual([
      { id: "devops", name: "DevOps", slug: "devops", itemCount: 4 },
      { id: "ai", name: "AI Workflows", slug: "ai", itemCount: 2 },
    ]);
    expect(shell.searchItems).toBe(searchItems);
    expect(shell.editorPreferences).toBe(DEFAULT_EDITOR_PREFERENCES);
  });
});
