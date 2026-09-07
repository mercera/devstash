import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Rate limiting for the public auth surfaces.
 *
 * Every limit is a sliding window in Upstash Redis, keyed by client IP — plus
 * the submitted email where the target is a specific account rather than the
 * endpoint as a whole.
 *
 * Two properties this module guarantees, both of them deliberate:
 *
 * 1. **It fails open.** If Upstash is unreachable, slow, or simply not
 *    configured, the request is allowed. A rate limiter that fails closed turns
 *    a Redis outage into a total sign-in outage, which is a far worse failure
 *    than a window of unthrottled attempts.
 * 2. **The configuration is read per call, never captured at module load.** A
 *    module-scope client would be constructed while `next build` collects page
 *    data, freezing whatever environment the build machine had into the output.
 *    Same reasoning as `src/lib/flags.ts`.
 */

/** The limits, straight from `context/features/rate-limiting-spec.md`. */
const LIMITS = {
  signIn: { tokens: 5, window: "15 m" },
  register: { tokens: 3, window: "1 h" },
  forgotPassword: { tokens: 3, window: "1 h" },
  resetPassword: { tokens: 5, window: "15 m" },
  resendVerification: { tokens: 3, window: "15 m" },
} as const satisfies Record<string, { tokens: number; window: `${number} ${string}` }>;

export type RateLimitName = keyof typeof LIMITS;

export interface RateLimitResult {
  /** Whether the caller may proceed. */
  success: boolean;
  /** Attempts left in the current window. */
  remaining: number;
  /** Unix epoch milliseconds at which the window resets. */
  reset: number;
}

/**
 * Limiters are built once and reused, but only ever on a call — never at import
 * time. A failed build is not cached, so a deploy that gains its Upstash
 * credentials later starts limiting without a restart.
 */
const limiters = new Map<RateLimitName, Ratelimit>();

/**
 * Shared across every limiter so a caller already known to be blocked is
 * refused without a Redis round trip.
 */
const ephemeralCache = new Map<string, number>();

let cachedCredentials: string | undefined;

function getLimiter(name: RateLimitName): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  // Unconfigured is a supported state, not an error: local checkouts and any
  // deploy without the two variables simply run unlimited. Warning on every
  // call would bury the log, so this is silent by design — see `.env.example`.
  if (!url || !token) {
    return null;
  }

  // Credentials that change out from under a warm process must not keep using
  // the old connection, so the whole cache is dropped rather than reused.
  const credentials = `${url}\u0000${token}`;

  if (credentials !== cachedCredentials) {
    limiters.clear();
    cachedCredentials = credentials;
  }

  const existing = limiters.get(name);

  if (existing) {
    return existing;
  }

  const { tokens, window } = LIMITS[name];
  const limiter = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(tokens, window),
    // Namespaced per limit so the five windows count independently, and per app
    // so a shared Upstash database does not collide with another project.
    prefix: `devstash:ratelimit:${name}`,
    // Analytics writes an extra key per request against the free tier's 10k/day
    // budget, and nothing in the app reads it.
    analytics: false,
    ephemeralCache,
  });

  limiters.set(name, limiter);

  return limiter;
}

/** The answer whenever the limiter cannot speak — see the fail-open note above. */
function allowed(): RateLimitResult {
  return { success: true, remaining: Number.POSITIVE_INFINITY, reset: Date.now() };
}

/**
 * Consumes one attempt against `name` for `identifier`.
 *
 * Call this *before* any work that depends on who the caller is — a limiter
 * that only runs for addresses that turn out to exist would announce which
 * addresses exist.
 */
export async function checkRateLimit(
  name: RateLimitName,
  identifier: string,
): Promise<RateLimitResult> {
  const limiter = getLimiter(name);

  if (!limiter) {
    return allowed();
  }

  try {
    const { success, remaining, reset } = await limiter.limit(identifier);

    return { success, remaining, reset };
  } catch (error) {
    console.error(`Rate limit check failed for "${name}", allowing request:`, error);

    return allowed();
  }
}

/**
 * The client's address, for use as a rate limit key.
 *
 * `x-forwarded-for` holds the proxy chain, of which the **first** entry is the
 * original client; the rest were added by hops in between. The header is
 * trivially forged by a client talking to the origin directly, so this is only
 * as trustworthy as the proxy in front of it — on Vercel that proxy overwrites
 * the header, which is what makes it usable here.
 *
 * Falls back to a constant rather than to no limit at all: an unattributable
 * caller sharing one bucket is a blunt limit, but it is still a limit.
 */
export function getClientIp(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for");

  if (forwardedFor) {
    const client = forwardedFor.split(",")[0]?.trim();

    if (client) {
      return client;
    }
  }

  return headers.get("x-real-ip")?.trim() || "unknown";
}

/** Combines the caller's address with the account they are aiming at. */
export function ipAndEmailKey(ip: string, email: string): string {
  return `${ip}:${email.trim().toLowerCase()}`;
}

/**
 * Whole seconds until the window resets, for the `Retry-After` header.
 *
 * This is a floor, not a promise. Upstash reports `reset` as the end of the
 * current fixed bucket -- `(currentWindow + 1) * windowDuration` in
 * `slidingWindow` -- while the sliding calculation keeps weighting the
 * previous bucket past that boundary, so a caller can still be refused just
 * after the time quoted here. The library exposes nothing better, and the
 * failure is self-correcting: retrying early earns another refusal carrying a
 * fresh, smaller figure. Nobody is ever held longer than the window itself.
 */
export function retryAfterSeconds(reset: number): number {
  return Math.max(1, Math.ceil((reset - Date.now()) / 1000));
}

/**
 * How long to wait, in words — `45 seconds`, `1 minute`, `2 hours`.
 *
 * The windows here span 15 minutes to an hour, so a fixed unit would read
 * badly at one end or the other.
 */
function formatRetryDelay(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} ${seconds === 1 ? "second" : "seconds"}`;
  }

  const minutes = Math.ceil(seconds / 60);

  if (minutes < 60) {
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
  }

  const hours = Math.ceil(minutes / 60);

  return `${hours} ${hours === 1 ? "hour" : "hours"}`;
}

/** The single message every rate-limited surface shows. */
export function rateLimitMessage(seconds: number): string {
  return `Too many attempts. Please try again in ${formatRetryDelay(seconds)}.`;
}
