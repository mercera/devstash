import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { SIGN_IN_PATH } from "@/auth.config";
import { AccountTopBar } from "@/components/layout/AccountTopBar";
import { AppProviders } from "@/components/layout/AppProviders";
import { BackButton } from "@/components/layout/BackButton";
import { loadAppShellData } from "@/lib/app-shell";
import { DASHBOARD_PATH } from "@/lib/routes";
import { getSessionUser } from "@/lib/session";

/**
 * The account shell for `/profile` and `/settings`: a top bar with only the
 * logo and the search, no sidebar, and a Back button over each page. It
 * mounts the same providers as the `(app)` shell, so search can open an item
 * in the drawer here too.
 *
 * Reads live data, so it must render per-request.
 */
export const dynamic = "force-dynamic";

export default async function AccountLayout({ children }: { children: ReactNode }) {
  const sessionUser = await getSessionUser();

  // The proxy already turns anonymous requests away.
  if (!sessionUser) {
    redirect(SIGN_IN_PATH);
  }

  const shell = await loadAppShellData(sessionUser.id);

  return (
    <AppProviders shell={shell} isPro={sessionUser.isPro}>
      <AccountTopBar
        searchItems={shell.searchItems}
        searchCollections={shell.searchCollections}
      />
      {/* Narrower than the workspace: these pages are one column of cards. */}
      <main className="min-w-0 flex-1 p-6">
        <div className="@container mx-auto flex w-full max-w-3xl flex-col gap-4">
          <BackButton fallbackHref={DASHBOARD_PATH} />
          {children}
        </div>
      </main>
    </AppProviders>
  );
}
