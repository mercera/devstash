import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The session and the database layer are mocked, so these tests pin the
 * action's contract — who may call it, what reaches the query, and how each
 * failure is reported — not the query itself (see `src/lib/db/items.test.ts`).
 */

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  countUserItems: vi.fn(),
  createItem: vi.fn(),
  updateItem: vi.fn(),
  deleteItem: vi.fn(),
  setItemFavorite: vi.fn(),
  setItemPinned: vi.fn(),
  setItemContent: vi.fn(),
  getOwnedUploadKey: vi.fn(),
  deleteUpload: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db/items", () => ({
  countUserItems: mocks.countUserItems,
  createItem: mocks.createItem,
  updateItem: mocks.updateItem,
  deleteItem: mocks.deleteItem,
  setItemFavorite: mocks.setItemFavorite,
  setItemPinned: mocks.setItemPinned,
  setItemContent: mocks.setItemContent,
}));
vi.mock("@/lib/r2", () => ({
  getOwnedUploadKey: mocks.getOwnedUploadKey,
  deleteUpload: mocks.deleteUpload,
}));

import {
  createItem,
  deleteItem,
  setItemContent,
  setItemFavorite,
  setItemPinned,
  updateItem,
} from "@/actions/items";
import { CollectionNotFoundError } from "@/lib/db/errors";

const saved = { id: "item-1", title: "Renamed" };

/** Pro by default, so the plan limits stay out of the way of other tests. */
function signedInAs(id: string | null, isPro = true) {
  mocks.auth.mockResolvedValue(id ? { user: { id, isPro } } : null);
}

beforeEach(() => {
  vi.clearAllMocks();
  signedInAs("user-1");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("createItem", () => {
  const snippet = {
    typeSlug: "snippet" as const,
    title: "useDebounce",
    tags: [],
    collectionIds: [],
  };

  it("refuses without a session", async () => {
    signedInAs(null);

    const result = await createItem(snippet);

    expect(result).toEqual({
      success: false,
      error: "Your session has expired. Sign in again to continue.",
    });
    expect(mocks.createItem).not.toHaveBeenCalled();
  });

  it("returns field issues for invalid input without touching the database", async () => {
    const result = await createItem({
      typeSlug: "link",
      title: "  ",
      url: "javascript:alert(1)",
      tags: [""],
      collectionIds: [""],
    });

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.issues?.title).toEqual(["Title is required"]);
    expect(result.issues?.url).toBeDefined();
    expect(result.issues?.tags).toBeDefined();
    expect(result.issues?.collectionIds).toBeDefined();
    expect(mocks.createItem).not.toHaveBeenCalled();
  });

  it.each(["custom", "snippets", ""])(
    "rejects the type %j without touching the database",
    async (typeSlug) => {
      // A crafted request: the dialog only ever sends the creatable slugs.
      const result = await createItem({
        ...snippet,
        typeSlug: typeSlug as "snippet",
      });

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.issues?.typeSlug).toEqual(["Choose an item type"]);
      expect(mocks.createItem).not.toHaveBeenCalled();
    },
  );

  it("passes the parsed payload and the session user to the query", async () => {
    mocks.createItem.mockResolvedValue(saved);

    const result = await createItem({
      typeSlug: "snippet",
      title: " useDebounce ",
      description: "",
      content: "  const x = 1;",
      language: " ts ",
      tags: ["react", " react ", "hooks"],
      collectionIds: ["col-1", "col-2", "col-1"],
    });

    expect(result).toEqual({ success: true, data: saved });
    expect(mocks.createItem).toHaveBeenCalledWith("user-1", {
      typeSlug: "snippet",
      title: "useDebounce",
      description: null,
      content: "  const x = 1;",
      language: "ts",
      url: null,
      contentType: "text",
      fileUrl: null,
      fileName: null,
      fileSize: null,
      tags: ["react", "hooks"],
      collectionIds: ["col-1", "col-2"],
    });
  });

  it("reports a collection the user does not own under the collections field", async () => {
    mocks.createItem.mockRejectedValue(new CollectionNotFoundError());

    const result = await createItem({ ...snippet, collectionIds: ["someone-elses"] });

    expect(result).toEqual({
      success: false,
      error: "Please check the details you entered",
      issues: {
        collectionIds: ["A chosen collection no longer exists. Reload and try again."],
      },
    });
    expect(console.error).not.toHaveBeenCalled();
  });

  it("reports a type missing from the database as unavailable", async () => {
    mocks.createItem.mockResolvedValue(null);

    const result = await createItem(snippet);

    expect(result).toEqual({
      success: false,
      error: "This item type is not available.",
    });
  });

  it("returns a generic error when the database fails", async () => {
    mocks.createItem.mockRejectedValue(new Error("connection lost"));

    const result = await createItem(snippet);

    expect(result).toEqual({
      success: false,
      error: "Something went wrong. Please try again.",
    });
  });
});

describe("updateItem", () => {
  it("refuses without a session", async () => {
    signedInAs(null);

    const result = await updateItem("item-1", { title: "Renamed", tags: [], collectionIds: [] });

    expect(result).toEqual({
      success: false,
      error: "Your session has expired. Sign in again to continue.",
    });
    expect(mocks.updateItem).not.toHaveBeenCalled();
  });

  it("returns field issues for invalid input without touching the database", async () => {
    const result = await updateItem("item-1", {
      title: "  ",
      url: "javascript:alert(1)",
      tags: ["react", ""],
      collectionIds: [],
    });

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.issues?.title).toEqual(["Title is required"]);
    expect(result.issues?.url).toBeDefined();
    expect(result.issues?.tags).toBeDefined();
    expect(mocks.updateItem).not.toHaveBeenCalled();
  });

  it("rejects a missing item id", async () => {
    const result = await updateItem("", { title: "Renamed", tags: [], collectionIds: [] });

    expect(result).toEqual({ success: false, error: "This item could not be found." });
    expect(mocks.updateItem).not.toHaveBeenCalled();
  });

  it("passes the parsed payload and the session user to the query", async () => {
    mocks.updateItem.mockResolvedValue(saved);

    const result = await updateItem("item-1", {
      title: " Renamed ",
      description: "",
      tags: ["react", " react "],
      collectionIds: ["col-2", "col-2"],
    });

    expect(result).toEqual({ success: true, data: saved });
    expect(mocks.updateItem).toHaveBeenCalledWith("item-1", "user-1", {
      title: "Renamed",
      description: null,
      tags: ["react"],
      collectionIds: ["col-2"],
    });
  });

  it("reports another user's item as not found", async () => {
    mocks.updateItem.mockResolvedValue(null);

    const result = await updateItem("someone-elses-item", {
      title: "Renamed",
      tags: [],
      collectionIds: [],
    });

    expect(result).toEqual({ success: false, error: "This item could not be found." });
  });

  it("reports a collection the user does not own under the collections field", async () => {
    mocks.updateItem.mockRejectedValue(new CollectionNotFoundError());

    const result = await updateItem("item-1", {
      title: "Renamed",
      tags: [],
      collectionIds: ["someone-elses"],
    });

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.issues?.collectionIds).toEqual([
      "A chosen collection no longer exists. Reload and try again.",
    ]);
  });

  it("returns a generic error when the database fails", async () => {
    mocks.updateItem.mockRejectedValue(new Error("connection lost"));

    const result = await updateItem("item-1", { title: "Renamed", tags: [], collectionIds: [] });

    expect(result).toEqual({
      success: false,
      error: "Something went wrong. Please try again.",
    });
  });
});

describe("deleteItem", () => {
  it("refuses without a session", async () => {
    signedInAs(null);

    const result = await deleteItem("item-1");

    expect(result).toEqual({
      success: false,
      error: "Your session has expired. Sign in again to continue.",
    });
    expect(mocks.deleteItem).not.toHaveBeenCalled();
  });

  it("rejects a missing item id", async () => {
    const result = await deleteItem("");

    expect(result).toEqual({ success: false, error: "This item could not be found." });
    expect(mocks.deleteItem).not.toHaveBeenCalled();
  });

  it("deletes as the session user and returns the id", async () => {
    mocks.deleteItem.mockResolvedValue({ deleted: true, fileUrl: null });

    const result = await deleteItem("item-1");

    expect(result).toEqual({ success: true, data: { id: "item-1" } });
    expect(mocks.deleteItem).toHaveBeenCalledWith("item-1", "user-1");
    expect(mocks.deleteUpload).not.toHaveBeenCalled();
  });

  it("reports another user's item as not found", async () => {
    mocks.deleteItem.mockResolvedValue({ deleted: false });

    const result = await deleteItem("someone-elses-item");

    expect(result).toEqual({ success: false, error: "This item could not be found." });
  });

  it("returns a generic error when the database fails", async () => {
    mocks.deleteItem.mockRejectedValue(new Error("connection lost"));

    const result = await deleteItem("item-1");

    expect(result).toEqual({
      success: false,
      error: "Something went wrong. Please try again.",
    });
  });
});

describe("setItemFavorite", () => {
  const updatedAt = new Date("2026-09-26T10:00:00Z");

  it("refuses without a session", async () => {
    signedInAs(null);

    const result = await setItemFavorite("item-1", true);

    expect(result).toEqual({
      success: false,
      error: "Your session has expired. Sign in again to continue.",
    });
    expect(mocks.setItemFavorite).not.toHaveBeenCalled();
  });

  it("rejects a missing id or a non-boolean state without touching the database", async () => {
    await expect(setItemFavorite("", true)).resolves.toEqual({
      success: false,
      error: "This item could not be found.",
    });
    await expect(
      setItemFavorite("item-1", "true" as unknown as boolean),
    ).resolves.toEqual({
      success: false,
      error: "Something went wrong. Please try again.",
    });
    expect(mocks.setItemFavorite).not.toHaveBeenCalled();
  });

  it("sets the requested state on the session user's item", async () => {
    mocks.setItemFavorite.mockResolvedValue({ isFavorite: false, updatedAt });

    const result = await setItemFavorite("item-1", false);

    expect(mocks.setItemFavorite).toHaveBeenCalledWith("item-1", "user-1", false);
    expect(result).toEqual({
      success: true,
      data: { id: "item-1", isFavorite: false, updatedAt },
    });
  });

  it("reports a missing or foreign item as not found", async () => {
    mocks.setItemFavorite.mockResolvedValue(null);

    await expect(setItemFavorite("item-2", true)).resolves.toEqual({
      success: false,
      error: "This item could not be found.",
    });
  });

  it("reports a database error generically", async () => {
    mocks.setItemFavorite.mockRejectedValue(new Error("connection lost"));

    await expect(setItemFavorite("item-1", true)).resolves.toEqual({
      success: false,
      error: "Something went wrong. Please try again.",
    });
  });
});

describe("setItemPinned", () => {
  const updatedAt = new Date("2026-09-26T10:00:00Z");

  it("refuses without a session", async () => {
    signedInAs(null);

    const result = await setItemPinned("item-1", true);

    expect(result).toEqual({
      success: false,
      error: "Your session has expired. Sign in again to continue.",
    });
    expect(mocks.setItemPinned).not.toHaveBeenCalled();
  });

  it("rejects a missing id or a non-boolean state without touching the database", async () => {
    await expect(setItemPinned("", true)).resolves.toEqual({
      success: false,
      error: "This item could not be found.",
    });
    await expect(
      setItemPinned("item-1", "true" as unknown as boolean),
    ).resolves.toEqual({
      success: false,
      error: "Something went wrong. Please try again.",
    });
    expect(mocks.setItemPinned).not.toHaveBeenCalled();
  });

  it("sets the requested state on the session user's item", async () => {
    mocks.setItemPinned.mockResolvedValue({ isPinned: true, updatedAt });

    const result = await setItemPinned("item-1", true);

    expect(mocks.setItemPinned).toHaveBeenCalledWith("item-1", "user-1", true);
    expect(result).toEqual({
      success: true,
      data: { id: "item-1", isPinned: true, updatedAt },
    });
  });

  it("reports a missing or foreign item as not found", async () => {
    mocks.setItemPinned.mockResolvedValue(null);

    await expect(setItemPinned("item-2", false)).resolves.toEqual({
      success: false,
      error: "This item could not be found.",
    });
  });

  it("reports a database error generically", async () => {
    mocks.setItemPinned.mockRejectedValue(new Error("connection lost"));

    await expect(setItemPinned("item-1", true)).resolves.toEqual({
      success: false,
      error: "Something went wrong. Please try again.",
    });
  });
});

describe("createItem plan limits", () => {
  const snippet = {
    typeSlug: "snippet" as const,
    title: "useDebounce",
    tags: [],
    collectionIds: [],
  };

  it("allows a Free user at 49 items", async () => {
    signedInAs("user-1", false);
    mocks.countUserItems.mockResolvedValue(49);
    mocks.createItem.mockResolvedValue(saved);

    const result = await createItem(snippet);

    expect(result).toEqual({ success: true, data: saved });
    expect(mocks.countUserItems).toHaveBeenCalledWith("user-1");
  });

  it("refuses a Free user at 50 items with upgradeRequired", async () => {
    signedInAs("user-1", false);
    mocks.countUserItems.mockResolvedValue(50);

    const result = await createItem(snippet);

    expect(result).toEqual({
      success: false,
      error: expect.stringContaining("50 items"),
      upgradeRequired: true,
    });
    expect(mocks.createItem).not.toHaveBeenCalled();
  });

  it("lets Pro through at 500 items without counting", async () => {
    signedInAs("user-1", true);
    mocks.createItem.mockResolvedValue(saved);

    const result = await createItem(snippet);

    expect(result.success).toBe(true);
    expect(mocks.countUserItems).not.toHaveBeenCalled();
  });

  it.each(["file", "image"] as const)("refuses a Free user a %s item", async (typeSlug) => {
    signedInAs("user-1", false);
    mocks.countUserItems.mockResolvedValue(0);

    const result = await createItem({
      typeSlug,
      title: "Upload",
      tags: [],
      collectionIds: [],
      file: {
        fileUrl: "https://r2.test/uploads/user-1/a.png",
        fileName: "a.png",
        fileSize: 10,
      },
    });

    expect(result).toEqual({
      success: false,
      error: expect.stringMatching(/Pro feature/),
      upgradeRequired: true,
    });
    expect(mocks.createItem).not.toHaveBeenCalled();
    expect(mocks.countUserItems).not.toHaveBeenCalled();
  });

  it("allows a Free user a snippet", async () => {
    signedInAs("user-1", false);
    mocks.countUserItems.mockResolvedValue(0);
    mocks.createItem.mockResolvedValue(saved);

    expect((await createItem(snippet)).success).toBe(true);
  });
});

describe("setItemContent", () => {
  const updatedAt = new Date("2026-09-30T10:00:00Z");
  const prompt = "  You are a code reviewer.\n\nReview {{code}}.";

  it("refuses without a session", async () => {
    signedInAs(null);

    await expect(setItemContent("item-1", prompt)).resolves.toEqual({
      success: false,
      error: "Your session has expired. Sign in again to continue.",
    });
    expect(mocks.setItemContent).not.toHaveBeenCalled();
  });

  it.each([
    ["blank content", "item-1", " \n ", "Something went wrong. Please try again."],
    ["non-string content", "item-1", null, "Something went wrong. Please try again."],
    ["a missing id", "", prompt, "This item could not be found."],
  ])("rejects %s without touching the database", async (_label, id, content, error) => {
    await expect(setItemContent(id, content as unknown as string)).resolves.toEqual({
      success: false,
      error,
    });
    expect(mocks.setItemContent).not.toHaveBeenCalled();
  });

  it("saves the content untrimmed on the session user's item", async () => {
    mocks.setItemContent.mockResolvedValue({ content: prompt, updatedAt });

    const result = await setItemContent("item-1", prompt);

    expect(mocks.setItemContent).toHaveBeenCalledWith("item-1", "user-1", prompt);
    expect(result).toEqual({
      success: true,
      data: { id: "item-1", content: prompt, updatedAt },
    });
  });

  it("reports a missing or foreign item as not found", async () => {
    mocks.setItemContent.mockResolvedValue(null);

    await expect(setItemContent("item-2", prompt)).resolves.toEqual({
      success: false,
      error: "This item could not be found.",
    });
  });

  it("reports a database error generically", async () => {
    mocks.setItemContent.mockRejectedValue(new Error("connection lost"));

    await expect(setItemContent("item-1", prompt)).resolves.toEqual({
      success: false,
      error: "Something went wrong. Please try again.",
    });
  });
});
