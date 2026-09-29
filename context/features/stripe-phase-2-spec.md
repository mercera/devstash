# Stripe Integration — Phase 2: Webhooks, Gating & UI

## Overview

Connect Phase 1's billing infrastructure to Stripe and the app:

- the signed webhook endpoint
- the Billing card on `/settings`, with Upgrade and Manage billing
- enforcement of the Free plan (50 items, 3 collections, no uploads)
- the plan UI in the New Item dialog, the sidebar and the homepage pricing
- cancelling a subscription when its account is deleted

**Requires Phase 1 (`stripe-phase-1-spec.md`) to be merged.** End-to-end
testing here needs the **Stripe CLI** (`stripe listen`) forwarding to the dev
server.

Reference: `docs/stripe-integration-plan.md` (section numbers in brackets).

## Requirements

- Every Stripe event is verified against `STRIPE_WEBHOOK_SECRET` on the raw
  body
- Webhooks are **signals, not data.** The handler re-reads the customer's
  subscriptions through `syncCustomerSubscription`, so processing is
  idempotent and does not depend on event order
- The user sees Pro **on the first render** after Checkout, even before the
  webhook arrives
- Plan limits are enforced on the server. The UI states are only a
  convenience
- A downgrade keeps all existing data; only new creates are refused
- Both **file and image** uploads are Pro-only

## Webhook

### `src/lib/billing.ts` — additions [§4.5]

- `handleStripeEvent(event)`:
  - `checkout.session.completed` with `mode === "subscription"` and a
    customer → `syncCustomerSubscription`
  - `customer.subscription.created`, `.updated`, `.deleted`, `.paused` and
    `.resumed` → sync by `subscription.customer`
  - every other type is ignored
  - errors propagate to the route
- `syncCheckoutSession(sessionId, userId)`: retrieves the session and syncs
  only if `client_reference_id === userId`

### `src/app/api/webhooks/stripe/route.ts` — `POST` [§4.6]

1. `STRIPE_WEBHOOK_SECRET` unset → **500** and a log line, so Stripe retries
   once it is configured
2. No `stripe-signature` header → **400**
3. Read the body with `await request.text()`. **Never parse it as JSON before
   verifying**
4. `constructEvent` fails → **400**
5. `handleStripeEvent` throws → **500** and a log line with the event id and
   type, so Stripe retries
6. Otherwise **200** `{ received: true }`

**Do not add it to the proxy matcher.** Stripe carries no session; the
signature is the authentication.

## Billing UI

### `src/components/settings/BillingCard.tsx` (server) [§4.8]

Props: the `BillingUser`, the usage counts, a `SubscriptionSummary | null`
and the checkout notice.

- **Free:**
  - "Free plan"
  - usage `N / 50 items` and `N / 3 collections`
  - **Upgrade monthly** and **Upgrade yearly** buttons, with labels from
    `getProPriceDisplay` and "Save 25%" from `getYearlySavingsPercent()`
  - a Manage billing button when `stripeCustomerId` is set, for invoices
- **Pro:**
  - "Pro · Monthly" or "Pro · Yearly"
  - "Renews on <date>", or "Cancels on <date>" when `cancelAtPeriodEnd`,
    using `formatLongDate`
  - "Payment past due — update your card" when `past_due`
  - **Manage billing**
- **Pro without a subscription** (for example, a hand-set `isPro`): "Pro"
  only, with no date and no Manage billing
- **Notices** via `FormNotice`:
  - `?checkout=success` → "Welcome to Pro."
  - `?checkout=cancelled` → "Checkout cancelled — you have not been charged."

### `src/components/settings/BillingButtons.tsx` (client) [§4.9]

- `UpgradeButton({ period, label })` and `ManageBillingButton()`, sharing a
  `useStripeRedirect` hook: call the action, show a toast on error, otherwise
  `window.location.assign(url)`
- The button stays disabled ("Redirecting..." / "Opening...") until the
  browser leaves, so it cannot be clicked twice

### `src/app/settings/page.tsx` [§5.7]

- Read `searchParams`: `checkout` and `session_id`
- On `checkout=success` with a `session_id`, run `syncCheckoutSession`
  **before** the billing reads, in a `try`/`catch` that logs. The sync is
  idempotent, so a refresh is harmless
- Add `getBillingUser` and `getUsageCounts` to the `Promise.all`, plus
  `getSubscriptionSummary` when `stripeSubscriptionId` is set
- Render `<BillingCard>` with `id="billing"` between Editor preferences and
  Change password. Update the page doc comment

## Feature Gating [§3, §5.4–5.6, §5.9]

### Server

- `src/lib/db/items.ts`: add `countUserItems(userId)`.
  `src/lib/db/collections.ts`: add `countUserCollections(userId)`. Both are
  scoped to the given user and are **not** the demo-scoped stats getters
- `createItem` (`src/actions/items.ts`):
  1. after Zod, `canCreateTypeSlug(typeSlug, isPro)`; refuse with
     `PRO_REQUIRED`
  2. inside the `try`, for Free only, `checkItemLimit(countUserItems(...))`
     (Pro skips the count query)
  3. add `upgradeRequired?: true` to the failure arm of `CreateItemResult`
- `createCollection` (`src/actions/collections.ts`): the same with
  `checkCollectionLimit`, and `upgradeRequired` on its result type.
  `updateCollection` and `deleteCollection` are not gated
- `POST /api/uploads`: right after the session check, and **before** the
  `content-length` check and `formData()`, refuse Free users with **403**
  ("File and image uploads are a Pro feature…"). `DELETE` is **not** gated,
  so a user downgraded mid-dialog can still discard an upload
- `isPro` comes from `session.user.isPro`, which Phase 1's `jwt` callback
  refreshes from the database on every `auth()` call
- Edit, favorite, pin, delete, download and viewing are never gated

### UI

- `(app)/layout.tsx`: use `getSessionUser()` and pass `isPro` to `TopBar`
  and `Sidebar`
- `NewItemDialog` / the type picker: for Free users, the **File** and
  **Image** buttons show a small `PRO` badge, are disabled, and have an
  explanatory `title`
- `/items/[type]/page.tsx`: on `/items/file` and `/items/image`, a Free
  user's New File / New Image button is disabled with an "Upgrade to Pro"
  hint
- `NewItemForm` and `NewCollectionDialog`: when `upgradeRequired` is set,
  `toast.error(error, { action: { label: "Upgrade", onClick: () =>
  router.push("/settings#billing") } })`
- `Sidebar.tsx`: delete the local `PRO_TYPE_SLUGS` and import it from
  `@/lib/usage-limits`. Hide the `PRO` badges for Pro users

## Other Changes

- **`deleteAccount`** (`src/actions/profile.ts`) [§5.8]:
  - select `stripeCustomerId`
  - if it is set, run `cancelCustomerSubscriptions` **before** the delete
  - if that fails, return "We couldn't cancel your subscription, so your
    account was not deleted…" and **do not delete**
  - update the dialog copy: "Any Pro subscription is cancelled immediately,
    without a refund for the remaining period."
- **`scripts/delete-users.ts`**: cancel subscriptions for users with a
  `stripeCustomerId` before deleting them, and list them in the dry run
- **Homepage pricing** (`PricingPlans.tsx`, `PricingSection.tsx`) [§5.10]:
  pass `signedIn` from `src/app/page.tsx`. A signed-in user's Pro CTA goes to
  `/settings#billing`. Update the "Billing does not exist yet" comment
- **`src/lib/plans.ts`** [§5.11]:
  - drop "Image uploads" from `FREE_PLAN.features`
  - change Pro's "File uploads" to "File and image uploads"
  - rewrite the header comment: the limits are enforced, and the prices must
    match Stripe's
- **`context/project-overview.md`**: in the Monetization table, Free has no
  uploads and Pro has "File and image uploads"

## Stripe Dashboard (test mode) [§6]

- **Customer Portal:**
  - update payment method, invoice history and billing details
  - cancel **at end of period**
  - switch between the monthly and yearly DevStash Pro prices
- **Subscriptions and emails:**
  - Smart Retries on
  - **cancel the subscription when all retries fail**
  - failed-payment emails on
- **Stripe CLI:**

  ```bash
  stripe login
  stripe listen --forward-to localhost:3000/api/webhooks/stripe \
    --events checkout.session.completed,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,customer.subscription.paused,customer.subscription.resumed
  ```

  Put the printed `whsec_…` in `.env` as `STRIPE_WEBHOOK_SECRET`. It is
  **not** the Dashboard endpoint's secret. Restart `next dev` after changing
  it
- The production webhook endpoint and live mode come later, at deploy time
  (plan §6, steps 4, 5 and 7)

## Unit Tests

| File | Covers |
| --- | --- |
| `src/lib/billing.test.ts` (extend) | `handleStripeEvent`: each subscription event syncs its customer; `checkout.session.completed` syncs in `subscription` mode and is ignored in `payment` mode; unknown types do nothing; sync errors propagate. `syncCheckoutSession` ignores another user's session and a session with no customer |
| `src/actions/items.test.ts` (extend) | Free at 49 is allowed and Free at 50 is refused with `upgradeRequired`. Pro at 500 is allowed and **no count query runs**. Free is refused `file` and `image`, and allowed `snippet` |
| `src/actions/collections.test.ts` (extend) | Free at 2 is allowed; Free at 3 is refused with `upgradeRequired`; Pro is allowed |
| `src/actions/profile.test.ts` (extend) | `deleteAccount` cancels before deleting (`invocationCallOrder`), skips Stripe with no customer, and keeps the account when cancelling throws |

**Fix the existing mocks first.** The `auth()` sessions in
`items.test.ts`, `collections.test.ts` and any others have no `isPro`, so
they now read as Free and hit the new count. Give them `isPro: true`, or mock
`countUserItems` / `countUserCollections`.

The webhook route and the components are not unit-tested, per the coding
standards. The route is thin; its logic is `handleStripeEvent`.

## Testing (Stripe CLI + browser)

Run `npm run dev` and `stripe listen` together, using a non-demo test
account. Only the Neon **development** branch is used.

**Upgrade**

1. A Free account's `/settings` shows the Free plan with correct usage and
   both upgrade buttons
2. Upgrade monthly with `4242 4242 4242 4242`:
   - it lands on `?checkout=success` showing **Pro · Monthly** with a
     renewal date on the first render
   - `stripe listen` shows 200s
   - the row has `isPro`, `stripeCustomerId` and `stripeSubscriptionId` set
3. Without signing out, the account can upload a file and an image, and
   create a 51st item and a 4th collection
4. Upgrade yearly with a second account shows **Pro · Yearly**. 3-D Secure
   with `4000 0025 0000 3155` passes. A decline with `4000 0000 0000 9995`
   stays Free
5. Cancelling in Checkout shows the `?checkout=cancelled` notice, and the
   account stays Free with no subscription
6. With `stripe listen` stopped, checkout still shows Pro through the
   success-page sync. Restarting `listen` and replaying the events changes
   nothing

**Portal and lifecycle**

7. Manage billing opens the Portal, and returning lands on `/settings`
8. Switching monthly → yearly shows **Pro · Yearly** after the webhook
9. Cancelling shows "Cancels on <date>" while still Pro. Ending it (from the
   Dashboard, or with a test clock) makes the account Free, and the limits
   apply again
10. Failed renewal, with a test clock or `4000 0000 0000 0341`: `past_due`
    shows the warning and keeps Pro; after retries fail the subscription is
    `canceled` and the account is Free

**Webhook robustness**

11. No signature → 400; a wrong signature → 400; the database is unchanged
12. `STRIPE_WEBHOOK_SECRET` unset → 500 plus a log line
13. `stripe events resend` of an old `updated` event after cancellation
    leaves the account Free
14. An event for an unknown customer → 200 plus a warning

**Gating (Free account)**

15. At 50 items, New Item is refused with the limit message and an
    **Upgrade** action that opens `/settings#billing`. At 3 collections, New
    Collection is refused the same way
16. File and Image are disabled with `PRO` in the type picker, and New File /
    New Image are disabled on their pages. The other five types still create
17. `curl` to `/api/uploads` with `kind=file` or `kind=image` → **403** for
    Free and 201 for Pro. A crafted `createItem` with `typeSlug: "image"` is
    refused
18. After a downgrade, existing items, files and images still open, edit,
    delete and download, and the Images gallery still renders
19. The sidebar `PRO` badges show for Free and are hidden for Pro

**Other**

20. A GitHub-only account can upgrade, and Checkout is prefilled with its
    email
21. Deleting a Pro account cancels the subscription in Stripe first. With a
    bad `STRIPE_SECRET_KEY`, the delete is refused and the account is kept
22. Homepage: signed-out Pro CTA → `/register`; signed-in → `/settings#billing`.
    The Free card lists no uploads
23. At 390px the Billing card has no horizontal scroll, and its buttons stack
24. `npm test`, `npx tsc --noEmit`, `npm run lint` and `npm run build` pass.
    The build registers `ƒ /api/webhooks/stripe`, and `/settings` stays `ƒ`

## Notes

- **Raise at load time: the demo account.** `seed-user-demo` is Free and
  already has image items, so after this phase it cannot create images or
  files. Setting `isPro: true` in `prisma/seed.ts` is optional; it would show
  the "Pro without a subscription" card state
- **Limits are soft.** Two creates at the same moment at 49 items can both
  pass. This is accepted
- **Two open Checkout tabs can create two subscriptions.** The sync handles
  it (the newest entitling one wins), but the user is charged twice. Expiring
  open sessions before creating a new one is a possible follow-up; it is not
  in scope
- The item lists and sidebar counts are still demo-scoped. Limits count the
  signed-in user's own rows, so for a non-demo account the numbers shown and
  the numbers enforced can differ. This predates this phase
- `AUTH_URL` must be set in production, or the Checkout return URLs point at
  localhost
- Vercel's 4.5 MB body cap now affects Pro uploads only
- Not in scope: AI, custom types and export. Each should start with the
  `isPro` guard (plan §3.4)

## References

- `docs/stripe-integration-plan.md`
- Stripe webhooks: https://docs.stripe.com/webhooks
- Stripe CLI: https://docs.stripe.com/stripe-cli
- Testing cards and test clocks: https://docs.stripe.com/testing,
  https://docs.stripe.com/billing/testing/test-clocks
