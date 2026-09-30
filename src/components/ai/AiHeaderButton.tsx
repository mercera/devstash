"use client";

import Link from "next/link";
import { Crown, Loader2, WandSparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { UPGRADE_PATH } from "@/lib/routes";

const PRO_TOOLTIP = "AI features require Pro subscription";

interface AiHeaderButtonProps {
  /** The visible label, e.g. "Explain" or "Optimize". */
  label: string;
  /** The accessible name, e.g. "Explain code". */
  actionLabel: string;
  isPro: boolean;
  pending: boolean;
  onClick: () => void;
}

/**
 * An AI action in an editor header ("Explain", "Optimize"). Pro users get the
 * wand, which spins while the AI works. Free users get a crown, a tooltip
 * saying why, and a link to the upgrade page; the route refuses them
 * regardless.
 */
export function AiHeaderButton({
  label,
  actionLabel,
  isPro,
  pending,
  onClick,
}: AiHeaderButtonProps) {
  if (!isPro) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button asChild variant="ghost" size="xs" className="shrink-0">
              <Link href={UPGRADE_PATH} aria-label={`${actionLabel}. ${PRO_TOOLTIP}`}>
                <Crown className="text-amber-400" />
                {label}
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent>{PRO_TOOLTIP}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      className="shrink-0"
      aria-label={actionLabel}
      aria-busy={pending || undefined}
      disabled={pending}
      onClick={onClick}
    >
      {pending ? <Loader2 className="animate-spin" /> : <WandSparkles />}
      {label}
    </Button>
  );
}
