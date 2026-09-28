import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

/** A list with green checkmarks, used by the AI section and the plan cards. */
export function Checklist({ items, className }: { items: string[]; className?: string }) {
  return (
    <ul className={cn("grid content-start gap-3", className)}>
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3">
          <Check className="mt-1 size-4 shrink-0 text-green-400" />
          {item}
        </li>
      ))}
    </ul>
  );
}
