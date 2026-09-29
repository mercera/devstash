import type { ReactNode } from "react";

import { Checklist } from "@/components/home/Checklist";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Plan, PriceDisplay } from "@/lib/plans";
import { cn } from "@/lib/utils";

interface PlanCardProps {
  plan: Plan;
  price: PriceDisplay;
  /** The card's button, full width under the feature list. */
  action: ReactNode;
  featured?: boolean;
}

/** One plan's name, price and features, as on the homepage and `/upgrade`. */
export function PlanCard({ plan, price, action, featured = false }: PlanCardProps) {
  return (
    <div className="relative h-full">
      {featured && (
        <Badge className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
          Most Popular
        </Badge>
      )}
      <Card
        className={cn(
          "h-full gap-0 px-7 py-8 text-base",
          featured && "shadow-2xl shadow-indigo-500/20 ring-2 ring-indigo-500/60",
        )}
      >
        <h3 className="text-xl font-semibold">{plan.name}</h3>
        <p className="mt-1.5 text-muted-foreground">{plan.description}</p>
        <p className="mt-6 flex items-baseline gap-1">
          <span className="text-5xl font-bold tracking-tight">{price.amount}</span>
          <span className="text-muted-foreground">{price.period}</span>
        </p>
        {price.note && <p className="mt-0.5 text-sm text-muted-foreground">{price.note}</p>}
        <Checklist items={plan.features} className="mt-6 mb-7 flex-1 gap-2.5" />
        {action}
      </Card>
    </div>
  );
}
