import type { ReactNode } from "react";
import Link from "next/link";
import { Layers } from "lucide-react";

/**
 * Shell for the public auth pages. A route group, so it wraps `/sign-in` and
 * `/register` without adding a segment to either URL.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <Link
          href="/"
          className="flex items-center justify-center gap-2.5"
          aria-label="DevStash home"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
            <Layers className="size-4.5 text-white" />
          </span>
          <span className="text-lg font-semibold tracking-tight">DevStash</span>
        </Link>

        {children}
      </div>
    </div>
  );
}
