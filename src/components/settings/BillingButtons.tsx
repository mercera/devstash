"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  createBillingPortalSession,
  createCheckoutSession,
  type BillingRedirectResult,
} from "@/actions/billing";
import { Button } from "@/components/ui/button";
import type { BillingPeriod } from "@/lib/plans";

/** Runs a billing action and follows the Stripe-hosted URL it returns. */
function useStripeRedirect() {
  const [pending, startTransition] = useTransition();
  // Stays true after success, so the button cannot be clicked again while the
  // browser is leaving for Stripe.
  const [redirecting, setRedirecting] = useState(false);

  function go(action: () => Promise<BillingRedirectResult>) {
    startTransition(async () => {
      const result = await action();

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      setRedirecting(true);
      window.location.assign(result.data.url);
    });
  }

  return { busy: pending || redirecting, go };
}

interface UpgradeButtonProps {
  period: BillingPeriod;
  label: string;
  variant?: "default" | "outline";
  size?: "default" | "lg";
  className?: string;
}

export function UpgradeButton({
  period,
  label,
  variant = "default",
  size = "default",
  className,
}: UpgradeButtonProps) {
  const { busy, go } = useStripeRedirect();

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      disabled={busy}
      onClick={() => go(() => createCheckoutSession(period))}
    >
      {busy && <Loader2 className="animate-spin" />}
      {busy ? "Redirecting..." : label}
    </Button>
  );
}

export function ManageBillingButton() {
  const { busy, go } = useStripeRedirect();

  return (
    <Button variant="outline" disabled={busy} onClick={() => go(createBillingPortalSession)}>
      {busy && <Loader2 className="animate-spin" />}
      {busy ? "Opening..." : "Manage billing"}
    </Button>
  );
}
