import type { ReactNode } from "react";

/** The dashed box shown in place of a list with nothing in it. */
export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}
