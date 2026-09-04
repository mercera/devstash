/**
 * Runtime feature flags.
 *
 * Every flag is read through a function here rather than from `process.env` at
 * the call site, so there is exactly one place to change if the mechanism ever
 * moves — to a database row, a config service, or per-user gating.
 *
 * They are read **per call**, not captured at module load. A module-scope
 * constant would be evaluated while `next build` is collecting page data and
 * could be baked into the output, which would quietly turn a runtime toggle
 * into a build-time one.
 *
 * These are server-only. Nothing here is prefixed `NEXT_PUBLIC_`, so no flag
 * value reaches the browser; a client component that needs to branch on one
 * gets the answer from a server response instead.
 */

/** Values that mean "off". Anything else — including unset — means "on". */
const FALSY = new Set(["false", "0", "off", "no"]);

/**
 * Parses a flag that is **on unless explicitly disabled**.
 *
 * Defaulting to on matters: a variable that is missing, misspelled or dropped
 * during a deploy must not silently switch a protection off. The cost is that
 * turning something off takes a deliberate, visible setting.
 */
function isEnabledUnlessDisabled(value: string | undefined): boolean {
  return value === undefined || !FALSY.has(value.trim().toLowerCase());
}

/**
 * Whether a new password account must confirm its email address before it can
 * sign in.
 *
 * Turn this off (`EMAIL_VERIFICATION_ENABLED="false"`) while Resend has no
 * verified domain: the sandbox sender only delivers to the Resend account
 * owner, so with verification required nobody else can complete a sign-up.
 *
 * Off means registration sends no email and the sign-in gate is skipped. It
 * does **not** invalidate links that were already issued while it was on —
 * see `src/app/api/auth/verify-email/route.ts`.
 *
 * GitHub OAuth is unaffected either way; the gate only ever applied to the
 * credentials provider.
 */
export function isEmailVerificationEnabled(): boolean {
  return isEnabledUnlessDisabled(process.env.EMAIL_VERIFICATION_ENABLED);
}
