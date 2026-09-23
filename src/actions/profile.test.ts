import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Server actions are tested with every I/O boundary mocked: the session
 * (`@/auth`), the database (`@/lib/prisma`) and bcrypt. Nothing here reaches
 * Neon, and the 12-round hash cost is never paid.
 */

const mocks = vi.hoisted(() => {
  const tx = {
    item: { deleteMany: vi.fn() },
    user: { delete: vi.fn() },
    verificationToken: { deleteMany: vi.fn() },
  };

  return {
    auth: vi.fn(),
    signOut: vi.fn(),
    compare: vi.fn(),
    hashPassword: vi.fn(),
    tx,
    prisma: {
      user: { findUnique: vi.fn(), update: vi.fn() },
      $transaction: vi.fn(async (run: (client: typeof tx) => Promise<void>) => run(tx)),
    },
  };
});

vi.mock("@/auth", () => ({ auth: mocks.auth, signOut: mocks.signOut }));
vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/password", () => ({ hashPassword: mocks.hashPassword }));
vi.mock("bcryptjs", () => ({ default: { compare: mocks.compare } }));

import { changePassword, deleteAccount } from "@/actions/profile";

function formData(fields: Record<string, string>): FormData {
  const data = new FormData();

  for (const [name, value] of Object.entries(fields)) {
    data.set(name, value);
  }

  return data;
}

const passwordChange = formData({
  currentPassword: "oldpassword",
  password: "newpassword1",
  confirmPassword: "newpassword1",
});

function signedInAs(id: string | null) {
  mocks.auth.mockResolvedValue(id ? { user: { id } } : null);
}

beforeEach(() => {
  vi.clearAllMocks();
  signedInAs("user-1");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("changePassword", () => {
  it("refuses without a session", async () => {
    signedInAs(null);

    const result = await changePassword({}, passwordChange);

    expect(result.error).toMatch(/session has expired/);
    expect(mocks.prisma.user.update).not.toHaveBeenCalled();
  });

  it("returns field issues for invalid input without touching the database", async () => {
    const result = await changePassword(
      {},
      formData({ currentPassword: "", password: "short", confirmPassword: "other" }),
    );

    expect(result.issues?.currentPassword).toBeDefined();
    expect(result.issues?.password).toBeDefined();
    expect(mocks.prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("refuses a GitHub-only account rather than setting a first password", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({ password: null });

    const result = await changePassword({}, passwordChange);

    expect(result.error).toMatch(/GitHub/);
    expect(mocks.prisma.user.update).not.toHaveBeenCalled();
  });

  it("rejects a wrong current password", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({ password: "stored-hash" });
    mocks.compare.mockResolvedValue(false);

    const result = await changePassword({}, passwordChange);

    expect(result.issues?.currentPassword).toEqual(["That is not your current password"]);
    expect(mocks.prisma.user.update).not.toHaveBeenCalled();
  });

  it("writes the new hash for the session user", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({ password: "stored-hash" });
    mocks.compare.mockResolvedValue(true);
    mocks.hashPassword.mockResolvedValue("new-hash");

    const result = await changePassword({}, passwordChange);

    expect(result).toEqual({ success: true });
    expect(mocks.compare).toHaveBeenCalledWith("oldpassword", "stored-hash");
    expect(mocks.prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { password: "new-hash" },
    });
  });

  it("returns a generic error when the database fails", async () => {
    mocks.prisma.user.findUnique.mockRejectedValue(new Error("connection lost"));

    const result = await changePassword({}, passwordChange);

    expect(result.error).toBe("Something went wrong. Please try again.");
  });
});

describe("deleteAccount", () => {
  const confirmed = formData({ confirmation: "DELETE" });

  it("refuses without a session", async () => {
    signedInAs(null);

    const result = await deleteAccount({}, confirmed);

    expect(result.error).toMatch(/session has expired/);
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });

  it.each(["", "delete", "DELETE "])(
    "rejects the confirmation %j server-side",
    async (confirmation) => {
      const result = await deleteAccount({}, formData({ confirmation }));

      expect(result.error).toBe("Type DELETE to confirm.");
      expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
    },
  );

  it("reports an account that no longer exists", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue(null);

    const result = await deleteAccount({}, confirmed);

    expect(result.error).toBe("This account no longer exists.");
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("deletes items before the user, sweeps link tokens, then signs out", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({ email: "a@b.io" });

    await deleteAccount({}, confirmed);

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
    expect(mocks.signOut).toHaveBeenCalledWith({ redirectTo: "/sign-in" });
  });

  it("does not sign out when the delete fails", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({ email: "a@b.io" });
    mocks.prisma.$transaction.mockRejectedValueOnce(new Error("constraint"));

    const result = await deleteAccount({}, confirmed);

    expect(result.error).toBe("Something went wrong. Please try again.");
    expect(mocks.signOut).not.toHaveBeenCalled();
  });
});
