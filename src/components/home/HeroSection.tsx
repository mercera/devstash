import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { ChaosField } from "@/components/home/ChaosField";
import { DashboardPreview } from "@/components/home/DashboardPreview";
import { CONTAINER_CLASS, Eyebrow } from "@/components/home/Section";
import { TransformArrow } from "@/components/home/TransformArrow";
import { getPrimaryCta, LARGE_BUTTON_CLASS } from "@/components/home/links";
import { Button } from "@/components/ui/button";

/**
 * Headline, CTAs and the chaos → DevStash visual. Not wrapped in `Reveal`:
 * it is the first thing on screen, so it must not wait for hydration.
 */
export function HeroSection({ signedIn }: { signedIn: boolean }) {
  const cta = getPrimaryCta(signedIn, "Start for free");

  return (
    <section className="bg-radial-[60%_50%_at_50%_0%] from-indigo-500/20 to-transparent to-70% pt-26 pb-16 sm:pt-34 sm:pb-24">
      <div className={CONTAINER_CLASS}>
        <div className="mx-auto mb-10 max-w-3xl text-center sm:mb-16">
          <Eyebrow>Your developer knowledge hub</Eyebrow>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Stop Losing Your
            <br />
            <span className="bg-linear-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Developer Knowledge
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
            Snippets in VS Code, prompts in old chats, commands in bash history,
            links in a hundred bookmarks. DevStash brings it all into one fast,
            searchable place.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild className={LARGE_BUTTON_CLASS}>
              <Link href={cta.href}>
                {cta.label}
                <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="outline" className={LARGE_BUTTON_CLASS}>
              <Link href="#features">See how it works</Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 items-center gap-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.3fr)] lg:gap-6">
          <HeroPanel label="Your knowledge today...">
            <ChaosField />
          </HeroPanel>
          <TransformArrow />
          <HeroPanel label="...with DevStash">
            <DashboardPreview />
          </HeroPanel>
        </div>
      </div>
    </section>
  );
}

function HeroPanel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <figure className="flex min-w-0 flex-col rounded-2xl border bg-card/50 p-4">
      <figcaption className="mb-3 font-mono text-xs text-muted-foreground">{label}</figcaption>
      {children}
    </figure>
  );
}
