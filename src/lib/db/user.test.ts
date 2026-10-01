import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The database is mocked, so these tests pin who the user queries are scoped
 * to, how a stored value is read back, and the order an account is deleted in.
 */

const mocks = vi.hoisted(() => {
  const tx = {
    item: { deleteMany: vi.fn() },
    user: { delete: vi.fn() },
    verificationToken: { deleteMany: vi.fn() },
  };

  return {
    tx,
    prisma: {
      user: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
      $transaction: vi.fn(async (run: (client: typeof tx) => Promise<void>) => run(tx)),
    },
  };
});

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));

import {
  deleteUserAccount,
  getAccountForDeletion,
  getEditorPreferences,
  getPasswordHash,
  setPasswordHash,
  updateEditorPreferences,
} from "@/lib/db/user";
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

describe("getPasswordHash", () => {
  it("reads the given user's hash", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({ password: "stored-hash" });

    await expect(getPasswordHash("user-1")).resolves.toBe("stored-hash");
    expect(mocks.prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: "user-1" },
      select: { password: true },
    });
  });

  it("returns null for a GitHub-only account or a row that has gone", async () => {
    mocks.prisma.user.findUnique.mockResolvedValueOnce({ password: null });
    mocks.prisma.user.findUnique.mockResolvedValueOnce(null);

    await expect(getPasswordHash("user-1")).resolves.toBeNull();
    await expect(getPasswordHash("user-1")).resolves.toBeNull();
  });
});

describe("setPasswordHash", () => {
  it("writes only the given user's row", async () => {
    await setPasswordHash("user-1", "new-hash");

    expect(mocks.prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { password: "new-hash" },
    });
  });
});

describe("getAccountForDeletion", () => {
  it("selects the address and the Stripe customer, not the password", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({
      email: "a@b.io",
      stripeCustomerId: "cus_1",
    });

    await expect(getAccountForDeletion("user-1")).resolves.toEqual({
      email: "a@b.io",
      stripeCustomerId: "cus_1",
    });
    expect(mocks.prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: "user-1" },
      select: { email: true, stripeCustomerId: true },
    });
  });
});

describe("deleteUserAccount", () => {
  it("deletes items before the user, then sweeps the link tokens", async () => {
    await deleteUserAccount("user-1", "a@b.io");

    const { tx } = mocks;

    expect(tx.item.deleteMany).toHaveBeenCalledWith({ where: { userId: "user-1" } });
    expect(tx.user.delete).toHaveBeenCalledWith({ where: { id: "user-1" } });
    expect(tx.item.deleteMany.mock.invocationCallOrder[0]).toBeLessThan(
      tx.user.delete.mock.invocationCallOrder[0],
    );
    expect(tx.verificationToken.deleteMany).toHaveBeenCalledWith({
      where: {
        identifier: {
          in: ["a@b.io", "email-verification:a@b.io", "password-reset:a@b.io"],
        },
      },
    });
  });

  it("propagates a failed transaction", async () => {
    mocks.prisma.$transaction.mockRejectedValueOnce(new Error("constraint"));

    await expect(deleteUserAccount("user-1", "a@b.io")).rejects.toThrow("constraint");
  });
});
