"use client";

import Link from "next/link";
import { Crown, Loader2, WandSparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { UPGRADE_PATH } from "@/lib/routes";

const PRO_TOOLTIP = "AI features require Pro subscription";

interface ExplainButtonProps {
  isPro: boolean;
  pending: boolean;
  onExplain: () => void;
}

/**
 * The code editor header's "Explain" action. Pro users get the wand, which
 * spins while an explanation is being written. Free users get a crown, a
 * tooltip saying why, and a link to the upgrade page; the route refuses them
 * regardless.
 */
export function ExplainButton({ isPro, pending, onExplain }: ExplainButtonProps) {
  if (!isPro) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button asChild variant="ghost" size="xs" className="shrink-0">
              <Link href={UPGRADE_PATH} aria-label={`Explain code. ${PRO_TOOLTIP}`}>
                <Crown className="text-amber-400" />
                Explain
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
      aria-label="Explain code"
      aria-busy={pending || undefined}
      disabled={pending}
      onClick={onExplain}
    >
      {pending ? <Loader2 className="animate-spin" /> : <WandSparkles />}
      Explain
    </Button>
  );
}
