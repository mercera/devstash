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
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db/collections", () => ({
  createCollection: mocks.createCollection,
}));

import { createCollection } from "@/actions/collections";

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
