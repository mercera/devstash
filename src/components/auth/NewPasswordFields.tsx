import { AuthFormField } from "@/components/auth/AuthFormField";
import { PASSWORD_LENGTH_HINT } from "@/lib/validations/auth";

interface NewPasswordFieldsProps {
  /** Per-field messages from the action or the client-side check. */
  issues?: { password?: string[]; confirmPassword?: string[] };
  label?: string;
  confirmLabel?: string;
  /** Off for a `noValidate` form whose own check reports blanks. */
  required?: boolean;
}

/**
 * The new password and its confirmation, posted as `password` and
 * `confirmPassword`, with the length hint under the first.
 */
export function NewPasswordFields({
  issues,
  label = "New password",
  confirmLabel = "Confirm new password",
  required = true,
}: NewPasswordFieldsProps) {
  return (
    <>
      <AuthFormField
        name="password"
        label={label}
        type="password"
        autoComplete="new-password"
        issues={issues?.password}
        hint={PASSWORD_LENGTH_HINT}
        required={required}
      />

      <AuthFormField
        name="confirmPassword"
        label={confirmLabel}
        type="password"
        autoComplete="new-password"
        issues={issues?.confirmPassword}
        required={required}
      />
    </>
  );
}
