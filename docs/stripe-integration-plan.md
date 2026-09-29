# Stripe Integration Plan — DevStash Pro

How to add Stripe subscriptions for DevStash Pro ($8/month or $72/year) and
enforce the Free plan's limits. This is a plan, not an implementation. It was
written on 2026-09-29 against `main` at `789f5ae`.

**Scope:** Checkout, the Customer Portal, webhooks, `isPro` in the session, the
Billing section on `/settings`, the Free plan limits, and cleanup when an
account is deleted.

**Out of scope:** AI features, custom item types and export. None of these
exist yet; each should call the same `isPro` check when it is built (see §3.4).

---

## Contents

1. [Current state](#1-current-state)
2. [Architecture](#2-architecture)
3. [Feature gating](#3-feature-gating)
4. [Files to create](#4-files-to-create)
5. [Files to modify](#5-files-to-modify)
6. [Stripe Dashboard setup](#6-stripe-dashboard-setup)
7. [Testing checklist](#7-testing-checklist)
8. [Implementation order](#8-implementation-order)
9. [Decisions](#9-decisions)
10. [Risks and known gaps](#10-risks-and-known-gaps)

---

## 1. Current state

### 1.1 User model — billing columns already exist

`prisma/schema.prisma`:

```prisma
isPro                Boolean @default(false)
stripeCustomerId     String? @unique
stripeSubscriptionId String? @unique
```

These three columns and both unique indexes came with the initial migration
(`20260826135618_init`). **No migration is needed** for the plan below.
Subscription details (period, renewal date, cancel-at-period-end) are read
live from Stripe on `/settings` and are not stored.

`isPro` is **never read** anywhere in `src/`. Nothing in the codebase mentions
Stripe or payments except `.env.example` (see §1.4).

### 1.2 Auth and session

- **Auth.js v5 (`next-auth@5.0.0-beta.32`) with JWT sessions.** No `Session`
  rows are written.
- **`src/auth.ts` has no `jwt` callback.** Its `session` callback copies
  `token.sub` to `session.user.id`. An earlier auth phase decided on `sub`
  because `declare module "next-auth/jwt"` does not merge:
  `next-auth/jwt` is only `export * from "@auth/core/jwt"`.
- **`src/auth.config.ts` is the edge-safe half** (providers and pages only).
  The proxy (`src/proxy.ts`) creates its own `NextAuth(authConfig)`, so Prisma
  never enters the proxy bundle.
- **`src/types/next-auth.d.ts`** adds `id: string` to `Session["user"]`.
- **Nothing on the client reads the session.** No `SessionProvider` or
  `useSession` is used anywhere. Every session read happens on the server, so
  a server render after checkout is enough to show the new plan. No client
  `update()` call is needed.

**The `jwt` callback runs on every session read.** This was checked in the
installed `@auth/core/lib/actions/session.js`: with the JWT strategy, each
`auth()` call decodes the cookie, runs `callbacks.jwt({ token })`, then
`callbacks.session`, and re-encodes the cookie (lines 24–46). So the
workaround in the research notes, which reads `isPro` from the database in
`jwt`, gives a fresh value on every `auth()` call. It does not depend on
`trigger === "update"`.

The proxy's own Auth.js instance has no `jwt` callback. The default one
returns the token unchanged, so the proxy keeps the `isPro` claim and never
queries the database.

### 1.3 How user data is reached

| Where | How |
| --- | --- |
| Server actions (`src/actions/*.ts`) | `const session = await auth(); const userId = session?.user?.id;`. If there is no id, they return `SESSION_EXPIRED` |
| Server components | `getSessionUserId()` in `src/lib/session.ts`, cached with React `cache` |
| DB getters (`src/lib/db/*.ts`) | They take `userId` as a parameter. **Many list and count getters are still hardcoded to `seed-user-demo`**, including `getItemStats`, `getItemTypesWithCounts` and `getItemsByType` |
| `getCurrentUser` / `getProfileUser` | Each calls `auth()` itself |

Because of the demo-scoped getters, **limit checks must count with the
session user's id, never through `getItemStats()`** (§3.2).

### 1.4 Environment

`.env.example` ends with a bare Stripe block that has no comments:

```
STRIPE_SECRET_KEY=""
STRIPE_PUBLISHABLE_KEY=""
STRIPE_WEBHOOK_SECRET=""
STRIPE_PRICE_ID_MONTHLY=""
STRIPE_PRICE_ID_YEARLY=""
```

All five are set in both `.env` and `.env.production`. Only whether each is
set was checked; no values were read. The `stripe` package is not
installed; its current release is `22.6.2`.

Conventions to follow:

- **Read configuration per call, never at module load.** Past features hit
  this twice: a module-scope value is evaluated during `next build` and gets
  frozen into the output. `src/lib/r2.ts` (`getR2Config`) and
  `src/lib/rate-limit.ts` (a client cache keyed on credentials) are the
  patterns to copy.
- **Nothing is `NEXT_PUBLIC_`.** With Stripe-hosted Checkout the browser only
  follows a URL the server returns, so **`STRIPE_PUBLISHABLE_KEY` is not
  needed**. Keep it documented as unused, or drop it.
- The app's absolute URL comes from `getBaseUrl()` in `src/lib/tokens.ts`
  (`AUTH_URL`, falling back to `http://localhost:3000`).

### 1.5 API route and server action patterns

- **Route handlers** return `NextResponse.json({ success, data | error },
  { status })` through a small `fail(error, status)` helper. They are commented
  with a `METHOD /path` doc block and call `auth()` themselves (see
  `src/app/api/uploads/route.ts`). Use a route handler when a specific status
  code is needed or when an external caller hits it, which is the webhook's
  case.
- **Server actions** follow this order:
  1. `"use server"`
  2. message constants (`SESSION_EXPIRED`, `SOMETHING_WENT_WRONG`,
     `INVALID_INPUT`)
  3. session check
  4. Zod `safeParse`
  5. `try` around the DB call, with `console.error` and a generic message in
     `catch`
  6. return `{ success: true, data } | { success: false, error, issues? }`
- **Clients** show `result.error` with `toast.error` (sonner) and call
  `router.refresh()` after a mutation.
- **The proxy** (`src/proxy.ts`) only matches page routes. `/api/*` routes
  check auth themselves. **The webhook route must stay outside the matcher**,
  and it is by default.

### 1.6 Settings page

`src/app/settings/page.tsx`:

- server component with `force-dynamic`, outside the `(app)` shell, so it has
  no sidebar
- three `Card`s: Editor preferences, Change password (password accounts only),
  and Delete account (`border-destructive/30`)
- `getProfileUser()` plus `getEditorPreferences(userId)`, with a redirect to
  `/sign-in` when the row has gone

A **Billing** card goes between Editor preferences and Change password.

### 1.7 Existing plan data

`src/lib/plans.ts` is client-safe display data used by the homepage pricing
section:

- `FREE_ITEM_LIMIT = 50`
- `FREE_COLLECTION_LIMIT = 3`
- `PRO_PRICES = { monthly: 8, yearly: 72 }`
- `BillingPeriod`, `FREE_PLAN` / `PRO_PLAN`, `getProPriceDisplay`

Its doc comment says "nothing enforces these limits yet, and there is no
billing". **Reuse these constants.** Do not redeclare the limits.

`PricingPlans.tsx` sends both plan CTAs to `/register`.

`src/components/dashboard/Sidebar.tsx` hardcodes
`PRO_TYPE_SLUGS = new Set(["file", "image"])` for the `PRO` badge. That
matches the decision in §9: **both file and image uploads are Pro.** The
spec's plan table, and `FREE_PLAN` / `PRO_PLAN` in `src/lib/plans.ts`, still
list "Image uploads" under Free, so they need updating (§5.11, §5.13).

---

## 2. Architecture

```
          ┌────────────── /settings (Billing card) ───────────────┐
          │ Upgrade monthly / yearly         Manage billing       │
          └──────┬───────────────────────────────────┬────────────┘
                 │ createCheckoutSession(period)     │ createBillingPortalSession()
                 ▼  (server action → { url })        ▼
        getOrCreateStripeCustomer ──► Stripe Checkout / Customer Portal (hosted)
                 │                                   │
                 │  success_url: /settings?checkout=success&session_id=…
                 ▼                                   ▼
   /settings render ──syncCheckoutSession──┐   Stripe ──webhook──► POST /api/webhooks/stripe
                                           ▼                         │ constructEvent (raw body)
                                syncCustomerSubscription(customerId) ◄┘
                                           │ subscriptions.list({ customer, status: "all" })
                                           ▼
                            User.isPro / stripeSubscriptionId  (updateMany by stripeCustomerId)
                                           │
                                           ▼
             jwt callback reads isPro on every auth() → session.user.isPro
```

Design choices:

1. **Create the Stripe customer before Checkout** and store
   `stripeCustomerId` right away. Checkout is then created with `customer`,
   so every later event can be matched to a user by customer id alone. There
   is never a customer the app does not know about, and a user who upgrades
   twice reuses one customer.
2. **Webhooks are signals, not data.** The handler does not trust the event
   payload's subscription state. It re-reads the customer's subscriptions from
   Stripe and writes the result. Processing is therefore:
   - **order-independent**: an old `updated` event arriving after `deleted`
     cannot flip `isPro` back on
   - **idempotent**: a replayed event writes the same thing again
   - **version-tolerant**: the only fields read from the event are
     `customer` and `mode`, which are stable across API versions
   - **safe with more than one subscription**: the customer is Pro if any
     subscription grants it

   The cost is one Stripe API call per relevant event.
3. **The success page syncs too.** `/settings?checkout=success&session_id=…`
   retrieves that Checkout Session, checks that it belongs to the signed-in
   user, and runs the same sync before rendering. The user sees Pro straight
   away even if the webhook has not arrived yet. The webhook is still the
   source of truth for everything that happens later (renewals, cancellations,
   failed payments, portal changes).
4. **`isPro` reaches the session through the `jwt` callback** (§5.1), so every
   `auth()` call has the current database value. Server actions can trust
   `session.user.isPro` without another query.
5. **All Stripe calls are server-side.** No Stripe.js and no publishable key.

---

## 3. Feature gating

### 3.1 What each plan gets

| Capability | Free | Pro | Where it is enforced |
| --- | --- | --- | --- |
| Items | 50 | Unlimited | `createItem` action |
| Collections | 3 | Unlimited | `createCollection` action |
| Image uploads (`kind: "image"`) | ❌ | ✅ | `POST /api/uploads` **and** `createItem` (`typeSlug: "image"`) |
| File uploads (`kind: "file"`) | ❌ | ✅ | `POST /api/uploads` **and** `createItem` (`typeSlug: "file"`) |
| Custom item types | ❌ | ✅ | Not built yet; gate the future create action |
| AI features | ❌ | ✅ | Not built yet; gate each AI action |
| Export (JSON/ZIP) | ❌ | ✅ | Not built yet; gate the export route |

### 3.2 Where counts are checked

**Count checks do not exist anywhere yet.** Add them at the two create
actions only:

- **`createItem`** in `src/actions/items.ts`: after Zod, before
  `createItemRecord`, when `!isPro`, run
  `prisma.item.count({ where: { userId } })` and refuse at
  `>= FREE_ITEM_LIMIT`.
- **`createCollection`** in `src/actions/collections.ts`: the same with
  `prisma.collection.count` and `FREE_COLLECTION_LIMIT`.

Pro users skip the count query entirely.

Notes:

- **Count by session user id.** `getItemStats()` is demo-scoped and would
  gate every account on the demo user's 24 items.
- **The check is not atomic.** Two creates at the same moment at 49 items can
  both pass, giving 51. That is acceptable for a soft plan limit. A
  serializable transaction or a counter column would close the gap, but it is
  not worth it here.
- **A downgrade keeps existing data.** A former Pro user with 200 items and 10
  collections keeps all of it and can still read, edit, delete, favorite and
  download it. Only *creating* new items or collections is refused until they
  are back under the limit. Existing file and image items stay viewable and
  downloadable. The Images gallery and the Files list still render them.
- **Edit is not gated.** Editing an existing item is always allowed. That
  includes file and image items, because edit mode never changes the file.
- **The demo account is Free.** `seed-user-demo` has `isPro = false` and
  already holds image items. Once gating lands it can no longer create
  file or image items. To demo those, set `isPro: true` on the demo user in
  `prisma/seed.ts`. The account then shows Pro with no subscription and no
  Stripe customer. The Billing card should handle that case: show "Pro"
  without a renewal date or a Manage billing button.

### 3.3 How the UI surfaces a refusal

- Action results gain an optional flag:
  `{ success: false, error, upgradeRequired?: true }`
- `NewItemForm` and `NewCollectionDialog` already
  `toast.error(result.error)`. When `upgradeRequired` is set, add a sonner
  `action: { label: "Upgrade", onClick: () => router.push("/settings") }`.
- In the New Item dialog's type picker, show the **File** and **Image** types
  with a small `PRO` badge for Free users, disabled with an explanatory
  `title`. The
  server still refuses; the UI state is only a convenience. `TopBar` and the
  per-type page need `isPro`, which `(app)/layout.tsx` passes from the
  session (§5.9).
- The sidebar's `PRO` badge reads from the shared constant (§4.3) instead of
  its own set.

### 3.4 Future Pro features

Every future Pro-only action or route should start with the same guard:

```ts
if (!session.user.isPro) {
  return { success: false, error: PRO_REQUIRED, upgradeRequired: true };
}
```

`PRO_REQUIRED` lives in `src/lib/entitlements.ts` (§4.3).

---

## 4. Files to create

### 4.0 Dependency

```bash
npm install stripe
```

`stripe@22.x`. **Do not pass `apiVersion`.** Each SDK version pins the API
version its TypeScript types describe, so leaving it unset keeps types and
responses in step.

Since the 2025-03-31 ("basil") API version, **`current_period_start` and
`current_period_end` are no longer on the Subscription object.** Read them
from `subscription.items.data[n].current_period_end`. Older tutorials that
read `subscription.current_period_end` will not typecheck.

### 4.1 `src/lib/stripe.ts` — client and configuration (server only)

```ts
import Stripe from "stripe";

import type { BillingPeriod } from "@/lib/plans";

/**
 * The Stripe client and the two Pro price ids.
 *
 * Configuration is read per call, never at module load: a module-scope client
 * would be built while `next build` collects page data, freezing the build
 * machine's environment into the output. The client is cached on its key so a
 * changed key drops it rather than reusing it.
 *
 * No `apiVersion` is passed. The SDK pins the version its types describe.
 */

let cached: { key: string; client: Stripe } | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;

  if (!key) {
    throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY.");
  }

  if (cached?.key !== key) {
    cached = { key, client: new Stripe(key, { maxNetworkRetries: 2 }) };
  }

  return cached.client;
}

/** The webhook signing secret, or null when unset. */
export function getWebhookSecret(): string | null {
  return process.env.STRIPE_WEBHOOK_SECRET || null;
}

const PRICE_ENV: Record<BillingPeriod, string> = {
  monthly: "STRIPE_PRICE_ID_MONTHLY",
  yearly: "STRIPE_PRICE_ID_YEARLY",
};

/** The Stripe price id for a billing period. Throws when it is not configured. */
export function getPriceId(period: BillingPeriod): string {
  const priceId = process.env[PRICE_ENV[period]];

  if (!priceId) {
    throw new Error(`Stripe is not configured. Set ${PRICE_ENV[period]}.`);
  }

  return priceId;
}

/** Which billing period a price id is, or null for a price this app does not sell. */
export function getBillingPeriodForPrice(priceId: string): BillingPeriod | null {
  if (priceId === process.env.STRIPE_PRICE_ID_MONTHLY) return "monthly";
  if (priceId === process.env.STRIPE_PRICE_ID_YEARLY) return "yearly";
  return null;
}

/** A Stripe expandable field (`"cus_…"` or an expanded object) reduced to its id. */
export function toStripeId(value: string | { id: string }): string {
  return typeof value === "string" ? value : value.id;
}
```

### 4.2 `src/lib/validations/billing.ts`

```ts
import { z } from "zod";

export const billingPeriodSchema = z.enum(["monthly", "yearly"]);
```

### 4.3 `src/lib/entitlements.ts` — plan rules (client-safe, pure)

This module holds no SDK and no environment, so client components (the type
picker, the sidebar) and servers can both import it. It is fully unit-testable.

```ts
import { FREE_COLLECTION_LIMIT, FREE_ITEM_LIMIT } from "@/lib/plans";

export const PRO_REQUIRED = "This is a Pro feature. Upgrade to Pro to use it.";

/**
 * Item types only Pro can create: both upload-backed types. The sidebar's
 * `PRO` badge and the New Item type picker read this too.
 */
export const PRO_TYPE_SLUGS: ReadonlySet<string> = new Set(["file", "image"]);

/**
 * Subscription statuses that grant Pro.
 *
 * `past_due` is included on purpose: Stripe is still retrying the payment, and
 * pulling features mid-retry punishes an expired card. When retries run out,
 * Stripe moves the subscription to `canceled` or `unpaid` (per the Dashboard
 * setting in §6), which does not grant Pro.
 */
const ENTITLING_STATUSES: ReadonlySet<string> = new Set([
  "active",
  "trialing",
  "past_due",
]);

export function isEntitlingStatus(status: string): boolean {
  return ENTITLING_STATUSES.has(status);
}

interface SubscriptionLike {
  id: string;
  status: string;
  created: number;
}

/**
 * The subscription that decides a customer's plan: the newest one that grants
 * Pro, or null when none does. A customer can end up with two, for example by
 * finishing two Checkout tabs, and one ending must not downgrade the other.
 */
export function pickEntitlingSubscription<T extends SubscriptionLike>(
  subscriptions: readonly T[],
): T | null {
  return (
    subscriptions
      .filter((subscription) => isEntitlingStatus(subscription.status))
      .sort((a, b) => b.created - a.created)[0] ?? null
  );
}

export type LimitCheck = { allowed: true } | { allowed: false; error: string };

export function checkItemLimit(itemCount: number, isPro: boolean): LimitCheck {
  if (isPro || itemCount < FREE_ITEM_LIMIT) return { allowed: true };
  return {
    allowed: false,
    error: `The Free plan includes ${FREE_ITEM_LIMIT} items. Upgrade to Pro for unlimited items.`,
  };
}

export function checkCollectionLimit(collectionCount: number, isPro: boolean): LimitCheck {
  if (isPro || collectionCount < FREE_COLLECTION_LIMIT) return { allowed: true };
  return {
    allowed: false,
    error: `The Free plan includes ${FREE_COLLECTION_LIMIT} collections. Upgrade to Pro for unlimited collections.`,
  };
}

export function canCreateTypeSlug(slug: string, isPro: boolean): boolean {
  return isPro || !PRO_TYPE_SLUGS.has(slug);
}
```

### 4.4 `src/lib/db/billing.ts` — Prisma queries

```ts
/**
 * Billing columns on `User`. Every write is `updateMany` with a scoped `where`,
 * so a row that has gone (a JWT outlives its user) or a customer id nobody owns
 * comes back as a count of 0 rather than a P2025.
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

/** The user's own counts. The dashboard getters are demo-scoped, so these are separate. */
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
 * ends up holding: this one, or one a concurrent request stored first.
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
```

### 4.5 `src/lib/billing.ts` — Stripe and DB orchestration (server only)

```ts
import type Stripe from "stripe";

import {
  applySubscriptionState,
  claimStripeCustomerId,
  type BillingUser,
} from "@/lib/db/billing";
import { pickEntitlingSubscription } from "@/lib/entitlements";
import type { BillingPeriod } from "@/lib/plans";
import { getBillingPeriodForPrice, getStripe, toStripeId } from "@/lib/stripe";

/**
 * The user's Stripe customer, created on first use.
 *
 * The idempotency key makes two concurrent upgrades create one customer, not
 * two, and `claimStripeCustomerId` settles which id the row keeps.
 */
export async function getOrCreateStripeCustomer(
  userId: string,
  user: Pick<BillingUser, "email" | "name" | "stripeCustomerId">,
): Promise<string> {
  if (user.stripeCustomerId) return user.stripeCustomerId;

  const customer = await getStripe().customers.create(
    { email: user.email, name: user.name ?? undefined, metadata: { userId } },
    { idempotencyKey: `devstash-customer-${userId}` },
  );

  const stored = await claimStripeCustomerId(userId, customer.id);

  if (!stored) throw new Error("User row disappeared while creating a Stripe customer.");

  return stored;
}

/**
 * Re-reads a customer's subscriptions from Stripe and writes the result.
 * Every webhook and the checkout success page go through here, so the outcome
 * never depends on which event arrived, or in what order.
 */
export async function syncCustomerSubscription(customerId: string): Promise<void> {
  const { data } = await getStripe().subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 20,
  });

  const current = pickEntitlingSubscription(data);
  const matched = await applySubscriptionState(customerId, {
    isPro: current !== null,
    subscriptionId: current?.id ?? null,
  });

  // An account deleted after cancelling, or a customer made outside the app.
  if (!matched) console.warn(`Stripe customer ${customerId} matches no user.`);
}

/** The success URL's session: synced only if it is this user's own. */
export async function syncCheckoutSession(sessionId: string, userId: string): Promise<void> {
  const session = await getStripe().checkout.sessions.retrieve(sessionId);

  if (session.client_reference_id !== userId || !session.customer) return;

  await syncCustomerSubscription(toStripeId(session.customer));
}

const SUBSCRIPTION_EVENTS: ReadonlySet<Stripe.Event.Type> = new Set([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
]);

/** Everything the webhook route does once the signature has been verified. */
export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    if (session.mode === "subscription" && session.customer) {
      await syncCustomerSubscription(toStripeId(session.customer));
    }

    return;
  }

  if (SUBSCRIPTION_EVENTS.has(event.type)) {
    const subscription = event.data.object as Stripe.Subscription;
    await syncCustomerSubscription(toStripeId(subscription.customer));
  }

  // Anything else is acknowledged and ignored.
}

export interface SubscriptionSummary {
  period: BillingPeriod | null;
  /** When the current period ends: the renewal date, or the end date if cancelling. */
  periodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  status: Stripe.Subscription.Status;
}

/** What the Billing card shows for a Pro user. Null if Stripe cannot be reached. */
export async function getSubscriptionSummary(
  subscriptionId: string,
): Promise<SubscriptionSummary | null> {
  try {
    const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
    const item = subscription.items.data[0];

    return {
      period: item ? getBillingPeriodForPrice(item.price.id) : null,
      // Item-level since API version 2025-03-31 (basil).
      periodEnd: item ? new Date(item.current_period_end * 1000) : null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      status: subscription.status,
    };
  } catch (error) {
    console.error("Failed to load subscription:", error);
    return null;
  }
}

/**
 * Cancels, immediately, every subscription that is still running, before the
 * account is deleted. Otherwise a deleted user would go on being charged. The
 * customer itself is kept so invoices and refunds stay reachable in Stripe.
 */
export async function cancelCustomerSubscriptions(customerId: string): Promise<void> {
  const stripe = getStripe();
  const { data } = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 20 });

  const running = data.filter(
    (subscription) => !["canceled", "incomplete_expired"].includes(subscription.status),
  );

  await Promise.all(running.map((subscription) => stripe.subscriptions.cancel(subscription.id)));
}
```

`handleStripeEvent` narrows by `event.type`. Once the check is a `Set`, the
`as Stripe.Subscription` is needed; a `switch` with one `case` per event
avoids the cast if preferred.

### 4.6 `src/app/api/webhooks/stripe/route.ts`

```ts
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
```

This needs no `runtime` export: route handlers run on Node by default. It
needs no `dynamic` export either, because a POST is never cached.

### 4.7 `src/actions/billing.ts` — Checkout and Portal

```ts
"use server";

import { auth } from "@/auth";
import { getOrCreateStripeCustomer } from "@/lib/billing";
import { getBillingUser } from "@/lib/db/billing";
import { getPriceId, getStripe } from "@/lib/stripe";
import { getBaseUrl } from "@/lib/tokens";
import { billingPeriodSchema } from "@/lib/validations/billing";

/**
 * Billing actions for the Billing card on `/settings`. Each returns a
 * Stripe-hosted URL, which the client then navigates to. Scoped to the
 * signed-in user.
 */

const SESSION_EXPIRED = "Your session has expired. Sign in again to continue.";
const SOMETHING_WENT_WRONG = "Something went wrong. Please try again.";

export type BillingRedirectResult =
  | { success: true; data: { url: string } }
  | { success: false; error: string };

export async function createCheckoutSession(period: unknown): Promise<BillingRedirectResult> {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) return { success: false, error: SESSION_EXPIRED };

  const parsed = billingPeriodSchema.safeParse(period);

  if (!parsed.success) return { success: false, error: "Choose monthly or yearly billing." };

  try {
    const user = await getBillingUser(userId);

    if (!user) return { success: false, error: SESSION_EXPIRED };

    // Checked against the row, not the session, so a stale tab cannot start
    // a second subscription.
    if (user.isPro) {
      return { success: false, error: "You're already on Pro. Use Manage billing to change your plan." };
    }

    const customerId = await getOrCreateStripeCustomer(userId, user);
    const baseUrl = getBaseUrl();

    const checkout = await getStripe().checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: userId,
      line_items: [{ price: getPriceId(parsed.data), quantity: 1 }],
      subscription_data: { metadata: { userId } },
      success_url: `${baseUrl}/settings?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/settings?checkout=cancelled`,
    });

    if (!checkout.url) throw new Error("Checkout session was created without a URL.");

    return { success: true, data: { url: checkout.url } };
  } catch (error) {
    console.error("Failed to start checkout:", error);
    return { success: false, error: SOMETHING_WENT_WRONG };
  }
}

export async function createBillingPortalSession(): Promise<BillingRedirectResult> {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) return { success: false, error: SESSION_EXPIRED };

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
```

`{CHECKOUT_SESSION_ID}` is a literal placeholder that Stripe fills in. It has
no `$`, so the template string leaves it alone.

**`AUTH_URL` must be set on the deployment.** Otherwise the success and
cancel URLs point at `localhost:3000`. Email verification already has the
same requirement.

### 4.8 `src/components/settings/BillingCard.tsx` (server)

This goes on `/settings`. Props: the `BillingUser`, the usage counts, a
`SubscriptionSummary | null`, and the `checkout` notice from the URL.

- **Free user:**
  - "Free plan" heading
  - usage lines: `12 / 50 items`, `2 / 3 collections`
  - `Upgrade monthly — $8/mo` and `Upgrade yearly — $72/yr` buttons, labels
    from `getProPriceDisplay`, with a "Save 25%" hint from
    `getYearlySavingsPercent()`
  - a "Manage billing" link as well when `stripeCustomerId` is set, so a
    former Pro user can still see invoices
- **Pro user:**
  - "Pro · Monthly" (or Yearly)
  - "Renews on September 29, 2027", or "Cancels on …" when
    `cancelAtPeriodEnd`, using `formatLongDate`
  - "Payment past due — update your card" when `status === "past_due"`
  - a **Manage billing** button
- **Notices:** `checkout=success` shows "Welcome to Pro." and
  `checkout=cancelled` shows "Checkout cancelled — you have not been charged."
  Use the existing `FormNotice`.

### 4.9 `src/components/settings/BillingButtons.tsx` (client)

```tsx
"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { createBillingPortalSession, createCheckoutSession } from "@/actions/billing";
import { Button } from "@/components/ui/button";
import type { BillingPeriod } from "@/lib/plans";

/** Runs a billing action and follows the Stripe URL it returns. */
function useStripeRedirect() {
  const [pending, startTransition] = useTransition();
  // Stays true after success, so the button cannot be clicked again while the
  // browser is leaving for Stripe.
  const [redirecting, setRedirecting] = useState(false);

  function go(action: () => ReturnType<typeof createBillingPortalSession>) {
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

export function UpgradeButton({ period, label }: { period: BillingPeriod; label: string }) {
  const { busy, go } = useStripeRedirect();
  return (
    <Button disabled={busy} onClick={() => go(() => createCheckoutSession(period))}>
      {busy ? "Redirecting..." : label}
    </Button>
  );
}

export function ManageBillingButton() {
  const { busy, go } = useStripeRedirect();
  return (
    <Button variant="outline" disabled={busy} onClick={() => go(createBillingPortalSession)}>
      {busy ? "Opening..." : "Manage billing"}
    </Button>
  );
}
```

### 4.10 Tests (Vitest, `node` environment, all I/O mocked)

Follow `src/actions/profile.test.ts`: build the mocks with `vi.hoisted`, mock
`@/auth` and `@/lib/prisma`, and mock `@/lib/stripe` so no test reaches
Stripe.

| File | Covers |
| --- | --- |
| `src/lib/entitlements.test.ts` | Each status in and out of `isEntitlingStatus`. `pickEntitlingSubscription` picks the newest entitling subscription and ignores a newer `canceled` one. Limits at 49, 50 and 51 for Free and for Pro. `canCreateTypeSlug` refuses `file` and `image` for Free, allows them for Pro, and allows `snippet` for both |
| `src/lib/stripe.test.ts` | `getPriceId` for both periods and throwing when unset (`vi.stubEnv`). `getBillingPeriodForPrice` for both prices and an unknown one. `getStripe` throws without a key and reuses the client for an unchanged key. `toStripeId` |
| `src/lib/billing.test.ts` | `syncCustomerSubscription` writes Pro, Free, or a warning when no user matches. `handleStripeEvent` handles each event type, ignores a checkout in `payment` mode, ignores unknown events, and lets errors propagate. `syncCheckoutSession` refuses another user's session. `getOrCreateStripeCustomer` reuses a stored id, keeps the winner's id after a race, and passes the idempotency key. `cancelCustomerSubscriptions` skips subscriptions already canceled |
| `src/actions/billing.test.ts` | No session, bad period, already Pro, missing row, the Checkout params (`customer`, `client_reference_id`, price, URLs), a Stripe error returning the generic message, and the portal with and without a customer |
| `src/actions/items.test.ts` (extend) | A Free user at 50 is refused with `upgradeRequired`. A Pro user at 500 is allowed and no count query runs. A Free user is refused `typeSlug: "file"` and `"image"`, and allowed `snippet` |
| `src/actions/collections.test.ts` (extend) | A Free user at 3 is refused; Pro is allowed |
| `src/actions/profile.test.ts` (extend) | `deleteAccount` cancels subscriptions before deleting, and aborts the delete if Stripe fails |

**The existing action tests mock `auth()` with sessions that have no
`isPro`.** Once the limits land, those sessions read as Free, and `createItem`
will call `prisma.item.count`. Update the mock sessions to `isPro: true`, or
mock the count, or those tests will fail.

---

## 5. Files to modify

### 5.1 `src/auth.ts` — `isPro` on the token and session

Add a `jwt` callback and extend `session`:

```ts
callbacks: {
  // Runs on every session read (every `auth()` call), not only at sign-in,
  // so a webhook's change to `isPro` shows on the next request. One primary-key
  // lookup per read. `trigger === "update"` is not used: no client calls
  // `update()`, and it would not see a webhook's change anyway.
  async jwt({ token }) {
    if (!token.sub) return token;

    try {
      const user = await prisma.user.findUnique({
        where: { id: token.sub },
        select: { isPro: true },
      });
      token.isPro = user?.isPro ?? false;
    } catch (error) {
      // Keep the last known value rather than failing every page on a
      // database blip.
      console.error("Failed to refresh isPro on the session:", error);
    }

    return token;
  },
  session({ session, token }) {
    if (token.sub) {
      session.user.id = token.sub;
    }
    session.user.isPro = token.isPro === true;

    return session;
  },
},
```

How this differs from the snippet in the research notes:

- **No `if (user) token.sub = user.id`.** Auth.js already writes `sub` when it
  mints the token. This is the decision recorded in Auth Phase 1.
- **No JWT type augmentation.** `JWT` is an open record, so `token.isPro` is
  `unknown`, and `=== true` narrows it. `declare module "next-auth/jwt"`
  silently does nothing, for the reason in §1.2.
- **A `try`/`catch`.** A thrown `jwt` callback fails `auth()` and would sign
  every page out during a database outage.

The proxy needs no change. Its `NextAuth(authConfig)` has no `jwt` callback,
so it passes the claim through unchanged and stays free of Prisma.

### 5.2 `src/types/next-auth.d.ts`

```ts
interface Session {
  user: {
    id: string;
    /** From the database on every session read. See the `jwt` callback. */
    isPro: boolean;
  } & DefaultSession["user"];
}
```

### 5.3 `src/lib/session.ts`

Add a cached helper next to `getSessionUserId`, so the layout reads both
values from one `auth()` call:

```ts
export const getSessionUser = cache(
  async (): Promise<{ id: string; isPro: boolean } | null> => {
    const user = (await auth())?.user;
    return user?.id ? { id: user.id, isPro: user.isPro } : null;
  },
);
```

Consider making `getSessionUserId` call `getSessionUser`, so one request
never pays for two session reads.

### 5.4 `src/actions/items.ts` — `createItem`

After the Zod parse and the owned-upload check, before `createItemRecord`:

```ts
const isPro = session.user.isPro;

if (!canCreateTypeSlug(parsed.data.typeSlug, isPro)) {
  return { success: false, error: PRO_REQUIRED, upgradeRequired: true };
}

// inside the existing try, before createItemRecord:
if (!isPro) {
  const limit = checkItemLimit(await prisma.item.count({ where: { userId } }), isPro);
  if (!limit.allowed) return { success: false, error: limit.error, upgradeRequired: true };
}
```

Add `upgradeRequired?: true` to the failure arm of `CreateItemResult`. Put
the count in `src/lib/db/items.ts` as `countUserItems(userId)`, rather than
importing Prisma into the action. It then sits next to the other item queries
and can be mocked in tests.

### 5.5 `src/actions/collections.ts` — `createCollection`

The same, with `countUserCollections(userId)` in `src/lib/db/collections.ts`
and `checkCollectionLimit`. `updateCollection` and `deleteCollection` are not
gated.

### 5.6 `src/app/api/uploads/route.ts` — `POST`

Right after the session check, **before** the `content-length` check and
`request.formData()`:

```ts
if (!session.user.isPro) {
  return fail("File and image uploads are a Pro feature. Upgrade to Pro to upload.", 403);
}
```

Every upload kind is Pro, so the check does not need `kind` from the body. A
Free user is refused before anything is buffered. `DELETE` (discarding an
upload) is not gated: a user who is downgraded mid-dialog must still be able
to discard what they uploaded.

### 5.7 `src/app/settings/page.tsx`

- Take `searchParams`, which keeps the page `ƒ`; `force-dynamic` already does
  too. Read `checkout` and `session_id`.
- If `checkout === "success"` and there is a `session_id`, run
  `await syncCheckoutSession(sessionId, userId)` **before** the billing reads,
  wrapped in `try`/`catch` with a log. The sync is idempotent, so a refresh or
  an RSC re-fetch of this URL is harmless. The token-burn problem from the
  email-verification work does not apply.
- Add `getBillingUser(userId)` and `getUsageCounts(userId)` to the existing
  `Promise.all`. When `stripeSubscriptionId` is set, also call
  `getSubscriptionSummary`.
- Render `<BillingCard … />` with `id="billing"` between Editor preferences and
  Change password.
- Update the page's doc comment ("editor preferences, billing, change password
  and delete account").

### 5.8 `src/actions/profile.ts` — `deleteAccount`

Before the Prisma delete, cancel any running subscription. Otherwise a
deleted user keeps being charged:

```ts
const user = await prisma.user.findUnique({
  where: { id: userId },
  select: { email: true, stripeCustomerId: true },
});
// …
if (user.stripeCustomerId) {
  try {
    await cancelCustomerSubscriptions(user.stripeCustomerId);
  } catch (error) {
    console.error("Failed to cancel subscriptions before account deletion:", error);
    return { error: "We couldn't cancel your subscription, so your account was not deleted. Please try again." };
  }
}
```

**Stop the deletion if cancelling fails.** An orphaned subscription billing a
user who no longer exists is worse than a retry. The
`customer.subscription.deleted` webhook that follows finds no user. That is
logged and acknowledged with 200.

Update the delete dialog's copy: "Any Pro subscription is cancelled
immediately, without a refund for the remaining period."

`scripts/delete-users.ts` should do the same for any user with a
`stripeCustomerId`, or at least list those users in its dry run. It runs
against dev, which uses test keys.

### 5.9 `src/app/(app)/layout.tsx`, `TopBar`, `NewItemDialog` / `NewItemForm`, `Sidebar`

- Layout: switch to `getSessionUser()` and pass `isPro` to `TopBar` and
  `Sidebar`.
- `TopBar` → `NewItemDialog` → the type picker: for Free users, show a `PRO`
  badge on the File and Image type buttons and disable them.
  `/items/[type]/page.tsx` renders its own `NewItemDialog`. On `/items/file`
  and `/items/image`, a Free user sees the New File / New Image button
  disabled with an "Upgrade to Pro" hint.
- `NewItemForm` and `NewCollectionDialog`: add the sonner "Upgrade" action on
  an `upgradeRequired` failure.
- `Sidebar.tsx`: delete the local `PRO_TYPE_SLUGS` and import it from
  `@/lib/entitlements`. The set is the same (`file`, `image`), so the badges
  do not change. Hide the badge for Pro users, since the feature is already
  theirs.

### 5.10 Homepage pricing — `PricingPlans.tsx` / `PricingSection.tsx`

`src/app/page.tsx` already reads the session. Pass `signedIn` down to
`PlanCard`. When signed in, the Pro CTA goes to `/settings#billing` instead of
`/register`. Update the comment "Billing does not exist yet, so both plans
start at registration".

### 5.11 `src/lib/plans.ts`

- Rewrite the header comment: the limits are now enforced (see
  `src/lib/entitlements.ts`), and the prices must match the Stripe prices,
  since the page shows these numbers and Stripe charges its own.
- **Remove "Image uploads" from `FREE_PLAN.features`**, since images are Pro.
- Change `PRO_PLAN`'s "File uploads" to **"File and image uploads"**.
  The homepage pricing cards render these lists, so they update with it.

### 5.12 `.env.example`

Replace the bare block with documentation in the file's style:

```bash
# Stripe (subscriptions for DevStash Pro)
#
# STRIPE_SECRET_KEY        — sk_test_… locally, sk_live_… in production. Server only.
# STRIPE_WEBHOOK_SECRET    — whsec_… that verifies POST /api/webhooks/stripe.
#                            Locally this is the one `stripe listen` prints, which
#                            is NOT the Dashboard endpoint's secret.
# STRIPE_PRICE_ID_MONTHLY  — price_… for Pro at $8/month.
# STRIPE_PRICE_ID_YEARLY   — price_… for Pro at $72/year.
#                            Test and live mode have different ids.
# STRIPE_PUBLISHABLE_KEY   — unused: Checkout and the Portal are Stripe-hosted
#                            and reached by a server-created URL. Kept for a
#                            future Stripe.js integration.
#
# Without the secret key or price ids, Upgrade shows "Something went wrong"
# and logs why. Without the webhook secret the endpoint answers 500, and
# Stripe retries for up to three days.
```

### 5.13 Docs

When the work is done, record it in `context/current-feature.md` History and
update the Status in `context/project-overview.md`.

`context/project-overview.md`'s Monetization table still says Free includes
"image uploads". Change it so Free has no uploads and Pro has "File and image
uploads", so the spec matches the decision in §9.

---

## 6. Stripe Dashboard setup

Do everything in **test mode** first. Live mode repeats the steps, and every
id is different there.

1. **Product and prices** (Product catalog → Add product)
   - Product: **DevStash Pro**
   - Price 1: $8.00 USD, recurring, monthly. Copy the id to
     `STRIPE_PRICE_ID_MONTHLY`
   - Price 2: $72.00 USD, recurring, yearly. Copy the id to
     `STRIPE_PRICE_ID_YEARLY`
   - Optionally give them the lookup keys `pro_monthly` / `pro_yearly`, for
     reference.
2. **Customer Portal** (Settings → Billing → Customer portal)
   - Allow: update payment method, view invoice history, update billing
     details
   - Cancel subscriptions: on, **at end of billing period**. The user keeps
     Pro until the period ends; the `deleted` event then removes it
   - Switch plans: on, with product DevStash Pro and both prices, so users can
     move between monthly and yearly. Proration can stay at Stripe's default
   - Business information: add terms of service and privacy policy links.
     Live mode requires them
3. **Failed payments** (Settings → Billing → Subscriptions and emails)
   - Smart Retries: on (the default)
   - **"If all retries for a payment fail": cancel the subscription.** That
     fires `customer.subscription.deleted` and ends Pro. "Mark as unpaid" also
     works, since `unpaid` does not grant Pro. Leaving it past due would keep
     Pro forever
   - Customer emails for failed payments and expiring cards: on
4. **Webhook endpoint** (Developers → Webhooks → Add destination) — for
   production only. Local development uses the CLI (step 6)
   - URL: `https://<production-domain>/api/webhooks/stripe`
   - Events:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `customer.subscription.paused`
     - `customer.subscription.resumed`
   - Copy the signing secret into the host's `STRIPE_WEBHOOK_SECRET`
   - The endpoint's API version matters little. The handler reads only
     `customer` and `mode` from the payload and re-fetches everything else
     through the SDK's pinned version
5. **Checkout branding** (Settings → Branding): logo, and accent color
   indigo `#6366f1` to match the homepage.
6. **Local webhooks with the Stripe CLI**

   ```bash
   stripe login
   stripe listen --forward-to localhost:3000/api/webhooks/stripe \
     --events checkout.session.completed,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,customer.subscription.paused,customer.subscription.resumed
   ```

   Put the `whsec_…` it prints into `.env` as `STRIPE_WEBHOOK_SECRET`, then
   restart `next dev`. The secret stays the same across `listen` runs for the
   same account.
7. **Going live**
   - Activate the account
   - Recreate the product and prices in live mode
   - Set the live `STRIPE_SECRET_KEY`, both live price ids, the live endpoint's
     `STRIPE_WEBHOOK_SECRET` and `AUTH_URL` in the host's environment
   - `.env.production` already has all five `STRIPE_*` names set. This plan did
     not read them, per `CLAUDE.md`. Confirm by hand whether they are test or
     live values before relying on them

---

## 7. Testing checklist

### Automated

- [ ] `npm test`: the new and extended suites in §4.10 pass, and the existing
      action tests are updated for `isPro`
- [ ] Mutation check: removing `isPro` from the `createItem` guard, or `past_due`
      from the entitling set, fails a test
- [ ] `npx tsc --noEmit`, `npm run lint` and `npm run build` pass. The build
      registers `ƒ /api/webhooks/stripe`, and `/settings` stays `ƒ`

### Local, end to end (`npm run dev` + `stripe listen`)

**Upgrade**

- [ ] A Free account's `/settings` shows the Free plan, correct usage counts
      and both upgrade buttons
- [ ] Upgrade monthly → Stripe Checkout shows $8/month with the account's
      email → pay with `4242 4242 4242 4242` → back on
      `/settings?checkout=success`, which shows **Pro · Monthly** with a
      renewal date **on the first render**
- [ ] The `stripe listen` output shows `checkout.session.completed` and
      `customer.subscription.created` answered with **200**
- [ ] In the database (dev branch only): `isPro = true`, and
      `stripeCustomerId` / `stripeSubscriptionId` are set
- [ ] Without signing out, the user can create a File item and a 51st item
- [ ] Upgrade yearly with a second account: $72/year, **Pro · Yearly**
- [ ] 3-D Secure with `4000 0025 0000 3155` succeeds after the challenge
- [ ] A declined card (`4000 0000 0000 9995`) shows Stripe's error inside
      Checkout, and the account stays Free
- [ ] Cancelling in Checkout (the back arrow) → `?checkout=cancelled` with its
      notice, still Free, and no subscription in Stripe
- [ ] With `stripe listen` stopped, a completed checkout still shows Pro on
      return, through the success-page sync. Restarting `listen` and
      re-sending the events changes nothing

**Portal**

- [ ] Manage billing opens the Portal, and "Return to DevStash" lands on
      `/settings`
- [ ] Switch monthly → yearly: after `customer.subscription.updated`, the card
      reads **Pro · Yearly**
- [ ] Cancel: the card reads "Cancels on <date>" and the account is still Pro.
      Then either end it immediately from the Dashboard or advance a test
      clock → `deleted` → Free, and creation limits apply again
- [ ] Updating the card in the Portal works

**Failed renewal**

- [ ] Use a test clock (Billing → Test clocks), or put
      `4000 0000 0000 0341` on the subscription and force a new invoice.
      The subscription becomes `past_due` → the card shows the "past due"
      message and Pro is kept → after retries run out → `canceled` → Free

**Webhook robustness**

- [ ] A POST with no `stripe-signature` → 400. A wrong signature → 400. Neither
      changes the database
- [ ] `STRIPE_WEBHOOK_SECRET` unset → 500 plus a log line, and Stripe
      retries
- [ ] `stripe events resend <evt_id>` for an old `updated` event after
      cancellation leaves the user Free (order independence)
- [ ] `stripe trigger customer.subscription.updated` for a customer the app
      does not know → 200 plus a warning log

**Gating (Free account)**

- [ ] At 50 items, New Item is refused with the limit message, the toast
      shows an **Upgrade** action, and it goes to `/settings`
- [ ] With 3 collections, New Collection is refused the same way
- [ ] The File and Image types show `PRO` and are disabled in the type
      picker. The New File button on `/items/file` and the New Image button
      on `/items/image` are disabled
- [ ] `curl` with `kind=file` or `kind=image` to `/api/uploads` → **403**.
      Both → 201 for a Pro account
- [ ] A crafted `createItem` call with `typeSlug: "file"` or `"image"` is
      refused server-side
- [ ] Free users can still create snippet, prompt, command, note and link
      items
- [ ] After a downgrade, existing items and collections over the limit can
      still be opened, edited, deleted and downloaded. The Images gallery
      still shows existing images
- [ ] The sidebar's `PRO` badges show on Files and Images for a Free account
      and are hidden for a Pro account
- [ ] The homepage pricing cards list uploads only under Pro

**Other**

- [ ] A GitHub-only account (no password) can upgrade. Checkout is prefilled
      with its GitHub email
- [ ] Deleting a Pro account cancels the subscription in Stripe first. With
      Stripe unreachable (bad key), the delete is refused and the account is
      kept
- [ ] Homepage pricing: signed out → `/register`; signed in → `/settings#billing`
- [ ] At 390px the Billing card fits with no horizontal scroll, and the
      buttons stack
- [ ] The Prisma query log shows one `SELECT "isPro"` per `auth()` call. Note
      how many calls a dashboard render makes (see §10)

---

## 8. Implementation order

Split the work into **two feature branches**, per the workflow in
`context/ai-interaction.md`. The first makes money move; the second makes the
plan matter.

**Branch 1: `feature/stripe-billing`**

1. Stripe Dashboard test-mode setup (§6, steps 1–3 and 6). Put the price ids
   and the CLI's `whsec_` in `.env`.
2. `npm install stripe`. Add `src/lib/stripe.ts`,
   `src/lib/validations/billing.ts` and the `.env.example` docs.
3. `src/lib/entitlements.ts`, with tests. It is pure, so everything else can
   rely on it.
4. Session: the `jwt`/`session` callbacks, `next-auth.d.ts`, `getSessionUser`.
   Verify with the Prisma log that `isPro` is read and appears on the session.
5. `src/lib/db/billing.ts` and `src/lib/billing.ts`, with tests.
6. `POST /api/webhooks/stripe`. Check it with `stripe trigger` before any UI
   exists.
7. `src/actions/billing.ts`, with tests.
8. The `/settings` Billing card, the buttons and the success-page sync.
9. `deleteAccount` cancellation (and `scripts/delete-users.ts`).
10. The homepage pricing CTA.
11. The full "Upgrade", "Portal", "Failed renewal" and "Webhook robustness"
    sections of §7. Then build, commit and merge.

**Branch 2: `feature/plan-limits`**

12. `countUserItems` / `countUserCollections`, and the guards in `createItem`,
    `createCollection` and `POST /api/uploads`, with tests (including the
    fixes to existing mocks).
13. UI: `upgradeRequired` toasts, the `PRO` state for the File and Image
    types in the picker and on `/items/file` and `/items/image`, the sidebar
    reading the shared `PRO_TYPE_SLUGS`, and the plan feature lists in
    `src/lib/plans.ts` and `context/project-overview.md` (§5.11, §5.13).
14. The "Gating" section of §7, then build, commit and merge.

**Later:** production webhook endpoint and live-mode setup (§6, steps 4, 5
and 7) when deploying.

---

## 9. Decisions

All settled by the user on 2026-09-29.

1. **Images are Pro, and so are files.** This departs from the spec's plan
   table, which listed image uploads under Free. Both upload types, `file` and
   `image`, need Pro. The sidebar's existing `PRO` badges on Files and Images
   were already right. `src/lib/plans.ts` and `context/project-overview.md`
   are updated to match (§5.11, §5.13). Free users can create snippets,
   prompts, commands, notes and links.
2. **`past_due` keeps Pro** while Stripe retries the payment (§4.3). The
   Dashboard is set to cancel the subscription when retries fail (§6, step 3),
   and that ends Pro.
3. **Deleting an account cancels its subscription immediately**, with no
   refund. The Stripe customer is kept for records (§5.8). If cancelling
   fails, the account is not deleted.
4. **A downgrade keeps all existing data.** Only new creates are blocked
   (§3.2). Existing file and image items stay viewable and downloadable.
5. **No free trial**; the spec has none. To add one later, set
   `subscription_data: { trial_period_days: 7 }`. `trialing` already grants
   Pro.
6. **No Pro badge in the user menu or sidebar footer**; the spec does not ask
   for one.

---

## 10. Risks and known gaps

- **One database query per `auth()` call.** A dashboard render calls `auth()`
  more than once: `getSessionUserId` (cached) plus `getCurrentUser`, which
  calls `auth()` itself. Each adds a primary-key lookup, about 250 ms of round
  trip from the dev machine to Neon, though in parallel with the layout's
  other queries. Routing `getCurrentUser` and `getProfileUser` through the
  cached `getSessionUser` removes the duplicates. Worth doing in step 4.
- **Soft limits.** Concurrent creates can overshoot the limit by a few (§3.2).
- **Demo-scoped reads remain.** A non-demo Free user is limited on their own
  counts while the sidebar still shows the demo user's counts. That confusion
  predates this work. Moving item reads onto the session is still the open
  gap flagged since Auth Phase 3.
- **Vercel's 4.5 MB request body cap** still limits file uploads in
  production. Since only Pro users can upload now, that is where they will
  hit it (noted under File & Image Upload).
- **No rate limit on `createCheckoutSession`.** It needs a session, and each
  call only creates a Checkout Session, which costs nothing unless paid.
  Acceptable. Add it to `LIMITS` in `src/lib/rate-limit.ts` if abuse appears.
- **Two open Checkout tabs can create two subscriptions.** The `isPro` check
  only blocks a checkout started *after* the first completes. The sync handles
  two subscriptions correctly (the newest entitling one wins), but the user is
  charged twice until one is cancelled. Mitigations: expire the customer's
  open Checkout Sessions before creating a new one
  (`checkout.sessions.list({ customer, status: "open" })` → `expire`), or turn
  on "Limit customers to one subscription" in the Dashboard's Checkout
  settings, if the account has it. Recommended as a follow-up.
- **Prices exist in two places.** `PRO_PRICES` in `src/lib/plans.ts` is what
  the site shows; the Stripe price is what gets charged. Change them together.
- **Production environment.** `AUTH_URL` must be set there, as noted in
  several earlier features, or the Checkout return URLs point at localhost.
