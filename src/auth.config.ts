import type { NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";

/**
 * Edge-safe half of the Auth.js config.
 *
 * This holds only what the proxy needs to recognise a session: the providers
 * and nothing that reaches for the database. The Prisma adapter and the
 * session/JWT callbacks live in `src/auth.ts`, which never gets bundled into
 * the proxy.
 *
 * GitHub reads `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` from the environment by
 * convention, so no explicit `clientId`/`clientSecret` is needed here.
 */
export default {
  providers: [GitHub],
} satisfies NextAuthConfig;
