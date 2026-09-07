import { Resend } from "resend";

import { formatHours } from "@/lib/format";

/**
 * Outbound email, through Resend.
 *
 * Every send is best-effort: a failure is logged and reported as `false` rather
 * than thrown, because no caller so far should fail its own request just
 * because a message could not be handed to the provider. Registration in
 * particular must still create the account — the user can ask for another link.
 *
 * `onboarding@resend.dev` is Resend's shared sandbox sender. It works with no
 * domain set up, but **only delivers to the Resend account owner's own
 * address**; every other recipient is accepted by the API and silently
 * discarded. Set `EMAIL_FROM` to an address on a verified domain to send for
 * real.
 */
const DEFAULT_FROM = "DevStash <onboarding@resend.dev>";

let client: Resend | undefined;

function getClient(): Resend | undefined {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return undefined;
  }

  client ??= new Resend(apiKey);

  return client;
}

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  /** Plain-text alternative. Required — a body without one lands in spam. */
  text: string;
}

/** Sends one message. Returns whether Resend accepted it. */
export async function sendEmail({ to, subject, html, text }: SendEmailInput): Promise<boolean> {
  const resend = getClient();

  if (!resend) {
    console.error("RESEND_API_KEY is not set — no email was sent to", to);

    return false;
  }

  try {
    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM ?? DEFAULT_FROM,
      to,
      subject,
      html,
      text,
    });

    // The SDK reports provider failures in the payload rather than by throwing.
    if (error) {
      console.error("Resend rejected the message:", error);

      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to reach Resend:", error);

    return false;
  }
}

/**
 * The shape both of this app's transactional emails take: a greeting, one line
 * of explanation, a button holding a single-use link, and a note about how long
 * it lasts.
 *
 * `intro` carries no trailing punctuation — the HTML ends it with a full stop
 * and the plain-text version with a colon, since the URL follows it on the next
 * line there.
 */
interface ActionEmailInput {
  greeting: string;
  intro: string;
  buttonLabel: string;
  url: string;
  expiresInHours: number;
  /** Closing line for someone who did not ask for this message. */
  footer: string;
}

/**
 * Renders the message body.
 *
 * Styling is inline rather than Tailwind — mail clients strip `<style>` blocks
 * and none of them load the app's stylesheet, so the project's no-inline-styles
 * rule does not reach here. The palette is deliberately light: the app is dark
 * mode first, but an email has to read on a white background.
 *
 * Only `greeting` and `url` are escaped. They are the two values that are not
 * literals written here — the greeting carries a user-supplied name, and the
 * URL carries a base64url token that could otherwise break out of the `href`.
 */
function renderActionEmailHtml({
  greeting,
  intro,
  buttonLabel,
  url,
  expiresInHours,
  footer,
}: ActionEmailInput): string {
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#18181b;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:480px;margin:0 auto;background-color:#ffffff;border-radius:12px;border:1px solid #e4e4e7;">
      <tr>
        <td style="padding:32px;">
          <p style="margin:0 0 24px;font-size:18px;font-weight:600;letter-spacing:-0.01em;">DevStash</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">${escapeHtml(greeting)}</p>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;">
            ${intro}.
          </p>
          <p style="margin:0 0 24px;">
            <a href="${escapeHtml(url)}" style="display:inline-block;padding:11px 20px;background-color:#4f46e5;color:#ffffff;font-size:15px;font-weight:500;text-decoration:none;border-radius:8px;">${buttonLabel}</a>
          </p>
          <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#52525b;">
            This link expires in ${formatHours(expiresInHours)} and can only be used once.
          </p>
          <p style="margin:0 0 24px;font-size:13px;line-height:1.6;color:#52525b;">
            If the button does not work, paste this into your browser:<br />
            <span style="word-break:break-all;color:#4f46e5;">${escapeHtml(url)}</span>
          </p>
          <p style="margin:0;padding-top:20px;border-top:1px solid #e4e4e7;font-size:13px;line-height:1.6;color:#71717a;">
            ${footer}
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** The plain-text alternative for the same message. */
function renderActionEmailText({
  greeting,
  intro,
  url,
  expiresInHours,
  footer,
}: ActionEmailInput): string {
  return [
    greeting,
    "",
    `${intro}:`,
    url,
    "",
    `This link expires in ${formatHours(expiresInHours)} and can only be used once.`,
    "",
    footer,
  ].join("\n");
}

/** Falls back to a neutral greeting when the account has no name. */
function greet(name: string | null): string {
  return name ? `Hi ${name},` : "Hi,";
}

interface VerificationEmailInput {
  to: string;
  /** Used for the greeting only; falls back to a neutral one when null. */
  name: string | null;
  verifyUrl: string;
  expiresInHours: number;
}

/** The "confirm your email address" message sent after registration. */
export async function sendVerificationEmail({
  to,
  name,
  verifyUrl,
  expiresInHours,
}: VerificationEmailInput): Promise<boolean> {
  const content: ActionEmailInput = {
    greeting: greet(name),
    intro: "Confirm your email address to finish setting up your DevStash account",
    buttonLabel: "Verify email address",
    url: verifyUrl,
    expiresInHours,
    footer: "Didn't create a DevStash account? You can ignore this email.",
  };

  return sendEmail({
    to,
    subject: "Verify your DevStash email address",
    html: renderActionEmailHtml(content),
    text: renderActionEmailText(content),
  });
}

interface PasswordResetEmailInput {
  to: string;
  /** Used for the greeting only; falls back to a neutral one when null. */
  name: string | null;
  resetUrl: string;
  expiresInHours: number;
}

/**
 * The "choose a new password" message.
 *
 * The footer is firmer than the verification one: an unexpected reset email is
 * a signal worth reading, so it says plainly that nothing has changed yet
 * rather than just inviting the reader to ignore it.
 */
export async function sendPasswordResetEmail({
  to,
  name,
  resetUrl,
  expiresInHours,
}: PasswordResetEmailInput): Promise<boolean> {
  const content: ActionEmailInput = {
    greeting: greet(name),
    intro: "Use the link below to choose a new password for your DevStash account",
    buttonLabel: "Reset password",
    url: resetUrl,
    expiresInHours,
    footer:
      "Didn't ask to reset your password? You can ignore this email — your password has not changed.",
  };

  return sendEmail({
    to,
    subject: "Reset your DevStash password",
    html: renderActionEmailHtml(content),
    text: renderActionEmailText(content),
  });
}

/** Makes a value safe to interpolate into markup or an attribute. */
function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
