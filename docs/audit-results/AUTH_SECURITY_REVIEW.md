# Auth Security Review

**Last audited:** 2026-09-07
**Scope:** NextAuth v5 credentials + GitHub OAuth, email verification,
password reset, profile page
**Auditor:** auth-auditor

## Summary

Reviewed the full auth surface: `src/auth.ts`/`auth.config.ts`/`proxy.ts`, the
credentials and GitHub providers, `src/lib/tokens.ts`,
`src/lib/email-verification.ts`, `src/lib/password-reset.ts`,
`src/lib/password.ts`, the register/verify-email routes, all `src/actions/*`,
the profile page and actions, `prisma/schema.prisma`, `scripts/delete-users.ts`
and `prisma/seed.ts`. One new defect was found (a real open redirect on the
sign-in page's already-authenticated bounce), and one previously-documented
limitation (bcrypt's 72-byte truncation vs. the character-based length check)
was re-confirmed. Everything else — token handling, write-path authorization,
session scoping on mutations, delete cascades, and the deliberate no-rate-limiting
posture — matches what `context/current-feature.md` already records. Counts:
0 Critical, 0 High, 2 Medium, 2 Low. The one thing worth fixing first is the
open redirect in `src/app/(auth)/sign-in/page.tsx`.

## Findings

### [Medium] Open redirect on `/sign-in` for already-authenticated visitors

- **File:** `src/app/(auth)/sign-in/page.tsx:62-74`
- **Issue:** The page computes its own `callbackUrl` from the query string
  with a weaker filter than the one used everywhere else in the app:
  ```ts
  const callbackUrl =
    requested?.startsWith("/") && !requested.startsWith("//")
      ? requested
      : DEFAULT_CALLBACK_URL;
  ...
  if (session?.user) {
    redirect(callbackUrl);
  }
  ```
  This only rejects a literal `//`. It does not reject `/\evil.com` (a single
  slash followed by a backslash), which `src/actions/auth.ts`'s `toSafeRedirect`
  *does* reject via `/^\/[/\\]/`, precisely because browsers normalize a leading
  `/\` to `//` when parsing a URL (WHATWG URL spec; confirmed present-day
  behaviour in Chrome/Firefox — see sources below). When a session already
  exists, this unsanitized value is passed straight to Next's `redirect()`,
  bypassing `toSafeRedirect` entirely — that function is only ever applied to
  the value inside `SignInForm`'s hidden field and `GitHubSignInButton`'s hidden
  field, not to this early bounce.
- **Exploit:** An attacker sends a signed-in victim a link to
  `https://devstash.example/sign-in?callbackUrl=/\evil.com`. The victim already
  has a valid session cookie. The page's `if (session?.user) redirect(callbackUrl)`
  branch fires immediately with no form submission, and the server issues a
  redirect to `/\evil.com`. The browser's URL parser normalizes the leading
  `/\` to `//`, producing a protocol-relative redirect to `https://evil.com`.
  The victim lands on an attacker-controlled page that can impersonate DevStash
  for phishing (e.g., a fake re-auth prompt), with no visible warning beyond the
  URL bar.
- **Fix:** Reuse the same guard everywhere a callback URL is trusted. Either
  import and call `toSafeRedirect`-equivalent logic in the page, or centralize
  the check (e.g. move `toSafeRedirect` into `src/lib/routes.ts` so both the
  page and the server actions import one implementation):
  ```ts
  const callbackUrl =
    requested?.startsWith("/") && !/^\/[/\\]/.test(requested)
      ? requested
      : DEFAULT_CALLBACK_URL;
  ```
  Having two independently-maintained copies of this check is what let them
  drift; a single shared helper removes the class of bug, not just this instance.

### [Medium] bcrypt 72-byte truncation allows distinct passwords to collide

- **File:** `src/lib/validations/auth.ts:10-22` (`MAX_PASSWORD_LENGTH = 72`)
- **Issue:** The length check counts UTF-16 *characters* via Zod's `.max(72)`,
  but bcrypt truncates at 72 *bytes*. A password with multi-byte characters can
  be under the 72-character limit while exceeding 72 bytes, so two different
  passwords sharing the same 72-byte prefix hash identically and either one
  authenticates the account.
- **Exploit:** Register with a password such as 60 ASCII characters followed by
  12 `é` characters (72 characters, 84 bytes). Any other password sharing the
  same first 72 bytes — including one with a different tail — compares equal
  via `bcrypt.compare` and signs in successfully. This narrows the effective
  password space for accounts using multi-byte passwords near the length cap,
  and could let an attacker who knows/guesses the byte-truncated prefix sign in
  without knowing the victim's exact chosen password.
- **Fix:** Validate byte length, not character length, e.g.
  `Buffer.byteLength(value, "utf8") <= 72` (or `new TextEncoder().encode(value).length`)
  in a Zod `.refine()`, applied consistently to `registerSchema`,
  `resetPasswordSchema` and `changePasswordSchema`'s `password` field.
- **Known:** Already recorded in `context/current-feature.md` under "Auth
  Credentials — Email/Password Provider (Phase 2) — Completed", which
  identifies the exact same collision and states it was "skipped by request as
  low impact." Reported here per the audit brief's instruction that a
  documented limitation is still a finding, not "handled."

### [Low] No rate limiting on any unauthenticated write endpoint

- **Files:** `src/app/api/auth/register/route.ts`, credentials `authorize` in
  `src/auth.ts`, `resendVerificationEmail` and `requestPasswordResetEmail` in
  `src/actions/auth.ts`, `resetPassword` in the same file.
- **Issue:** None of sign-in, registration, resend-verification,
  forgot-password or reset-submit throttle repeated requests from the same
  caller. Sign-in and registration are brute-forceable; resend-verification and
  forgot-password additionally cost an outbound Resend send per call and are a
  spam/cost/reputation vector, not just a credential-guessing one.
- **Exploit:** An attacker scripts repeated `POST /api/auth/register` or
  credentials sign-in attempts with no backoff, or repeatedly triggers
  `requestPasswordResetEmail`/`resendVerificationEmail` for arbitrary or
  enumerated addresses to exhaust the Resend sending quota or annoy/harass a
  target inbox.
- **Fix:** Add a rate limiter (e.g. Upstash Ratelimit, or a Redis/Postgres
  sliding-window check) keyed by IP and/or email in front of these five
  endpoints, as the project's own notes call for.
- **Known:** Recorded repeatedly in `context/current-feature.md` — first
  under "Auth Credentials — Email/Password Provider (Phase 2)" ("No rate
  limiting... worth a dedicated pass"), and reiterated under Phase 3, "Email
  Verification on Register" and "Forgot Password" as still outstanding.

### [Low] Sessions are not invalidated after a password change, reset, or account deletion's precursor state

- **Files:** `src/actions/profile.ts:changePassword`,
  `src/lib/password-reset.ts:resetPasswordWithToken`
- **Issue:** Sessions are JWTs (`session: { strategy: "jwt" }` in
  `src/auth.ts`), so there is no server-side session store to revoke from. An
  attacker who already holds a valid session cookie for an account — e.g. from
  a shared/compromised device, or a session fixed before the victim reset their
  password — keeps using that cookie until it naturally expires, even after the
  legitimate user changes their password via `/profile` or via a password-reset
  link.
- **Exploit:** Attacker obtains a session cookie for the victim's account (any
  means: stolen device, XSS elsewhere, session left logged in on a public
  machine). Victim notices and changes their password (profile page) or resets
  it (forgot-password flow). Attacker's already-issued cookie is still accepted
  by `auth()` on every subsequent request — the account "recovery" did not
  evict them.
- **Fix:** Introduce a token/session version: add a `tokenVersion` (or similar)
  column to `User`, increment it on password change/reset, and check it in the
  `jwt`/`session` callback in `src/auth.ts`, rejecting a token whose embedded
  version is stale. Alternatively move to database sessions
  (`session: { strategy: "database" }`) so a change can delete `Session` rows
  outright.
- **Known:** Explicitly recorded as a known limitation in
  `context/current-feature.md` under both "Forgot Password" ("Sessions survive
  a reset... Revoking them needs a token version column... or database
  sessions") and "Profile Page" ("Sessions still survive both actions... unless
  changed from the password reset write-up").

## Passed Checks

- Passwords are hashed with bcrypt at a single, consistently-applied cost
  factor of 12 across every write path — registration
  (`src/app/api/auth/register/route.ts:9,93`), password reset
  (`src/lib/password.ts:11,14`), profile change-password (same module via
  `hashPassword`), and the seed script (`prisma/seed.ts:445`).
- Password comparison uses `bcrypt.compare`, a constant-time primitive, in both
  the credentials `authorize` (`src/auth.ts:58`) and the profile
  change-password action (`src/actions/profile.ts:89`).
- Emailed-link tokens are generated from a CSPRNG — `randomBytes(32)` —
  (`src/lib/tokens.ts:15`), giving 256 bits of entropy, never `Math.random` or
  a timestamp-derived value.
- Only the SHA-256 hash of a link token is ever persisted; the raw value exists
  solely in the outgoing email (`src/lib/tokens.ts:27-29`,
  `VerificationToken.token` comment in `prisma/schema.prisma:220-221`).
- Both emailed-link flows are single-use: consumption deletes the row first and
  treats a failed delete (lost race) as "invalid," so a replayed link cannot
  succeed twice (`src/lib/email-verification.ts:102-107`,
  `src/lib/password-reset.ts:159-164`).
- Expiry is enforced server-side on consumption, checked *after* the delete so
  an expired row is cleaned up rather than left to rot
  (`src/lib/email-verification.ts:109-112`,
  `src/lib/password-reset.ts:166-168`).
- The two emailed-link flows use disjoint, prefixed identifier namespaces
  (`email-verification:` / `password-reset:`) in the shared
  `VerificationToken` table, and each consumer explicitly refuses a token whose
  identifier doesn't start with its own prefix rather than deleting or acting
  on it (`src/lib/tokens.ts:49-64`,
  `src/lib/email-verification.ts:96-98`,
  `src/lib/password-reset.ts:120-122,153-155`).
- Password reset TTL (1 hour, `src/lib/password-reset.ts:19`) is intentionally
  shorter than email verification's (24 hours,
  `src/lib/email-verification.ts:11`), matching the higher stakes of a
  reset link.
- The reset token is claimed on submit, not on page render:
  `/reset-password` only reads/previews the token
  (`checkPasswordResetToken`), and `resetPasswordWithToken` re-validates
  existence and expiry independently at submit time rather than trusting the
  page's earlier read (`src/app/(auth)/reset-password/page.tsx:44`,
  `src/lib/password-reset.ts:143-168`).
- A password reset cannot attach a password to an OAuth-only account —
  `requestPasswordReset` no-ops when `user.password` is null
  (`src/lib/password-reset.ts:92-94`), and `resetPasswordWithToken` refuses the
  same way (`src/lib/password-reset.ts:177-179`).
- Change-password on the profile page refuses on an OAuth-only account rather
  than silently attaching a first password
  (`src/actions/profile.ts:85-87`), and the section is not even rendered for
  such an account (`src/app/profile/page.tsx:138`).
- The new password in both reset and change-password goes through the same
  validation rules and the same `hashPassword` cost as registration
  (`src/lib/validations/auth.ts:55-63,72-85`, both call
  `src/lib/password.ts:hashPassword`).
- Account enumeration is neutralized on both the resend-verification and
  forgot-password forms: identical replies for unknown/verified/OAuth-only
  addresses (`src/actions/auth.ts:143-145,164-192,199-201,220-240`), verified
  in the browser per `current-feature.md` to issue zero tokens for those cases.
- Delete-account confirmation is enforced server-side via Zod
  (`src/lib/validations/profile.ts:18-25`), re-checked inside the action
  (`src/actions/profile.ts:147-153`) independent of the disabled-button UI, and
  the destructive submit is a plain `Button` rather than `AlertDialogAction` so
  the dialog can't auto-close before the action runs
  (`src/components/profile/DeleteAccountDialog.tsx:90-97`).
- Account deletion is ordered correctly against the schema's cascade rules:
  items are deleted first to clear the `Restrict` on `Item.type`, then the
  `User` row cascades to collections/tags/custom types/`Account`/`Session`, and
  `VerificationToken` rows (which have no FK to `User`) are swept by hand via
  `linkTokenIdentifiersFor`, covering both link-token namespaces plus the bare
  address (`src/actions/profile.ts:155-172`,
  `prisma/schema.prisma:75,96,126,153,167-168,192,207`). `scripts/delete-users.ts`
  mirrors the same ordering and the same helper.
- Both profile actions resolve the acting user from the session
  (`requireUserId()` via `auth()`) on every call, never from a client-supplied
  id or a hardcoded id (`src/actions/profile.ts:26-30`), and the module's own
  comment explicitly calls out the risk of pointing a write at the demo id.
- The profile page never selects or serializes the password hash — it fetches
  a `hasPassword` boolean derived from the column server-side
  (`src/lib/db/user.ts:49-66`) and the `ProfileUser` type has no field for it
  (`src/types/index.ts:113-116`).
- A deleted account's still-valid JWT is handled: `getProfileUser()`/
  `getCurrentUser()` return null when the row is gone and the page redirects
  rather than rendering with nothing to show (`src/app/profile/page.tsx:50-52`,
  `src/lib/db/user.ts:17-19`).
- `/dashboard` and `/profile` are both covered by the proxy's matcher
  (`src/proxy.ts:38`); no other authenticated page currently exists in the app
  (confirmed by enumerating every `page.tsx`/`route.ts` under `src/app`).
- The credentials `authorize` returns `null` uniformly for unknown email, wrong
  password, and OAuth-only accounts, collapsing them into one generic
  `CredentialsSignin`; the one place it throws (unverified email) is only
  reachable after the password has already matched, so it discloses nothing an
  attacker didn't already establish (`src/auth.ts:54-67`, and see the
  extensive reasoning in `context/current-feature.md`).
- `EMAIL_VERIFICATION_ENABLED` is read per-call rather than captured at module
  load (avoiding the build-time-baking bug the project already hit once) and
  defaults to "on" if unset, so a dropped env var fails closed rather than open
  (`src/lib/flags.ts:19-49`).
- Turning the verification flag off does not retroactively strand accounts:
  `GET /api/auth/verify-email` is deliberately not gated on the flag, so a link
  already in an inbox from when verification was on still works
  (`src/app/api/auth/verify-email/route.ts:20-24`).
- GitHub OAuth cannot be used to launder an unverified credentials account into
  a session — the `emailVerified` gate in `authorize` only applies to the
  credentials provider; GitHub sign-in never calls `authorize` at all.
- `toSafeRedirect` in `src/actions/auth.ts:46-58` correctly rejects both
  `//evil.com` and the `/\evil.com` backslash-normalization trick, and is
  applied to every value that reaches Auth.js's own `signIn(...,{redirectTo})`
  call for both the credentials and GitHub form actions.
- Emailed HTML escapes the two dynamic, non-literal values it interpolates
  (`greeting`, `url`) before embedding them
  (`src/lib/email.ts:104-106,244-251`), preventing HTML injection via a
  attacker-supplied display name into the verification/reset email body.
- `?email=` query parameters reflected into `/verify-email` and
  `/forgot-password` page copy are rendered as React text content, not into an
  `href`, attribute, or `dangerouslySetInnerHTML`, so they carry no XSS risk
  despite being attacker-controlled.
- No Prisma `select` in the reviewed auth/profile code paths pulls a full user
  row across the RSC boundary or into an API response — `authorize`, register,
  `getCurrentUser`, and `getProfileUser` all use explicit narrow `select`
  clauses.
- CSRF, cookie flags, JWT/JWE signing, OAuth state/PKCE/nonce, and disabled
  automatic account linking are all Auth.js v5 defaults this project has not
  overridden, and were out of scope per the audit brief.

## Not Verified

- The browser-normalization behaviour underlying the `/sign-in` open redirect
  finding (leading `/\` → `//`) was confirmed via web search against current
  documentation of WHATWG URL parsing and real-world advisories describing the
  identical pattern, but was not reproduced live against a running instance of
  this app in a browser. The code-level bypass of `toSafeRedirect`'s protection
  is confirmed directly from source, independent of the browser behavior.
- Resend's actual delivery/rendering was not (and could not be) verified here —
  per `context/current-feature.md`, the sandbox sender only reaches the Resend
  account owner's address, and this remains unchanged.
