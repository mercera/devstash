import type { ReactNode } from "react";

import { FieldError } from "@/components/auth/FieldError";
import { Label } from "@/components/ui/label";

interface ItemFormFieldProps {
  label: string;
  htmlFor: string;
  issues?: string[];
  hint?: string;
  /** A small control at the right of the label row, such as an AI button. */
  action?: ReactNode;
  children: ReactNode;
}

/**
 * One labelled input in the item forms (drawer edit mode and New Item), with
 * its server-side messages underneath. The hint gives way to the messages.
 */
export function ItemFormField({
  label,
  htmlFor,
  issues,
  hint,
  action,
  children,
}: ItemFormFieldProps) {
  const labelElement = (
    <Label htmlFor={htmlFor} className="text-muted-foreground">
      {label}
    </Label>
  );

  return (
    <div className="flex flex-col gap-2">
      {action ? (
        <div className="flex items-center justify-between gap-2">
          {labelElement}
          {action}
        </div>
      ) : (
        labelElement
      )}
      {children}
      <FieldError messages={issues} />
      {hint && !issues && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
