import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Shared by `BackLink` and `BackButton`, so the two read as one control. */
export const BACK_CONTROL_CLASS = "-ml-2 self-start text-muted-foreground";

/** A link to the page above this one, shown over the page header. */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Button asChild variant="ghost" size="sm" className={BACK_CONTROL_CLASS}>
      <Link href={href}>
        <ArrowLeft />
        {label}
      </Link>
    </Button>
  );
}
