import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The session and the database layer are mocked, so these tests pin the
 * action's contract — who may call it, what reaches the query, and how each
 * failure is reported — not the query itself (see `src/lib/db/items.test.ts`).
 */

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  updateItem: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db/items", () => ({ updateItem: mocks.updateItem }));

import { updateItem } from "@/actions/items";

const saved = { id: "item-1", title: "Renamed" };

function signedInAs(id: string | null) {
  mocks.auth.mockResolvedValue(id ? { user: { id } } : null);
}

beforeEach(() => {
  vi.clearAllMocks();
  signedInAs("user-1");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("updateItem", () => {
  it("refuses without a session", async () => {
    signedInAs(null);

    const result = await updateItem("item-1", { title: "Renamed", tags: [] });

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
    });

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.issues?.title).toEqual(["Title is required"]);
    expect(result.issues?.url).toBeDefined();
    expect(result.issues?.tags).toBeDefined();
    expect(mocks.updateItem).not.toHaveBeenCalled();
  });

  it("rejects a missing item id", async () => {
    const result = await updateItem("", { title: "Renamed", tags: [] });

    expect(result).toEqual({ success: false, error: "This item could not be found." });
    expect(mocks.updateItem).not.toHaveBeenCalled();
  });

  it("passes the parsed payload and the session user to the query", async () => {
    mocks.updateItem.mockResolvedValue(saved);

    const result = await updateItem("item-1", {
      title: " Renamed ",
      description: "",
      tags: ["react", " react "],
    });

    expect(result).toEqual({ success: true, data: saved });
    expect(mocks.updateItem).toHaveBeenCalledWith("item-1", "user-1", {
      title: "Renamed",
      description: null,
      tags: ["react"],
    });
  });

  it("reports another user's item as not found", async () => {
    mocks.updateItem.mockResolvedValue(null);

    const result = await updateItem("someone-elses-item", {
      title: "Renamed",
      tags: [],
    });

    expect(result).toEqual({ success: false, error: "This item could not be found." });
  });

  it("returns a generic error when the database fails", async () => {
    mocks.updateItem.mockRejectedValue(new Error("connection lost"));

    const result = await updateItem("item-1", { title: "Renamed", tags: [] });

    expect(result).toEqual({
      success: false,
      error: "Something went wrong. Please try again.",
    });
  });
});
