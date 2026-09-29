/**
 * The Free plan's rules: how many items and collections it allows, and which
 * item types need Pro.
 *
 * Pure and client-safe — no SDK, no Prisma, no environment — so the server
 * guards and the UI (the type picker, the sidebar's `PRO` badge) can share
 * one answer. The numbers come from `plans.ts`, which the homepage pricing
 * renders, so what is advertised and what is enforced cannot drift apart.
 */

import { FREE_COLLECTION_LIMIT, FREE_ITEM_LIMIT } from "@/lib/plans";

export const PRO_REQUIRED = "This is a Pro feature. Upgrade to Pro to use it.";

/** Item types only Pro can create: both upload-backed types. */
export const PRO_TYPE_SLUGS: ReadonlySet<string> = new Set(["file", "image"]);

export type LimitCheck = { allowed: true } | { allowed: false; error: string };

export function checkItemLimit(itemCount: number, isPro: boolean): LimitCheck {
  if (isPro || itemCount < FREE_ITEM_LIMIT) {
    return { allowed: true };
  }

  return {
    allowed: false,
    error: `The Free plan includes ${FREE_ITEM_LIMIT} items. Upgrade to Pro for unlimited items.`,
  };
}

export function checkCollectionLimit(
  collectionCount: number,
  isPro: boolean,
): LimitCheck {
  if (isPro || collectionCount < FREE_COLLECTION_LIMIT) {
    return { allowed: true };
  }

  return {
    allowed: false,
    error: `The Free plan includes ${FREE_COLLECTION_LIMIT} collections. Upgrade to Pro for unlimited collections.`,
  };
}

export function canCreateTypeSlug(slug: string, isPro: boolean): boolean {
  return isPro || !PRO_TYPE_SLUGS.has(slug);
}
