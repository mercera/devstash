"use client";

import { getYearlySavingsPercent, type BillingPeriod } from "@/lib/plans";
import { cn } from "@/lib/utils";

const PERIODS: { value: BillingPeriod; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

interface BillingPeriodToggleProps {
  value: BillingPeriod;
  onChange: (period: BillingPeriod) => void;
}

/** The Monthly / Yearly pill that sets the Pro price. */
export function BillingPeriodToggle({ value, onChange }: BillingPeriodToggleProps) {
  return (
    <div role="group" aria-label="Billing period" className="flex rounded-full border bg-card p-1">
      {PERIODS.map((period) => (
        <button
          key={period.value}
          type="button"
          aria-pressed={value === period.value}
          onClick={() => onChange(period.value)}
          className={cn(
            "flex items-center gap-2 rounded-full px-4 py-1.5 text-sm text-muted-foreground transition-colors",
            "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
            value === period.value && "bg-muted text-foreground",
          )}
        >
          {period.label}
          {period.value === "yearly" && (
            <span className="text-xs font-semibold text-green-400">
              Save {getYearlySavingsPercent()}%
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
