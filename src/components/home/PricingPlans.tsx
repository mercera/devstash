"use client";

import { useState } from "react";
import Link from "next/link";

import { Checklist } from "@/components/home/Checklist";
import { Reveal } from "@/components/home/Reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  FREE_PLAN,
  PRO_PLAN,
  formatPrice,
  getProPriceDisplay,
  getYearlySavingsPercent,
  type BillingPeriod,
  type Plan,
  type PriceDisplay,
} from "@/lib/plans";
import { BILLING_PATH, REGISTER_PATH } from "@/lib/routes";
import { cn } from "@/lib/utils";

const PERIODS: { value: BillingPeriod; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

const FREE_PRICE: PriceDisplay = { amount: formatPrice(0), period: "/forever", note: "" };

/**
 * The billing toggle and both plan cards; the toggle sets the Pro price.
 *
 * Both plans start at registration for a visitor. A signed-in user's Pro
 * button goes to the Billing card instead, where Checkout starts. The Free
 * button can stay on `/register`, which sends a signed-in user on to the
 * dashboard.
 */
export function PricingPlans({ signedIn }: { signedIn: boolean }) {
  const [period, setPeriod] = useState<BillingPeriod>("monthly");

  return (
    <>
      <Reveal className="mb-10 flex justify-center">
        <div role="group" aria-label="Billing period" className="flex rounded-full border bg-card p-1">
          {PERIODS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              aria-pressed={period === value}
              onClick={() => setPeriod(value)}
              className={cn(
                "flex items-center gap-2 rounded-full px-4 py-1.5 text-sm text-muted-foreground transition-colors",
                "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                period === value && "bg-muted text-foreground",
              )}
            >
              {label}
              {value === "yearly" && (
                <span className="text-xs font-semibold text-green-400">
                  Save {getYearlySavingsPercent()}%
                </span>
              )}
            </button>
          ))}
        </div>
      </Reveal>

      <div className="mx-auto grid max-w-3xl gap-8 sm:grid-cols-2 sm:gap-5">
        <Reveal>
          <PlanCard plan={FREE_PLAN} price={FREE_PRICE} cta="Get started" href={REGISTER_PATH} />
        </Reveal>
        <Reveal className="delay-100">
          <PlanCard
            plan={PRO_PLAN}
            price={getProPriceDisplay(period)}
            cta="Upgrade to Pro"
            href={signedIn ? BILLING_PATH : REGISTER_PATH}
            featured
          />
        </Reveal>
      </div>
    </>
  );
}

interface PlanCardProps {
  plan: Plan;
  price: PriceDisplay;
  cta: string;
  href: string;
  featured?: boolean;
}

function PlanCard({ plan, price, cta, href, featured = false }: PlanCardProps) {
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
        <Button asChild size="lg" variant={featured ? "default" : "outline"} className="w-full">
          <Link href={href}>{cta}</Link>
        </Button>
      </Card>
    </div>
  );
}
