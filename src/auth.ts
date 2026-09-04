import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { Provider } from "next-auth/providers";

import authConfig, { CREDENTIALS_PROVIDER_ID } from "@/auth.config";
import { EmailNotVerifiedError } from "@/lib/auth-errors";
import { prisma } from "@/lib/prisma";
import { signInSchema } from "@/lib/validations/auth";

/**
 * The real email/password provider. It replaces the placeholder from
 * `auth.config.ts`, keeping that file free of Prisma and bcrypt.
 *
 * Every failure path returns null rather than throwing, so Auth.js reports one
 * generic `CredentialsSignin` error and the response cannot be used to tell an
 * unknown email from a wrong password. Accounts created through GitHub have a
 * null `password` and so can never sign in this way.
 *
 * The single exception is an unverified address, which throws so the sign-in
 * page can say what is actually wrong. That branch is only reachable once the
 * password has already matched, so it reveals nothing on its own.
 */
const credentialsProvider = Credentials({
  id: CREDENTIALS_PROVIDER_ID,
  name: "Email and password",
  credentials: {
    email: { label: "Email", type: "email", placeholder: "you@example.com" },
    password: { label: "Password", type: "password" },
  },
  async authorize(credentials) {
    const parsed = signInSchema.safeParse(credentials);

    if (!parsed.success) {
      return null;
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        password: true,
        emailVerified: true,
      },
    });

    if (!user?.password) {
      return null;
    }

    if (!(await bcrypt.compare(password, user.password))) {
      return null;
    }

    if (!user.emailVerified) {
      throw new EmailNotVerifiedError();
    }

    return { id: user.id, name: user.name, email: user.email, image: user.image };
  },
});

function isCredentialsPlaceholder(provider: Provider): boolean {
  return typeof provider !== "function" && provider.id === CREDENTIALS_PROVIDER_ID;
}

/**
 * Full Auth.js config: the edge-safe providers from `auth.config.ts` plus the
 * Prisma adapter and the callbacks that put the user id on the session.
 *
 * The adapter still persists `User` and `Account` rows, but sessions are JWTs
 * rather than `Session` rows — the split config pattern needs a strategy the
 * proxy can verify without a database round trip. A JWT strategy is also what
 * the Credentials provider requires: it creates no `Account` row for the
 * adapter to look a session up against.
 */
export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: authConfig.providers.map((provider) =>
    isCredentialsPlaceholder(provider) ? credentialsProvider : provider,
  ),
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
