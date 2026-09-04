import { Resend } from "resend";

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

interface VerificationEmailInput {
  to: string;
  /** Used for the greeting only; falls back to a neutral one when null. */
  name: string | null;
  verifyUrl: string;
  expiresInHours: number;
}

/**
 * The "confirm your email address" message sent after registration.
 *
 * Styling is inline rather than Tailwind — mail clients strip `<style>` blocks
 * and none of them load the app's stylesheet, so the project's no-inline-styles
 * rule does not reach here. The palette is deliberately light: the app is dark
 * mode first, but an email has to read on a white background.
 */
export async function sendVerificationEmail({
  to,
  name,
  verifyUrl,
  expiresInHours,
}: VerificationEmailInput): Promise<boolean> {
  const greeting = name ? `Hi ${name},` : "Hi,";

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#18181b;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:480px;margin:0 auto;background-color:#ffffff;border-radius:12px;border:1px solid #e4e4e7;">
      <tr>
        <td style="padding:32px;">
          <p style="margin:0 0 24px;font-size:18px;font-weight:600;letter-spacing:-0.01em;">DevStash</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">${escapeHtml(greeting)}</p>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;">
            Confirm your email address to finish setting up your DevStash account.
          </p>
          <p style="margin:0 0 24px;">
            <a href="${escapeHtml(verifyUrl)}" style="display:inline-block;padding:11px 20px;background-color:#4f46e5;color:#ffffff;font-size:15px;font-weight:500;text-decoration:none;border-radius:8px;">Verify email address</a>
          </p>
          <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#52525b;">
            This link expires in ${expiresInHours} hours and can only be used once.
          </p>
          <p style="margin:0 0 24px;font-size:13px;line-height:1.6;color:#52525b;">
            If the button does not work, paste this into your browser:<br />
            <span style="word-break:break-all;color:#4f46e5;">${escapeHtml(verifyUrl)}</span>
          </p>
          <p style="margin:0;padding-top:20px;border-top:1px solid #e4e4e7;font-size:13px;line-height:1.6;color:#71717a;">
            Didn't create a DevStash account? You can ignore this email.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    greeting,
    "",
    "Confirm your email address to finish setting up your DevStash account:",
    verifyUrl,
    "",
    `This link expires in ${expiresInHours} hours and can only be used once.`,
    "",
    "Didn't create a DevStash account? You can ignore this email.",
  ].join("\n");

  return sendEmail({
    to,
    subject: "Verify your DevStash email address",
    html,
    text,
  });
}

/**
 * The name and the URL are both interpolated into markup, so neither may carry
 * raw angle brackets or quotes — a name is user input, and the URL holds a
 * base64url token that could otherwise break out of the `href`.
 */
function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
