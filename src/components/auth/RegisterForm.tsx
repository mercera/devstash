"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { FieldError, FormError } from "@/components/auth/FieldError";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MIN_PASSWORD_LENGTH, registerSchema } from "@/lib/validations/auth";

type FieldName = "name" | "email" | "password" | "confirmPassword";
type FieldIssues = Partial<Record<FieldName, string[]>>;

/** The subset of `/api/auth/register`'s failure body this form reads. */
interface RegisterErrorBody {
  error?: string;
  issues?: FieldIssues;
}

/** Where a created account is sent. `registered` drives the sign-in notice. */
const SIGN_IN_AFTER_REGISTER = "/sign-in?registered=1";

export function RegisterForm() {
  const router = useRouter();
  const [issues, setIssues] = useState<FieldIssues>({});
  const [error, setError] = useState<string>();
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const parsed = registerSchema.safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    });

    // Checked here for instant feedback; the route re-validates with the same
    // schema, so nothing depends on this pass having run.
    if (!parsed.success) {
      setIssues(parsed.error.flatten().fieldErrors);
      setError("Please check the details you entered");
      return;
    }

    setIssues({});
    setError(undefined);
    setIsPending(true);

    let created = false;

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      if (response.status === 201) {
        created = true;
        router.push(SIGN_IN_AFTER_REGISTER);
        return;
      }

      const body: RegisterErrorBody = await response.json().catch(() => ({}));

      setError(body.error ?? "Something went wrong. Please try again.");
      setIssues(body.issues ?? {});
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      // Left disabled on success — the navigation is already under way and
      // re-enabling would invite a second submit.
      if (!created) {
        setIsPending(false);
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <FormError message={error} />

      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          autoComplete="name"
          placeholder="Ada Lovelace"
          aria-invalid={Boolean(issues.name)}
          className="h-9"
        />
        <FieldError messages={issues.name} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          aria-invalid={Boolean(issues.email)}
          className="h-9"
        />
        <FieldError messages={issues.email} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(issues.password)}
          className="h-9"
        />
        <FieldError messages={issues.password} />
        {!issues.password && (
          <p className="text-xs text-muted-foreground">
            At least {MIN_PASSWORD_LENGTH} characters.
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(issues.confirmPassword)}
          className="h-9"
        />
        <FieldError messages={issues.confirmPassword} />
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={isPending}>
        {isPending && <Loader2 className="animate-spin" />}
        {isPending ? "Creating account..." : "Create account"}
      </Button>
    </form>
  );
}
