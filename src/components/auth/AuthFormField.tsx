import type { ComponentProps, ReactNode } from "react";

import { FieldError } from "@/components/auth/FieldError";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface AuthFormFieldProps extends Omit<ComponentProps<typeof Input>, "id" | "name"> {
  /** Used as both the input's `name` and its `id`. */
  name: string;
  label: string;
  issues?: string[];
  /** Shown under the input until there are messages to show instead. */
  hint?: ReactNode;
  /** Sits at the end of the label row, e.g. a "Forgot password?" link. */
  labelAction?: ReactNode;
}

/**
 * One labelled input in the auth and account forms, with its validation
 * messages underneath and `aria-invalid` set while there are any. Every other
 * prop goes to the `Input`.
 */
export function AuthFormField({
  name,
  label,
  issues,
  hint,
  labelAction,
  className,
  ...inputProps
}: AuthFormFieldProps) {
  const labelElement = <Label htmlFor={name}>{label}</Label>;

  return (
    <div className="space-y-1.5">
      {labelAction ? (
        <div className="flex items-center justify-between gap-2">
          {labelElement}
          {labelAction}
        </div>
      ) : (
        labelElement
      )}
      <Input
        id={name}
        name={name}
        aria-invalid={Boolean(issues)}
        className={cn("h-9", className)}
        {...inputProps}
      />
      <FieldError messages={issues} />
      {hint && !issues && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
