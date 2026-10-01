"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  createBillingPortalSession,
  createCheckoutSession,
  type BillingRedirectResult,
} from "@/actions/billing";
import { PendingButton } from "@/components/layout/PendingButton";
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
    <PendingButton
      variant={variant}
      size={size}
      className={className}
      pending={busy}
      pendingLabel="Redirecting..."
      onClick={() => go(() => createCheckoutSession(period))}
    >
      {label}
    </PendingButton>
  );
}

export function ManageBillingButton() {
  const { busy, go } = useStripeRedirect();

  return (
    <PendingButton
      variant="outline"
      pending={busy}
      pendingLabel="Opening..."
      onClick={() => go(createBillingPortalSession)}
    >
      Manage billing
    </PendingButton>
  );
}
