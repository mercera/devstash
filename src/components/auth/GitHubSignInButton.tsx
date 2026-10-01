import { signInWithGitHub } from "@/actions/auth";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { GitHubIcon } from "@/components/brand/BrandIcons";

/**
 * Starts the GitHub OAuth handoff. A form rather than an onClick so the server
 * action runs without shipping a client-side `signIn` — the whole flow is a
 * POST followed by a redirect.
 *
 * Signing up and signing in are the same handoff — Auth.js creates the account
 * on a first visit — so only the label differs between `/register` and
 * `/sign-in`.
 */
export function GitHubSignInButton({
  callbackUrl,
  label = "Sign in with GitHub",
}: {
  callbackUrl: string;
  label?: string;
}) {
  return (
    <form action={signInWithGitHub}>
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <SubmitButton
        variant="outline"
        size="lg"
        className="w-full"
        pendingLabel="Redirecting..."
      >
        <GitHubIcon />
        {label}
      </SubmitButton>
    </form>
  );
}
