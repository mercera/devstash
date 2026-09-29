import { PricingPlans } from "@/components/home/PricingPlans";
import { Section, SectionHeader } from "@/components/home/Section";

export function PricingSection({ signedIn }: { signedIn: boolean }) {
  return (
    <Section id="pricing">
      <SectionHeader eyebrow="Pricing" title="Start free, upgrade when you need more" />
      <PricingPlans signedIn={signedIn} />
    </Section>
  );
}
