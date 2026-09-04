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

/**
 * The custom sign-in page. Shared so `pages.signIn` and the proxy's redirect
 * cannot drift apart — Auth.js sends its own errors here, and the proxy sends
 * anonymous requests here.
 */
export const SIGN_IN_PATH = "/sign-in";

export default {
  pages: {
    signIn: SIGN_IN_PATH,
    // Auth.js routes an error to `pages[error.kind]`. `SignInError` subclasses
    // (`CredentialsSignin`, `OAuthAccountNotLinked`) have kind `signIn`, but
    // `AccessDenied`, `Configuration` and `Verification` have kind `error` and
    // would otherwise fall back to the stock `/api/auth/error` page. Pointing
    // both at `/sign-in` keeps every failure on our own UI, where the error
    // code is turned into a message.
    error: SIGN_IN_PATH,
  },
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
