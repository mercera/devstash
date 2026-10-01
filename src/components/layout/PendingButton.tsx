import type { ComponentProps, ReactNode } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

interface PendingButtonProps extends ComponentProps<typeof Button> {
  /** While true the button is disabled and shows a spinner. */
  pending: boolean;
  /** Shown in place of the children while pending, e.g. "Saving...". */
  pendingLabel?: ReactNode;
}

/** A button for a request in flight: disabled, with a spinner and a pending label. */
export function PendingButton({
  pending,
  pendingLabel,
  disabled,
  children,
  ...props
}: PendingButtonProps) {
  return (
    <Button {...props} disabled={disabled || pending}>
      {pending && <Loader2 className="animate-spin" />}
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}
