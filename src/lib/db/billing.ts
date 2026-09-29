/**
 * Billing columns on `User`. Every write is `updateMany` with a scoped
 * `where`, so a row that has gone (a JWT outlives its user) or a customer id
 * nobody owns comes back as a count of 0 rather than a P2025.
 */

import { prisma } from "@/lib/prisma";

export interface BillingUser {
  email: string;
  name: string | null;
  isPro: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

export async function getBillingUser(userId: string): Promise<BillingUser | null> {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      name: true,
      isPro: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
    },
  });
}

/**
 * The user's own item and collection counts. `getItemStats()` is still scoped
 * to the demo user, so plan limits must never count through it.
 */
export async function getUsageCounts(userId: string): Promise<{
  itemCount: number;
  collectionCount: number;
}> {
  const [itemCount, collectionCount] = await Promise.all([
    prisma.item.count({ where: { userId } }),
    prisma.collection.count({ where: { userId } }),
  ]);

  return { itemCount, collectionCount };
}

/**
 * Stores a customer id on a user who has none yet. Returns the id the row
 * ends up holding: this one, or one a concurrent request stored first. Null
 * when the row has gone.
 */
export async function claimStripeCustomerId(
  userId: string,
  customerId: string,
): Promise<string | null> {
  await prisma.user.updateMany({
    where: { id: userId, stripeCustomerId: null },
    data: { stripeCustomerId: customerId },
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });

  return user?.stripeCustomerId ?? null;
}

/** Writes the plan for whoever owns `customerId`. False when no user does. */
export async function applySubscriptionState(
  customerId: string,
  state: { isPro: boolean; subscriptionId: string | null },
): Promise<boolean> {
  const { count } = await prisma.user.updateMany({
    where: { stripeCustomerId: customerId },
    data: { isPro: state.isPro, stripeSubscriptionId: state.subscriptionId },
  });

  return count > 0;
}
