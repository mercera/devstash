import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  /**
   * Returned by `auth()`, `useSession()` and `getSession()`.
   *
   * `id` is written by the `session` callback in `src/auth.ts` from the token's
   * `sub` claim; the default `Session["user"]` only carries name/email/image.
   */
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}
