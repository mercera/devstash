import {
  Code,
  Link as LinkIcon,
  Search,
  Sparkles,
  StickyNote,
  Terminal,
  type LucideIcon,
} from "lucide-react";

import { Logo } from "@/components/brand/Logo";
import { getAccentTextClass, getAccentTopBorderClass } from "@/lib/icons";
import { cn } from "@/lib/utils";
import type { AccentColor } from "@/types";

const NAV: { label: string; Icon: LucideIcon; accent: AccentColor }[] = [
  { label: "Snippets", Icon: Code, accent: "blue" },
  { label: "Prompts", Icon: Sparkles, accent: "purple" },
  { label: "Commands", Icon: Terminal, accent: "orange" },
  { label: "Notes", Icon: StickyNote, accent: "yellow" },
  { label: "Links", Icon: LinkIcon, accent: "green" },
];

const CARDS: { title: string; accent: AccentColor }[] = [
  { title: "useDebounce hook", accent: "blue" },
  { title: "Code review prompt", accent: "purple" },
  { title: "Kill port 3000", accent: "orange" },
  { title: "Deploy checklist", accent: "yellow" },
  { title: "Architecture.png", accent: "pink" },
  { title: "Tailwind docs", accent: "green" },
];

/** "...with DevStash": a miniature, decorative copy of the dashboard. */
export function DashboardPreview() {
  return (
    <div
      aria-hidden
      className="flex h-75 overflow-hidden rounded-lg border bg-background text-[0.72rem]"
    >
      <div className="w-[34%] shrink-0 border-r px-2.5 py-3">
        <Logo size="xs" className="mb-3.5" />
        <p className="mb-1.5 text-[0.62rem] tracking-[0.08em] text-muted-foreground uppercase">
          Types
        </p>
        <ul>
          {NAV.map(({ label, Icon, accent }, index) => (
            <li
              key={label}
              className={cn(
                "flex items-center gap-2 rounded-md px-1.5 py-1.25 text-muted-foreground",
                index === 0 && "bg-muted text-foreground",
              )}
            >
              <Icon className={cn("size-3 shrink-0", getAccentTextClass(accent))} />
              {label}
            </li>
          ))}
        </ul>
      </div>

      <div className="min-w-0 flex-1 p-3">
        <div className="mb-3 flex h-6.5 items-center gap-1.5 rounded-md border px-2 text-muted-foreground">
          <Search className="size-3" />
          Search items...
        </div>
        <div className="grid grid-cols-2 gap-2">
          {CARDS.map(({ title, accent }) => (
            <div
              key={title}
              className={cn(
                "flex flex-col gap-1.5 rounded-md border border-t-3 bg-card p-2",
                getAccentTopBorderClass(accent),
              )}
            >
              <span className="truncate font-medium">{title}</span>
              <span className="h-1 rounded-full bg-muted" />
              <span className="h-1 w-3/5 rounded-full bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
