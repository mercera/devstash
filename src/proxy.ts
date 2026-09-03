import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import authConfig from "@/auth.config";

/**
 * Route protection for `/dashboard/*`.
 *
 * Next.js 16 renamed `middleware.ts` to `proxy.ts` and the exported function
 * with it — the named export must be `proxy`.
 *
 * This instantiates Auth.js from the edge-safe config only, so the Prisma
 * client and the Neon driver never enter the proxy bundle. Without an adapter
 * Auth.js defaults to JWT sessions, which is what `src/auth.ts` configures
 * explicitly, so both halves read the same cookie.
 */
const { auth } = NextAuth(authConfig);

export const proxy = auth((req) => {
  if (req.auth) {
    return NextResponse.next();
  }

  const signInUrl = new URL("/api/auth/signin", req.nextUrl.origin);
  signInUrl.searchParams.set(
    "callbackUrl",
    `${req.nextUrl.pathname}${req.nextUrl.search}`,
  );

  return NextResponse.redirect(signInUrl);
});

export const config = {
  // `:path*` matches zero or more segments, so this covers `/dashboard` itself.
  matcher: ["/dashboard/:path*"],
};
