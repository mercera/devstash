import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The session and the database layer are mocked, so these tests pin the
 * action's contract — who may call it, what reaches the query, and how each
 * failure is reported — not the query itself (see
 * `src/lib/db/collections.test.ts`).
 */

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  createCollection: vi.fn(),
  updateCollection: vi.fn(),
  deleteCollection: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db/collections", () => ({
  createCollection: mocks.createCollection,
  updateCollection: mocks.updateCollection,
  deleteCollection: mocks.deleteCollection,
}));

import {
  createCollection,
  deleteCollection,
  updateCollection,
} from "@/actions/collections";

const saved = { id: "col-1", name: "React Patterns", slug: "react-patterns" };

function signedInAs(id: string | null) {
  mocks.auth.mockResolvedValue(id ? { user: { id } } : null);
}

beforeEach(() => {
  vi.clearAllMocks();
  signedInAs("user-1");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("createCollection", () => {
  it("refuses without a session", async () => {
    signedInAs(null);

    const result = await createCollection({ name: "React Patterns" });

    expect(result).toEqual({
      success: false,
      error: "Your session has expired. Sign in again to continue.",
    });
    expect(mocks.createCollection).not.toHaveBeenCalled();
  });

  it("returns field issues for invalid input without touching the database", async () => {
    const result = await createCollection({ name: "   ", description: "x" });

    expect(result).toEqual({
      success: false,
      error: "Please check the details you entered",
      issues: { name: ["Name is required"] },
    });
    expect(mocks.createCollection).not.toHaveBeenCalled();
  });

  it("passes the parsed payload and the session user to the query", async () => {
    mocks.createCollection.mockResolvedValue(saved);

    const result = await createCollection({
      name: " React Patterns ",
      description: "  ",
    });

    expect(result).toEqual({ success: true, data: saved });
    expect(mocks.createCollection).toHaveBeenCalledWith("user-1", {
      name: "React Patterns",
      description: null,
    });
  });

  it("reports a database error as a generic failure", async () => {
    mocks.createCollection.mockRejectedValue(new Error("connection lost"));

    const result = await createCollection({ name: "React Patterns" });

    expect(result).toEqual({
      success: false,
      error: "Something went wrong. Please try again.",
    });
    expect(console.error).toHaveBeenCalled();
  });
});

describe("updateCollection", () => {
  it("refuses without a session", async () => {
    signedInAs(null);

    const result = await updateCollection("col-1", { name: "React Hooks" });

    expect(result).toEqual({
      success: false,
      error: "Your session has expired. Sign in again to continue.",
    });
    expect(mocks.updateCollection).not.toHaveBeenCalled();
  });

  it("treats a missing id as not found", async () => {
    const result = await updateCollection("", { name: "React Hooks" });

    expect(result).toEqual({
      success: false,
      error: "This collection could not be found.",
    });
    expect(mocks.updateCollection).not.toHaveBeenCalled();
  });

  it("returns field issues for invalid input without touching the database", async () => {
    const result = await updateCollection("col-1", { name: "  " });

    expect(result).toEqual({
      success: false,
      error: "Please check the details you entered",
      issues: { name: ["Name is required"] },
    });
    expect(mocks.updateCollection).not.toHaveBeenCalled();
  });

  it("passes the session user, the id and the parsed payload to the query", async () => {
    mocks.updateCollection.mockResolvedValue(saved);

    const result = await updateCollection("col-1", {
      name: " React Hooks ",
      description: "",
    });

    expect(result).toEqual({ success: true, data: saved });
    expect(mocks.updateCollection).toHaveBeenCalledWith("user-1", "col-1", {
      name: "React Hooks",
      description: null,
    });
  });

  it("reports another user's or a deleted collection as not found", async () => {
    mocks.updateCollection.mockResolvedValue(null);

    const result = await updateCollection("col-2", { name: "React Hooks" });

    expect(result).toEqual({
      success: false,
      error: "This collection could not be found.",
    });
  });

  it("reports a database error as a generic failure", async () => {
    mocks.updateCollection.mockRejectedValue(new Error("connection lost"));

    const result = await updateCollection("col-1", { name: "React Hooks" });

    expect(result).toEqual({
      success: false,
      error: "Something went wrong. Please try again.",
    });
    expect(console.error).toHaveBeenCalled();
  });
});

describe("deleteCollection", () => {
  it("refuses without a session", async () => {
    signedInAs(null);

    const result = await deleteCollection("col-1");

    expect(result).toEqual({
      success: false,
      error: "Your session has expired. Sign in again to continue.",
    });
    expect(mocks.deleteCollection).not.toHaveBeenCalled();
  });

  it("treats a missing id as not found", async () => {
    const result = await deleteCollection("");

    expect(result.success).toBe(false);
    expect(mocks.deleteCollection).not.toHaveBeenCalled();
  });

  it("deletes the session user's collection and returns its id", async () => {
    mocks.deleteCollection.mockResolvedValue(true);

    const result = await deleteCollection("col-1");

    expect(result).toEqual({ success: true, data: { id: "col-1" } });
    expect(mocks.deleteCollection).toHaveBeenCalledWith("user-1", "col-1");
  });

  it("reports another user's or a missing collection as not found", async () => {
    mocks.deleteCollection.mockResolvedValue(false);

    const result = await deleteCollection("col-2");

    expect(result).toEqual({
      success: false,
      error: "This collection could not be found.",
    });
  });

  it("reports a database error as a generic failure", async () => {
    mocks.deleteCollection.mockRejectedValue(new Error("connection lost"));

    const result = await deleteCollection("col-1");

    expect(result).toEqual({
      success: false,
      error: "Something went wrong. Please try again.",
    });
    expect(console.error).toHaveBeenCalled();
  });
});
