import type { Metadata } from "next";

import { AiSection } from "@/components/home/AiSection";
import { CtaSection } from "@/components/home/CtaSection";
import { FeaturesSection } from "@/components/home/FeaturesSection";
import { HeroSection } from "@/components/home/HeroSection";
import { HomeFooter } from "@/components/home/HomeFooter";
import { HomeNav } from "@/components/home/HomeNav";
import { PricingSection } from "@/components/home/PricingSection";
import { getSessionUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "DevStash — Store Smarter. Build Faster.",
  description:
    "One searchable, AI-enhanced hub for your snippets, prompts, commands, notes, files, images and links.",
};

/**
 * The public marketing homepage. Static content; the session only decides
 * whether the buttons lead to sign-up or back to the dashboard.
 */
export default async function HomePage() {
  const signedIn = (await getSessionUser()) !== null;

  return (
    <>
      <HomeNav signedIn={signedIn} />
      <main>
        <HeroSection signedIn={signedIn} />
        <FeaturesSection />
        <AiSection />
        <PricingSection signedIn={signedIn} />
        <CtaSection signedIn={signedIn} />
      </main>
      <HomeFooter />
    </>
  );
}
