import Link from "next/link";
import { Layers } from "lucide-react";

import { cn } from "@/lib/utils";

const SIZES = {
  xs: { gap: "gap-1.5", tile: "size-4.5 rounded-[5px]", icon: "size-3", text: "text-xs" },
  sm: { gap: "gap-2.5", tile: "size-7 rounded-lg", icon: "size-4", text: "text-base" },
  lg: { gap: "gap-2.5", tile: "size-8 rounded-lg", icon: "size-4.5", text: "text-lg" },
} as const;

interface LogoProps {
  /** Renders a link when set, plain text otherwise. */
  href?: string;
  size?: keyof typeof SIZES;
  className?: string;
}

/** The gradient `Layers` tile and the DevStash wordmark. */
export function Logo({ href, size = "sm", className }: LogoProps) {
  const { gap, tile, icon, text } = SIZES[size];
  const classes = cn("flex items-center", gap, className);
  const content = (
    <>
      <span
        className={cn(
          "flex shrink-0 items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600",
          tile,
        )}
      >
        <Layers className={cn("text-white", icon)} />
      </span>
      <span className={cn("font-semibold tracking-tight", text)}>DevStash</span>
    </>
  );

  return href ? (
    <Link href={href} className={classes}>
      {content}
    </Link>
  ) : (
    <span className={classes}>{content}</span>
  );
}
