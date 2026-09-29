import Link from "next/link";
import { Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { UPGRADE_PATH } from "@/lib/routes";

/**
 * Stands in for a New button a Free user cannot use: the button disabled, with
 * a link to the upgrade page beside it. The server refuses the create anyway;
 * this only makes the reason visible.
 */
export function ProLockedButton({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <Link
        href={UPGRADE_PATH}
        className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        Upgrade to Pro
      </Link>
      <Button variant="outline" disabled aria-label={label} title={`${label} is a Pro feature`}>
        <Lock />
        <span className="hidden sm:inline">{label}</span>
      </Button>
    </div>
  );
}
