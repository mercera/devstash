import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { handleStripeEvent } from "@/lib/billing";
import { getStripe, getWebhookSecret } from "@/lib/stripe";

type WebhookResponse = { received: true } | { received: false; error: string };

function fail(error: string, status: number): NextResponse<WebhookResponse> {
  return NextResponse.json({ received: false, error }, { status });
}

/**
 * POST /api/webhooks/stripe
 *
 * Stripe's event endpoint. Outside the proxy matcher, since Stripe carries no
 * session: the signature is the authentication.
 *
 * The body is read as text and verified before anything else. Parsing it as
 * JSON first would change the bytes and fail the signature check.
 *
 * - 400: missing or invalid signature. Stripe does not retry a 4xx it caused.
 * - 500: an unconfigured secret or a failed sync. Stripe retries with backoff
 *   for up to three days, and a sync is safe to repeat.
 * - 200: handled, or an event type this app ignores.
 */
export async function POST(request: Request): Promise<NextResponse<WebhookResponse>> {
  const secret = getWebhookSecret();

  if (!secret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set; refusing Stripe webhook.");
    return fail("Webhook not configured.", 500);
  }

  const signature = request.headers.get("stripe-signature");

  if (!signature) return fail("Missing signature.", 400);

  const body = await request.text();
  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(body, signature, secret);
  } catch {
    return fail("Invalid signature.", 400);
  }

  try {
    await handleStripeEvent(event);
  } catch (error) {
    console.error(`Failed to handle Stripe event ${event.id} (${event.type}):`, error);
    return fail("Handler failed.", 500);
  }

  return NextResponse.json({ received: true });
}
