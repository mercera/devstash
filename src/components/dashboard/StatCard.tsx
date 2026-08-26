import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { getAccentTileClass } from "@/lib/icons";
import { cn } from "@/lib/utils";
import type { AccentColor } from "@/types";

interface StatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  color: AccentColor;
}

export function StatCard({ label, value, icon: Icon, color }: StatCardProps) {
  return (
    <Card className="flex-row items-center gap-3 px-4">
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg",
          getAccentTileClass(color),
        )}
      >
        <Icon className="size-4.5" />
      </span>
      <div className="min-w-0">
        <p className="text-2xl leading-none font-semibold tabular-nums">
          {value}
        </p>
        <p className="mt-1 truncate text-xs text-muted-foreground">{label}</p>
      </div>
    </Card>
  );
}
