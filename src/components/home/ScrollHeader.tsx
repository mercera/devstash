"use client";

import { useSyncExternalStore, type ReactNode } from "react";

import { cn } from "@/lib/utils";

const SCROLLED_AFTER_PX = 16;

function subscribe(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
}

const isScrolled = () => window.scrollY > SCROLLED_AFTER_PX;

/**
 * The fixed homepage header. Turns more opaque, with a bottom border, once the
 * page scrolls. The nav inside is server-rendered and passed as `children`.
 */
export function ScrollHeader({ children }: { children: ReactNode }) {
  const scrolled = useSyncExternalStore(subscribe, isScrolled, () => false);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 h-16 border-b backdrop-blur-md transition-colors duration-300",
        scrolled
          ? "border-border bg-background/90"
          : "border-transparent bg-background/40",
      )}
    >
      {children}
    </header>
  );
}
