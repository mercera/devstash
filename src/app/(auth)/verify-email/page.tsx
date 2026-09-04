import type { Metadata } from "next";
import Link from "next/link";
import { MailCheck, MailWarning, MailX } from "lucide-react";

import { ResendVerificationForm } from "@/components/auth/ResendVerificationForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { VERIFICATION_TOKEN_TTL_HOURS } from "@/lib/email-verification";

export const metadata: Metadata = {
  title: "Verify your email · DevStash",
};

/**
 * Every state this page can be in. `pending` is the one reached straight after
 * registering; the other two are where `/api/auth/verify-email` sends a link it
 * could not honour.
 */
type State = "pending" | "unsent" | "expired" | "invalid";

// The icon is held as an element rather than a component reference: binding a
// component to a local and rendering `<Icon />` trips `react-hooks/static-components`.
const STATES = {
  pending: {
    icon: <MailCheck className="size-6 text-emerald-500" aria-hidden />,
    title: "Check your email",
    description: `We sent you a link to confirm your address. It expires in ${VERIFICATION_TOKEN_TTL_HOURS} hours.`,
    submitLabel: "Resend verification email",
  },
  unsent: {
    icon: <MailWarning className="size-6 text-amber-500" aria-hidden />,
    title: "We couldn't send that email",
    description:
      "Your account was created, but the verification email did not go out. Try sending it again.",
    submitLabel: "Send verification email",
  },
  expired: {
    icon: <MailWarning className="size-6 text-amber-500" aria-hidden />,
    title: "That link has expired",
    description: `Verification links are good for ${VERIFICATION_TOKEN_TTL_HOURS} hours. Request a new one below.`,
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

function resolveState(error: string | undefined, sent: string | undefined): State {
  if (error === "expired" || error === "invalid") {
    return error;
  }

  return sent === "0" ? "unsent" : "pending";
}

export default async function VerifyEmailPage({ searchParams }: PageProps<"/verify-email">) {
  const params = await searchParams;

  const state = resolveState(firstParam(params.error), firstParam(params.sent));
  const { icon, title, description, submitLabel } = STATES[state];

  const email = firstParam(params.email);

  return (
    <Card>
      <CardHeader>
        {icon}
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription>
          {description}
          {state === "pending" && email && (
            <>
              {" "}
              Sent to <span className="text-foreground">{email}</span>.
            </>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        <ResendVerificationForm defaultEmail={email} submitLabel={submitLabel} />

        <p className="text-center text-sm text-muted-foreground">
          Already verified?{" "}
          <Link href="/sign-in" className="font-medium text-foreground hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
