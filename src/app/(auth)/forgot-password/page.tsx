import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound, MailWarning, MailX } from "lucide-react";

import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatHours } from "@/lib/format";
import { PASSWORD_RESET_TOKEN_TTL_HOURS } from "@/lib/password-reset";

export const metadata: Metadata = {
  title: "Forgot password · DevStash",
};

/**
 * Every state this page can be in. `request` is the one reached from the
 * sign-in form; the other two are where a link that could not be honoured — by
 * `/reset-password` on arrival, or by the action on submit — sends the visitor.
 */
type State = "request" | "expired" | "invalid";

// The icon is held as an element rather than a component reference: binding a
// component to a local and rendering `<Icon />` trips `react-hooks/static-components`.
const STATES = {
  request: {
    icon: <KeyRound className="size-6 text-muted-foreground" aria-hidden />,
    title: "Forgot your password?",
    description: `Enter your email and we'll send you a link to choose a new one. It expires in ${formatHours(PASSWORD_RESET_TOKEN_TTL_HOURS)}.`,
    submitLabel: "Send reset link",
  },
  expired: {
    icon: <MailWarning className="size-6 text-amber-500" aria-hidden />,
    title: "That link has expired",
    description: `Reset links are good for ${formatHours(PASSWORD_RESET_TOKEN_TTL_HOURS)}. Request a new one below.`,
    submitLabel: "Send a new link",
  },
  invalid: {
    icon: <MailX className="size-6 text-destructive" aria-hidden />,
    title: "That link isn't valid",
    description:
      "It may have already been used, or been cut short by your email client. Request a new one below.",
    submitLabel: "Send a new link",
  },
} satisfies Record<State, unknown>;

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function resolveState(error: string | undefined): State {
  return error === "expired" || error === "invalid" ? error : "request";
}

/**
 * Deliberately does **not** bounce a signed-in visitor to the dashboard the way
 * `/sign-in` and `/register` do. Sessions are JWTs that outlive most people's
 * memory of the password behind them, and until a profile page exists this is
 * the only way to change one. Asking to reset is meaningful with a live session
 * in a way that asking to sign in is not.
 */
export default async function ForgotPasswordPage({
  searchParams,
}: PageProps<"/forgot-password">) {
  const params = await searchParams;

  const state = resolveState(firstParam(params.error));
  const { icon, title, description, submitLabel } = STATES[state];

  return (
    <Card>
      <CardHeader>
        {icon}
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        <ForgotPasswordForm defaultEmail={firstParam(params.email)} submitLabel={submitLabel} />

        <p className="text-center text-sm text-muted-foreground">
          Remembered it?{" "}
          <Link href="/sign-in" className="font-medium text-foreground hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
