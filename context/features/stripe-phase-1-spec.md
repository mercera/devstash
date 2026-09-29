# Stripe Integration — Phase 1: Core Infrastructure

## Overview

Build the server-side foundation for DevStash Pro subscriptions ($8/month,
$72/year): the Stripe client, the usage-limits module, `isPro` on the
session, the billing database queries, subscription sync, and the Checkout
and Customer Portal server actions.

**Nothing in this phase is visible in the UI, and nothing needs the Stripe
CLI.** Unit tests (all I/O mocked), typecheck, lint and build verify it.
Phase 2 (`stripe-phase-2-spec.md`) adds the webhook, feature gating and the
UI, and tests everything end to end.

Reference: `docs/stripe-integration-plan.md` has full code for every file
below (section numbers in brackets).

## Requirements

- Install `stripe` (22.x). **Do not pass `apiVersion`**; the SDK pins the
  version its types describe
- Read all Stripe configuration **per call, never at module load**, the same
  as `src/lib/r2.ts` and `src/lib/rate-limit.ts`
- No schema change: `User.isPro`, `stripeCustomerId` and
  `stripeSubscriptionId` (both `@unique`) already exist
- Everything server-side except `src/lib/usage-limits.ts`, which must stay
  client-safe: no SDK, no Prisma, no environment
- Unit tests for every new module, **including the usage-limits module**

## Files to Create

### `src/lib/usage-limits.ts` — plan rules (pure, client-safe) [§4.3]

The Free plan limits and Pro-only type rules. It is shared by the server
guards and, in Phase 2, by the type picker and the sidebar.

- `PRO_REQUIRED`: the generic "This is a Pro feature…" message
- `PRO_TYPE_SLUGS`: `new Set(["file", "image"])`. **Both upload types are
  Pro** (decided 2026-09-29; this departs from the spec's Free "image
  uploads")
- `LimitCheck` = `{ allowed: true } | { allowed: false; error: string }`
- `checkItemLimit(itemCount, isPro)`: refuses at `>= FREE_ITEM_LIMIT` (50)
  for Free, and always allows Pro
- `checkCollectionLimit(collectionCount, isPro)`: the same, with
  `FREE_COLLECTION_LIMIT` (3)
- `canCreateTypeSlug(slug, isPro)`: false for `file`/`image` on Free
- Import the limits from `src/lib/plans.ts`. **Never redeclare 50 or 3**

The plan calls this module `entitlements.ts`. The name here is the one to
use.

### `src/lib/stripe.ts` — client, config and Stripe helpers (server) [§4.1]

- `getStripe()`: throws when `STRIPE_SECRET_KEY` is unset. The client is
  cached on its key, with `maxNetworkRetries: 2`
- `getWebhookSecret()`: returns the secret or null. Phase 2's route uses it
- `getPriceId(period)`: throws naming the missing variable
- `getBillingPeriodForPrice(priceId)`: returns `"monthly" | "yearly" | null`
- `toStripeId(value)`: reduces an expandable field to its id
- `isEntitlingStatus(status)`: `active`, `trialing` and **`past_due`** grant
  Pro (decided: keep Pro during Stripe's retries)
- `pickEntitlingSubscription(subscriptions)`: returns the newest entitling
  subscription, or null

The last two are the plan's §4.3 status helpers. They move here because
they concern Stripe, not usage.

### `src/lib/validations/billing.ts` [§4.2]

- `billingPeriodSchema = z.enum(["monthly", "yearly"])`

### `src/lib/db/billing.ts` — Prisma queries [§4.4]

- `getBillingUser(userId)`: email, name, isPro and both Stripe ids
- `getUsageCounts(userId)`: `{ itemCount, collectionCount }`, **scoped to
  the given user**. `getItemStats()` is demo-scoped and must not be used
- `claimStripeCustomerId(userId, customerId)`: a conditional `updateMany`
  (`stripeCustomerId: null`), then a re-read. Returns whichever id the row
  holds after that
- `applySubscriptionState(customerId, { isPro, subscriptionId })`: an
  `updateMany` by `stripeCustomerId`. Returns false when no user matches

### `src/lib/billing.ts` — Stripe and DB orchestration (server) [§4.5]

- `getOrCreateStripeCustomer(userId, user)`: reuses a stored id. Otherwise
  it runs `customers.create` with `metadata.userId` and the idempotency key
  `devstash-customer-${userId}`, then `claimStripeCustomerId`
- `syncCustomerSubscription(customerId)`: calls `subscriptions.list` with
  `status: "all"`, then `pickEntitlingSubscription`, then
  `applySubscriptionState`. Warns when no user matches
- `getSubscriptionSummary(subscriptionId)`: returns `period`, `periodEnd`,
  `cancelAtPeriodEnd` and `status`. Read the period from
  `items.data[0].current_period_end`: **it is no longer on the subscription
  since API version 2025-03-31 (basil)**. Returns null and logs on error
- `cancelCustomerSubscriptions(customerId)`: cancels, immediately, every
  subscription not already `canceled` or `incomplete_expired`

`handleStripeEvent` and `syncCheckoutSession` are Phase 2.

### `src/actions/billing.ts` — server actions [§4.7]

- `createCheckoutSession(period)`. In order:
  1. session check
  2. Zod
  3. load the row, and refuse if it is already `isPro` (checked on the row,
     not the session)
  4. `getOrCreateStripeCustomer`
  5. `checkout.sessions.create` with `mode: "subscription"`, `customer`,
     `client_reference_id: userId`, the period's price,
     `subscription_data.metadata.userId`,
     `success_url: /settings?checkout=success&session_id={CHECKOUT_SESSION_ID}`
     and `cancel_url: /settings?checkout=cancelled`, both built on
     `getBaseUrl()`
  6. return `{ success: true, data: { url } }`
- `createBillingPortalSession()`: requires a stored `stripeCustomerId`, with
  `return_url: /settings`
- Standard `{ success, data, error }` shape. Stripe errors are logged and
  become "Something went wrong. Please try again."

## Files to Modify

### `src/auth.ts` [§5.1]

- Add a `jwt` callback. When `token.sub` is set, it reads `isPro` from
  `prisma.user` (a primary-key `select`) into `token.isPro`
  - wrap the read in `try`/`catch`: on error, log and keep the previous value
  - do **not** add `token.sub = user.id`; Auth.js already sets `sub`
    (Auth Phase 1 decision)
- `session` callback: `session.user.isPro = token.isPro === true`
- No JWT module augmentation: `declare module "next-auth/jwt"` does not merge.
  `=== true` narrows the `unknown`

Why this works without `trigger === "update"`: the installed
`@auth/core/lib/actions/session.js` runs `callbacks.jwt` on **every**
`auth()` call, so a webhook's database write shows on the next request. The
proxy's edge-safe instance has no `jwt` callback and passes the claim
through unchanged. **Do not touch `src/proxy.ts` or `src/auth.config.ts`.**

### `src/types/next-auth.d.ts` [§5.2]

- Add `isPro: boolean` to `Session["user"]`

### `src/lib/session.ts` [§5.3]

- Add `getSessionUser()`, cached with React `cache`, returning
  `{ id, isPro } | null`
- Make `getSessionUserId()` derive from it, so a request never pays for two
  session reads
- Route `getCurrentUser()` and `getProfileUser()` in `src/lib/db/user.ts`
  through the cached helper instead of calling `auth()` themselves. Each
  `auth()` call is now one database query

### `.env.example` [§5.12]

- Replace the bare `STRIPE_*` block with the documented version.
  `STRIPE_PUBLISHABLE_KEY` is marked unused, because Checkout and the Portal
  are Stripe-hosted
- `.env.example` already shows an uncommitted change. Review it before
  editing

## Stripe Dashboard (test mode)

- Product **DevStash Pro** with two recurring USD prices: $8/month and
  $72/year. Put their ids in `.env` as `STRIPE_PRICE_ID_MONTHLY` /
  `STRIPE_PRICE_ID_YEARLY`
- `.env` already has all five `STRIPE_*` names set. Confirm the secret key is
  `sk_test_…`. Do **not** read or use `.env.production`
- Portal settings, failed-payment settings and the webhook secret from
  `stripe listen` are Phase 2

## Unit Tests

Use Vitest in the `node` environment, with tests beside their files. Mock
every I/O boundary with `vi.hoisted` + `vi.mock`: `@/auth`, `@/lib/prisma`,
and `@/lib/stripe` (or `stripe` itself, for `stripe.test.ts`). Use
`vi.stubEnv` for environment variables. `src/actions/profile.test.ts` is the
reference pattern.

| File | Covers |
| --- | --- |
| `src/lib/usage-limits.test.ts` | Item limit at 0, 49, 50 and 51 for Free; 500 for Pro. Collection limit at 2, 3 and 4 for Free; 50 for Pro. The error messages name the limit numbers from `plans.ts`. `canCreateTypeSlug`: `file` and `image` refused for Free and allowed for Pro; `snippet`, `prompt`, `command`, `note` and `link` allowed for both. `PRO_TYPE_SLUGS` is exactly `file` and `image` |
| `src/lib/stripe.test.ts` | `getPriceId` for both periods, and a throw naming the variable when unset. `getBillingPeriodForPrice` for both prices and an unknown one. `getStripe` throws without a key, returns the same client for an unchanged key and a new one for a changed key. `toStripeId` for a string and for an object. `isEntitlingStatus` for all eight statuses. `pickEntitlingSubscription`: the newest entitling subscription wins, a newer `canceled` one is ignored, and an empty or all-ended list gives null |
| `src/lib/db/billing.test.ts` | `getUsageCounts` scopes both counts to the given user. `claimStripeCustomerId` returns the winner's id when the conditional write matched nothing. `applySubscriptionState` returns false for count 0 |
| `src/lib/billing.test.ts` | `getOrCreateStripeCustomer`: a stored id skips Stripe; otherwise the idempotency key and metadata are passed, and a null claim throws. `syncCustomerSubscription` writes Pro plus the subscription id, writes Free plus null, and warns on no match. `getSubscriptionSummary` reads the item-level period end and returns null on a Stripe error. `cancelCustomerSubscriptions` skips `canceled` and `incomplete_expired` |
| `src/actions/billing.test.ts` | Both actions without a session. Checkout: a bad period, a missing row, an already-Pro user (Stripe never called), the exact `checkout.sessions.create` params, a missing `url`, and a Stripe error returning the generic message. Portal: no customer, success, and a Stripe error |

Mutation check: removing `past_due` from the entitling set, or changing
`>=` to `>` in `checkItemLimit`, must fail a test.

## Testing

1. `npm test`: the new suites pass and the existing ones are unchanged
2. `npx tsc --noEmit`, `npm run lint` and `npm run build` pass, with the
   route table unchanged
3. Check the session without a UI: mint a session JWT for `seed-user-demo`,
   as earlier features did, then:
   - `/api/auth/session` returns `user.isPro: false`
   - the Prisma query log shows the `isPro` lookup
   - one `/dashboard` render shows no more session reads than before, after
     the `getCurrentUser` change
   - no database writes

## Notes

- **Not in this phase:** the webhook route, `handleStripeEvent`,
  `syncCheckoutSession`, any gating in `createItem` / `createCollection` /
  `/api/uploads`, the Billing card, `deleteAccount` changes, and the
  `plans.ts` / pricing copy. All of these are Phase 2
- The actions have no caller until Phase 2's Billing card. That is expected
- The `jwt` callback costs one primary-key lookup per `auth()` call. This is
  accepted, and routing the getters through `getSessionUser` keeps it to one
  per request
- Decisions settled on 2026-09-29 (plan §9):
  - both file and image uploads are Pro
  - `past_due` keeps Pro
  - deleting an account cancels its subscription immediately
  - a downgrade keeps all data
  - no trial
  - no Pro badge in the user menu

## References

- `docs/stripe-integration-plan.md`
- Stripe basil change (item-level billing periods):
  https://docs.stripe.com/changelog/basil/2025-03-31/deprecate-subscription-current-period-start-and-end
- stripe-node: https://github.com/stripe/stripe-node
