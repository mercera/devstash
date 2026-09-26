import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The database is mocked, so these tests pin who the editor preference
 * queries are scoped to and how a stored value is read back.
 */

const mocks = vi.hoisted(() => ({
  prisma: {
    user: { findUnique: vi.fn(), updateMany: vi.fn() },
  },
}));

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));

import { getEditorPreferences, updateEditorPreferences } from "@/lib/db/user";
import { DEFAULT_EDITOR_PREFERENCES } from "@/lib/editor-preferences";

const preferences = {
  fontSize: 16,
  tabSize: 8,
  wordWrap: false,
  minimap: true,
  theme: "monokai",
} as const;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getEditorPreferences", () => {
  it("reads the given user's stored preferences", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({ editorPreferences: preferences });

    await expect(getEditorPreferences("user-1")).resolves.toEqual(preferences);
    expect(mocks.prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: "user-1" },
      select: { editorPreferences: true },
    });
  });

  it("returns the defaults when nothing was saved or the row has gone", async () => {
    mocks.prisma.user.findUnique.mockResolvedValueOnce({ editorPreferences: null });
    mocks.prisma.user.findUnique.mockResolvedValueOnce(null);

    await expect(getEditorPreferences("user-1")).resolves.toEqual(
      DEFAULT_EDITOR_PREFERENCES,
    );
    await expect(getEditorPreferences("user-1")).resolves.toEqual(
      DEFAULT_EDITOR_PREFERENCES,
    );
  });
});

describe("updateEditorPreferences", () => {
  it("writes only the given user's row", async () => {
    mocks.prisma.user.updateMany.mockResolvedValue({ count: 1 });

    await expect(updateEditorPreferences("user-1", preferences)).resolves.toBe(true);
    expect(mocks.prisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { editorPreferences: preferences },
    });
  });

  it("returns false when the row has gone", async () => {
    mocks.prisma.user.updateMany.mockResolvedValue({ count: 0 });

    await expect(updateEditorPreferences("user-1", preferences)).resolves.toBe(false);
  });
});
