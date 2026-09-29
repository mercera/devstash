"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { BILLING_PATH } from "@/lib/routes";

interface ActionFailure {
  error: string;
  /** Set when the Free plan refused the action. */
  upgradeRequired?: true;
}

/**
 * Shows a failed action's message. When the Free plan was the reason, the
 * toast carries an "Upgrade" action to the Billing card.
 */
export function useActionErrorToast(): (failure: ActionFailure) => void {
  const router = useRouter();

  return ({ error, upgradeRequired }) => {
    if (!upgradeRequired) {
      toast.error(error);
      return;
    }

    toast.error(error, {
      action: { label: "Upgrade", onClick: () => router.push(BILLING_PATH) },
    });
  };
}
