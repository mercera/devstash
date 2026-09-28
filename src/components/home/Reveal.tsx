"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

interface RevealProps {
  children: ReactNode;
  /** Extra classes, e.g. a `delay-*` to stagger a row of cards. */
  className?: string;
}

/**
 * Fades its children in the first time they scroll into view.
 *
 * Content is hidden only under `js` (scripts enabled) and `motion-safe`, so it
 * is never lost without JavaScript and appears at once with reduced motion.
 * `data-visible` is exposed on a `group/reveal`, so children can stagger their
 * own entrance off it.
 */
export function Reveal({ children, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setVisible(true);
        observer.disconnect();
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-visible={visible || undefined}
      className={cn(
        "group/reveal transition-[opacity,translate] duration-700 ease-out",
        "motion-safe:js:translate-y-5 motion-safe:js:opacity-0",
        "data-visible:translate-y-0 data-visible:opacity-100",
        className,
      )}
    >
      {children}
    </div>
  );
}
