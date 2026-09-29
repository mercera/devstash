import Link from "next/link";
import { Check, Lock } from "lucide-react";

import { TypeIcon } from "@/components/items/TypeIcon";
import { Button } from "@/components/ui/button";
import { getAccentTileClass } from "@/lib/icons";
import { PRO_PLAN, PRO_PRICES, formatPrice } from "@/lib/plans";
import { UPGRADE_PATH, DASHBOARD_PATH } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { ItemType } from "@/types";

interface UpgradePromptProps {
  type: Pick<ItemType, "name" | "icon" | "color">;
}

/**
 * Shown in place of a Pro-only type's list (`/items/file`, `/items/image`) to
 * a Free user. Opening an individual item elsewhere is not gated.
 */
export function UpgradePrompt({ type }: UpgradePromptProps) {
  return (
    <section className="mx-auto flex w-full max-w-md flex-col items-center gap-6 rounded-xl border bg-card p-8 text-center">
      <span
        className={cn(
          "relative flex size-14 items-center justify-center rounded-xl",
          getAccentTileClass(type.color),
        )}
      >
        <TypeIcon type={type} className="size-7" />
        <span className="absolute -right-1.5 -bottom-1.5 flex size-6 items-center justify-center rounded-full border bg-background">
          <Lock className="size-3 text-muted-foreground" />
        </span>
      </span>

      <div className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">
          {type.name} are a Pro feature
        </h2>
        <p className="text-sm text-muted-foreground">
          Upgrade to Pro to upload and browse your {type.name.toLowerCase()}.
          Pro is {formatPrice(PRO_PRICES.monthly)}/month or{" "}
          {formatPrice(PRO_PRICES.yearly)}/year.
        </p>
      </div>

      <ul className="w-full space-y-2 text-left text-sm">
        {PRO_PLAN.features.map((feature) => (
          <li key={feature} className="flex items-center gap-2">
            <Check className="size-4 shrink-0 text-green-400" />
            {feature}
          </li>
        ))}
      </ul>

      <div className="flex w-full flex-col gap-2 sm:flex-row-reverse">
        <Button asChild className="flex-1">
          <Link href={UPGRADE_PATH}>Upgrade to Pro</Link>
        </Button>
        <Button asChild variant="outline" className="flex-1">
          <Link href={DASHBOARD_PATH}>Back to dashboard</Link>
        </Button>
      </div>
    </section>
  );
}
