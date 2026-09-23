import type { ReactNode } from "react";

import { FieldError } from "@/components/auth/FieldError";
import { Label } from "@/components/ui/label";

interface ItemFormFieldProps {
  label: string;
  htmlFor: string;
  issues?: string[];
  hint?: string;
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
  children,
}: ItemFormFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor} className="text-muted-foreground">
        {label}
      </Label>
      {children}
      <FieldError messages={issues} />
      {hint && !issues && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
