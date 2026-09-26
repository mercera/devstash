import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The session and the user query are mocked; these tests pin the order of the
 * checks and who the write is scoped to.
 */

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  updateEditorPreferences: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db/user", () => ({
  updateEditorPreferences: mocks.updateEditorPreferences,
}));

import { updateEditorPreferences } from "@/actions/editor-preferences";

const preferences = {
  fontSize: 14,
  tabSize: 4,
  wordWrap: false,
  minimap: true,
  theme: "github-dark",
} as const;

function signedInAs(id: string | null) {
  mocks.auth.mockResolvedValue(id ? { user: { id } } : null);
}

beforeEach(() => {
  vi.clearAllMocks();
  signedInAs("user-1");
  mocks.updateEditorPreferences.mockResolvedValue(true);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("updateEditorPreferences", () => {
  it("refuses without a session", async () => {
    signedInAs(null);

    const result = await updateEditorPreferences(preferences);

    expect(result).toEqual({
      success: false,
      error: expect.stringMatching(/session has expired/),
    });
    expect(mocks.updateEditorPreferences).not.toHaveBeenCalled();
  });

  it("rejects an option that is not offered without touching the database", async () => {
    const result = await updateEditorPreferences({ ...preferences, fontSize: 40 });

    expect(result.success).toBe(false);
    expect(mocks.updateEditorPreferences).not.toHaveBeenCalled();
  });

  it("rejects a value that is not an object", async () => {
    const result = await updateEditorPreferences("monokai");

    expect(result.success).toBe(false);
    expect(mocks.updateEditorPreferences).not.toHaveBeenCalled();
  });

  it("saves for the session user and returns what was stored", async () => {
    const result = await updateEditorPreferences({ ...preferences, extra: "dropped" });

    expect(mocks.updateEditorPreferences).toHaveBeenCalledWith("user-1", preferences);
    expect(result).toEqual({ success: true, data: preferences });
  });

  it("reports an account whose row has gone", async () => {
    mocks.updateEditorPreferences.mockResolvedValue(false);

    const result = await updateEditorPreferences(preferences);

    expect(result).toEqual({
      success: false,
      error: "This account no longer exists.",
    });
  });

  it("returns a generic error when the database fails", async () => {
    mocks.updateEditorPreferences.mockRejectedValue(new Error("connection lost"));

    const result = await updateEditorPreferences(preferences);

    expect(result).toEqual({
      success: false,
      error: "Something went wrong. Please try again.",
    });
    expect(console.error).toHaveBeenCalled();
  });
});
