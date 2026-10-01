"use server";

import { getOrCreateStripeCustomer } from "@/lib/billing";
import { getBillingUser } from "@/lib/db/billing";
import { SESSION_EXPIRED, SOMETHING_WENT_WRONG } from "@/lib/messages";
import { getSessionUserId } from "@/lib/session";
import { getPriceId, getStripe } from "@/lib/stripe";
import { getBaseUrl } from "@/lib/tokens";
import { billingPeriodSchema } from "@/lib/validations/billing";

/**
 * Billing actions for the Billing card on `/settings`. Each returns a
 * Stripe-hosted URL, which the client then navigates to. Scoped to the
 * signed-in user.
 */

export type BillingRedirectResult =
  | { success: true; data: { url: string } }
  | { success: false; error: string };

export async function createCheckoutSession(
  period: unknown,
): Promise<BillingRedirectResult> {
  const userId = await getSessionUserId();

  if (!userId) {
    return { success: false, error: SESSION_EXPIRED };
  }

  const parsed = billingPeriodSchema.safeParse(period);

  if (!parsed.success) {
    return { success: false, error: "Choose monthly or yearly billing." };
  }

  try {
    const user = await getBillingUser(userId);

    if (!user) {
      return { success: false, error: SESSION_EXPIRED };
    }

    // Checked against the row, not the session, so a stale tab cannot start
    // a second subscription.
    if (user.isPro) {
      return {
        success: false,
        error: "You're already on Pro. Use Manage billing to change your plan.",
      };
    }

    const customerId = await getOrCreateStripeCustomer(userId, user);
    const baseUrl = getBaseUrl();

    const checkout = await getStripe().checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: userId,
      line_items: [{ price: getPriceId(parsed.data), quantity: 1 }],
      subscription_data: { metadata: { userId } },
      // `{CHECKOUT_SESSION_ID}` is a literal placeholder Stripe fills in.
      success_url: `${baseUrl}/settings?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/settings?checkout=cancelled`,
    });

    if (!checkout.url) {
      throw new Error("Checkout session was created without a URL.");
    }

    return { success: true, data: { url: checkout.url } };
  } catch (error) {
    console.error("Failed to start checkout:", error);
    return { success: false, error: SOMETHING_WENT_WRONG };
  }
}

export async function createBillingPortalSession(): Promise<BillingRedirectResult> {
  const userId = await getSessionUserId();

  if (!userId) {
    return { success: false, error: SESSION_EXPIRED };
  }

  try {
    const user = await getBillingUser(userId);

    if (!user?.stripeCustomerId) {
      return { success: false, error: "There is no billing account to manage yet." };
    }

    const portal = await getStripe().billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${getBaseUrl()}/settings`,
    });

    return { success: true, data: { url: portal.url } };
  } catch (error) {
    console.error("Failed to open billing portal:", error);
    return { success: false, error: SOMETHING_WENT_WRONG };
  }
}
