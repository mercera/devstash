import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Reveal } from "@/components/home/Reveal";
import { Section, SectionDescription, SectionTitle } from "@/components/home/Section";
import { getPrimaryCta, LARGE_BUTTON_CLASS } from "@/components/home/links";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CtaSection({ signedIn }: { signedIn: boolean }) {
  const cta = getPrimaryCta(signedIn, "Get started for free");

  return (
    <Section>
      <Reveal className="rounded-3xl border bg-card bg-radial-[70%_90%_at_50%_0%] from-indigo-500/25 to-card to-70% px-6 py-16 text-center">
        <SectionTitle>Ready to Organize Your Knowledge?</SectionTitle>
        <SectionDescription>
          Set up your stash in under a minute. No credit card required.
        </SectionDescription>
        <Button asChild className={cn("mt-7", LARGE_BUTTON_CLASS)}>
          <Link href={cta.href}>
            {cta.label}
            <ArrowRight />
          </Link>
        </Button>
      </Reveal>
    </Section>
  );
}
