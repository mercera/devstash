import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";

import authConfig from "@/auth.config";
import { prisma } from "@/lib/prisma";

/**
 * Full Auth.js config: the edge-safe providers from `auth.config.ts` plus the
 * Prisma adapter and the callbacks that put the user id on the session.
 *
 * The adapter still persists `User` and `Account` rows, but sessions are JWTs
 * rather than `Session` rows — the split config pattern needs a strategy the
 * proxy can verify without a database round trip.
 */
export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  callbacks: {
    session({ session, token }) {
      // Auth.js already stores the user id as the `sub` claim when it mints the
      // token, so there is no `jwt` callback to add one — this just surfaces it
      // on the session where the app reads it.
      if (token.sub) {
        session.user.id = token.sub;
      }

      return session;
    },
  },
});
