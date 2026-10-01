import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Server actions are tested with every I/O boundary mocked: the session
 * (`@/auth`), the user queries (`@/lib/db/user`), Stripe (`@/lib/billing`) and
 * bcrypt. Nothing here reaches Neon, and the 12-round hash cost is never paid.
 * The queries themselves are covered in `src/lib/db/user.test.ts`.
 */

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  signOut: vi.fn(),
  cancelCustomerSubscriptions: vi.fn(),
  compare: vi.fn(),
  hashPassword: vi.fn(),
  getPasswordHash: vi.fn(),
  setPasswordHash: vi.fn(),
  getAccountForDeletion: vi.fn(),
  deleteUserAccount: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth, signOut: mocks.signOut }));
vi.mock("@/lib/db/user", () => ({
  getPasswordHash: mocks.getPasswordHash,
  setPasswordHash: mocks.setPasswordHash,
  getAccountForDeletion: mocks.getAccountForDeletion,
  deleteUserAccount: mocks.deleteUserAccount,
}));
vi.mock("@/lib/password", () => ({ hashPassword: mocks.hashPassword }));
vi.mock("@/lib/billing", () => ({
  cancelCustomerSubscriptions: mocks.cancelCustomerSubscriptions,
}));
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
    expect(mocks.setPasswordHash).not.toHaveBeenCalled();
  });

  it("returns field issues for invalid input without touching the database", async () => {
    const result = await changePassword(
      {},
      formData({ currentPassword: "", password: "short", confirmPassword: "other" }),
    );

    expect(result.issues?.currentPassword).toBeDefined();
    expect(result.issues?.password).toBeDefined();
    expect(mocks.getPasswordHash).not.toHaveBeenCalled();
  });

  it("refuses a GitHub-only account rather than setting a first password", async () => {
    mocks.getPasswordHash.mockResolvedValue(null);

    const result = await changePassword({}, passwordChange);

    expect(result.error).toMatch(/GitHub/);
    expect(mocks.setPasswordHash).not.toHaveBeenCalled();
  });

  it("rejects a wrong current password", async () => {
    mocks.getPasswordHash.mockResolvedValue("stored-hash");
    mocks.compare.mockResolvedValue(false);

    const result = await changePassword({}, passwordChange);

    expect(result.issues?.currentPassword).toEqual(["That is not your current password"]);
    expect(mocks.setPasswordHash).not.toHaveBeenCalled();
  });

  it("writes the new hash for the session user", async () => {
    mocks.getPasswordHash.mockResolvedValue("stored-hash");
    mocks.compare.mockResolvedValue(true);
    mocks.hashPassword.mockResolvedValue("new-hash");

    const result = await changePassword({}, passwordChange);

    expect(result).toEqual({ success: true });
    expect(mocks.getPasswordHash).toHaveBeenCalledWith("user-1");
    expect(mocks.compare).toHaveBeenCalledWith("oldpassword", "stored-hash");
    expect(mocks.setPasswordHash).toHaveBeenCalledWith("user-1", "new-hash");
  });

  it("returns a generic error when the database fails", async () => {
    mocks.getPasswordHash.mockRejectedValue(new Error("connection lost"));

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
    expect(mocks.deleteUserAccount).not.toHaveBeenCalled();
  });

  it.each(["", "delete", "DELETE "])(
    "rejects the confirmation %j server-side",
    async (confirmation) => {
      const result = await deleteAccount({}, formData({ confirmation }));

      expect(result.error).toBe("Type DELETE to confirm.");
      expect(mocks.deleteUserAccount).not.toHaveBeenCalled();
    },
  );

  it("reports an account that no longer exists", async () => {
    mocks.getAccountForDeletion.mockResolvedValue(null);

    const result = await deleteAccount({}, confirmed);

    expect(result.error).toBe("This account no longer exists.");
    expect(mocks.deleteUserAccount).not.toHaveBeenCalled();
  });

  it("deletes the session user's account, then signs out", async () => {
    mocks.getAccountForDeletion.mockResolvedValue({
      email: "a@b.io",
      stripeCustomerId: null,
    });

    await deleteAccount({}, confirmed);

    expect(mocks.getAccountForDeletion).toHaveBeenCalledWith("user-1");
    expect(mocks.deleteUserAccount).toHaveBeenCalledWith("user-1", "a@b.io");
    expect(mocks.signOut).toHaveBeenCalledWith({ redirectTo: "/sign-in" });
    expect(mocks.deleteUserAccount.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.signOut.mock.invocationCallOrder[0],
    );
  });

  it("does not sign out when the delete fails", async () => {
    mocks.getAccountForDeletion.mockResolvedValue({
      email: "a@b.io",
      stripeCustomerId: null,
    });
    mocks.deleteUserAccount.mockRejectedValueOnce(new Error("constraint"));

    const result = await deleteAccount({}, confirmed);

    expect(result.error).toBe("Something went wrong. Please try again.");
    expect(mocks.signOut).not.toHaveBeenCalled();
  });
});

describe("deleteAccount with a Stripe customer", () => {
  const confirmed = formData({ confirmation: "DELETE" });

  it("cancels the subscriptions before deleting anything", async () => {
    mocks.getAccountForDeletion.mockResolvedValue({
      email: "a@b.io",
      stripeCustomerId: "cus_1",
    });

    await deleteAccount({}, confirmed);

    expect(mocks.cancelCustomerSubscriptions).toHaveBeenCalledWith("cus_1");
    expect(mocks.cancelCustomerSubscriptions.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.deleteUserAccount.mock.invocationCallOrder[0],
    );
  });

  it("skips Stripe for an account with no customer", async () => {
    mocks.getAccountForDeletion.mockResolvedValue({
      email: "a@b.io",
      stripeCustomerId: null,
    });

    await deleteAccount({}, confirmed);

    expect(mocks.cancelCustomerSubscriptions).not.toHaveBeenCalled();
    expect(mocks.deleteUserAccount).toHaveBeenCalled();
  });

  it("keeps the account when cancelling fails", async () => {
    mocks.getAccountForDeletion.mockResolvedValue({
      email: "a@b.io",
      stripeCustomerId: "cus_1",
    });
    mocks.cancelCustomerSubscriptions.mockRejectedValue(new Error("Stripe is down"));

    const result = await deleteAccount({}, confirmed);

    expect(result.error).toMatch(/couldn't cancel your subscription/);
    expect(mocks.deleteUserAccount).not.toHaveBeenCalled();
    expect(mocks.signOut).not.toHaveBeenCalled();
  });
});
