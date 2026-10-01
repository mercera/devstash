import type { LucideIcon } from "lucide-react";

import { AccentTile } from "@/components/layout/AccentTile";
import { Card } from "@/components/ui/card";
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
      <AccentTile color={color}>
        <Icon />
      </AccentTile>
      <div className="min-w-0">
        <p className="text-2xl leading-none font-semibold tabular-nums">
          {value}
        </p>
        <p className="mt-1 text-xs leading-tight text-muted-foreground">{label}</p>
      </div>
    </Card>
  );
}
