import type { ReactNode } from "react";

import { HomeNav } from "@/components/home/HomeNav";
import { getSessionUser } from "@/lib/session";

/**
 * Shell for the public auth pages. A route group, so it wraps `/sign-in`,
 * `/register` and the email-link pages without adding a segment to any URL.
 * The homepage nav is fixed and 64px tall, so the top padding is the bottom's
 * 48px plus the nav's height.
 */
export default async function AuthLayout({ children }: { children: ReactNode }) {
  // Cached, so the page below reads the same session without a second lookup.
  const sessionUser = await getSessionUser();

  return (
    <>
      <HomeNav signedIn={sessionUser !== null} />
      <div className="flex min-h-full flex-1 flex-col items-center justify-center px-4 pt-28 pb-12">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </>
  );
}
