import type { ReactNode } from "react";

import { Reveal } from "@/components/home/Reveal";
import { cn } from "@/lib/utils";

/** The homepage's content width and side gutters. */
export const CONTAINER_CLASS = "mx-auto w-full max-w-6xl px-4 sm:px-6";

interface SectionProps {
  id?: string;
  className?: string;
  children: ReactNode;
}

/** A padded homepage section. `scroll-mt-16` clears the fixed header on anchor jumps. */
export function Section({ id, className, children }: SectionProps) {
  return (
    <section id={id} className={cn("scroll-mt-16 py-16 sm:py-24", className)}>
      <div className={CONTAINER_CLASS}>{children}</div>
    </section>
  );
}

/** The mono, indigo label above a heading. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="mb-3 font-mono text-xs tracking-[0.08em] text-indigo-400 uppercase">
      {children}
    </p>
  );
}

interface SectionHeaderProps {
  eyebrow: string;
  title: string;
  description?: string;
}

/** Centered eyebrow, heading and optional description. */
export function SectionHeader({ eyebrow, title, description }: SectionHeaderProps) {
  return (
    <Reveal className="mx-auto mb-12 max-w-2xl text-center">
      <Eyebrow>{eyebrow}</Eyebrow>
      <SectionTitle>{title}</SectionTitle>
      {description && <SectionDescription>{description}</SectionDescription>}
    </Reveal>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{children}</h2>
  );
}

export function SectionDescription({ children }: { children: ReactNode }) {
  return <p className="mt-3.5 text-lg text-muted-foreground">{children}</p>;
}
