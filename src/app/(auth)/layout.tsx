import type { ReactNode } from "react";

import { Logo } from "@/components/brand/Logo";

/**
 * Shell for the public auth pages. A route group, so it wraps `/sign-in` and
 * `/register` without adding a segment to either URL.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <Logo href="/" size="lg" className="justify-center" />

        {children}
      </div>
    </div>
  );
}
