"use client";

import { useState } from "react";

import { BillingPeriodToggle } from "@/components/billing/BillingPeriodToggle";
import { PlanCard } from "@/components/billing/PlanCard";
import { UpgradeButton } from "@/components/settings/BillingButtons";
import { Button } from "@/components/ui/button";
import {
  FREE_PLAN,
  FREE_PRICE_DISPLAY,
  PRO_PLAN,
  getProPriceDisplay,
  type BillingPeriod,
} from "@/lib/plans";

/**
 * The `/upgrade` plan picker: the homepage's toggle and cards, with the Free
 * card marked as the current plan and the Pro button starting Checkout for
 * the selected period.
 */
export function UpgradePlans() {
  const [period, setPeriod] = useState<BillingPeriod>("monthly");

  return (
    <>
      <div className="mb-10 flex justify-center">
        <BillingPeriodToggle value={period} onChange={setPeriod} />
      </div>

      <div className="mx-auto grid w-full max-w-3xl gap-8 sm:grid-cols-2 sm:gap-5">
        <PlanCard
          plan={FREE_PLAN}
          price={FREE_PRICE_DISPLAY}
          action={
            <Button size="lg" variant="outline" className="w-full" disabled>
              Current plan
            </Button>
          }
        />
        <PlanCard
          plan={PRO_PLAN}
          price={getProPriceDisplay(period)}
          action={
            <UpgradeButton
              period={period}
              label={period === "yearly" ? "Upgrade yearly" : "Upgrade monthly"}
              size="lg"
              className="w-full"
            />
          }
          featured
        />
      </div>
    </>
  );
}
