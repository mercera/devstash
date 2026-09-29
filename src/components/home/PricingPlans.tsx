"use client";

import { useState } from "react";
import Link from "next/link";

import { BillingPeriodToggle } from "@/components/billing/BillingPeriodToggle";
import { PlanCard } from "@/components/billing/PlanCard";
import { Reveal } from "@/components/home/Reveal";
import { Button } from "@/components/ui/button";
import {
  FREE_PLAN,
  FREE_PRICE_DISPLAY,
  PRO_PLAN,
  getProPriceDisplay,
  type BillingPeriod,
} from "@/lib/plans";
import { REGISTER_PATH, UPGRADE_PATH } from "@/lib/routes";

/**
 * The billing toggle and both plan cards; the toggle sets the Pro price.
 *
 * Both plans start at registration for a visitor. A signed-in user's Pro
 * button goes to `/upgrade` instead, where Checkout starts. The Free button
 * can stay on `/register`, which sends a signed-in user on to the dashboard.
 */
export function PricingPlans({ signedIn }: { signedIn: boolean }) {
  const [period, setPeriod] = useState<BillingPeriod>("monthly");

  return (
    <>
      <Reveal className="mb-10 flex justify-center">
        <BillingPeriodToggle value={period} onChange={setPeriod} />
      </Reveal>

      <div className="mx-auto grid max-w-3xl gap-8 sm:grid-cols-2 sm:gap-5">
        <Reveal>
          <PlanCard
            plan={FREE_PLAN}
            price={FREE_PRICE_DISPLAY}
            action={<PlanLink href={REGISTER_PATH} label="Get started" variant="outline" />}
          />
        </Reveal>
        <Reveal className="delay-100">
          <PlanCard
            plan={PRO_PLAN}
            price={getProPriceDisplay(period)}
            action={
              <PlanLink href={signedIn ? UPGRADE_PATH : REGISTER_PATH} label="Upgrade to Pro" />
            }
            featured
          />
        </Reveal>
      </div>
    </>
  );
}

interface PlanLinkProps {
  href: string;
  label: string;
  variant?: "default" | "outline";
}

function PlanLink({ href, label, variant = "default" }: PlanLinkProps) {
  return (
    <Button asChild size="lg" variant={variant} className="w-full">
      <Link href={href}>{label}</Link>
    </Button>
  );
}
