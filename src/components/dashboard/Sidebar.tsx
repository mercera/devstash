import Link from "next/link";
import { Layers } from "lucide-react";

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-12 shrink-0 items-center border-b border-border px-4">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <span className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
            <Layers className="size-4 text-white" />
          </span>
          <span className="text-base font-semibold tracking-tight">
            DevStash
          </span>
        </Link>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <h2 className="text-lg font-semibold">Sidebar</h2>
      </div>
    </aside>
  );
}
