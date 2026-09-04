import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
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
 *
 * The Credentials provider is a **placeholder**. It declares the fields so the
 * sign-in page can render them, but `authorize` always returns null — verifying
 * a password needs Prisma and bcrypt, neither of which may be imported here.
 * `src/auth.ts` swaps this entry for the real implementation.
 */
export const CREDENTIALS_PROVIDER_ID = "credentials";

export default {
  providers: [
    GitHub,
    Credentials({
      id: CREDENTIALS_PROVIDER_ID,
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "you@example.com" },
        password: { label: "Password", type: "password" },
      },
      authorize: () => null,
    }),
  ],
} satisfies NextAuthConfig;
