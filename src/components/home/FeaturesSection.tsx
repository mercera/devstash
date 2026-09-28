import type { ReactNode } from "react";
import {
  Code,
  File,
  Folder,
  Search,
  Sparkles,
  Terminal,
  type LucideIcon,
} from "lucide-react";

import { Reveal } from "@/components/home/Reveal";
import { Section, SectionHeader } from "@/components/home/Section";
import { Card } from "@/components/ui/card";
import { getAccentTileClass, getAccentTopBorderClass } from "@/lib/icons";
import { cn } from "@/lib/utils";
import type { AccentColor } from "@/types";

interface Feature {
  title: string;
  description: ReactNode;
  Icon: LucideIcon;
  /** An item type's color, or `null` for the brand indigo. */
  accent: AccentColor | null;
}

const FEATURES: Feature[] = [
  {
    title: "Code Snippets",
    description: "Save reusable code with syntax highlighting for every language you write.",
    Icon: Code,
    accent: "blue",
  },
  {
    title: "AI Prompts",
    description: "Keep the prompts and system contexts that work, instead of losing them in old chats.",
    Icon: Sparkles,
    accent: "purple",
  },
  {
    title: "Instant Search",
    description: (
      <>
        Press <kbd className="rounded border bg-muted px-1 font-mono text-xs">⌘K</kbd> and
        fuzzy-search titles, content, tags and types at once.
      </>
    ),
    Icon: Search,
    accent: null,
  },
  {
    title: "Commands",
    description: "Stop digging through bash history. Store the one-liners you always forget.",
    Icon: Terminal,
    accent: "orange",
  },
  {
    title: "Files & Docs",
    description: "Upload context files, templates, configs and images alongside everything else.",
    Icon: File,
    accent: "gray",
  },
  {
    title: "Collections",
    description: 'Group items of any type into collections like "React Patterns" or "DevOps".',
    Icon: Folder,
    accent: "green",
  },
];

/** Staggers each row of three so the cards arrive left to right. */
const COLUMN_DELAYS = ["", "delay-100", "delay-200"];

export function FeaturesSection() {
  return (
    <Section id="features">
      <SectionHeader
        eyebrow="Features"
        title="Everything a developer saves, in one place"
        description="Seven built-in item types, collections that mix them freely, and search that finds anything in a keystroke."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ title, description, Icon, accent }, index) => (
          <Reveal key={title} className={COLUMN_DELAYS[index % 3]}>
            <Card
              className={cn(
                "h-full gap-0 border-t-3 px-6 py-6 transition-transform hover:-translate-y-0.5",
                accent ? getAccentTopBorderClass(accent) : "border-t-indigo-500",
              )}
            >
              <span
                className={cn(
                  "flex size-10 items-center justify-center rounded-lg",
                  accent ? getAccentTileClass(accent) : "bg-indigo-500/10 text-indigo-400",
                )}
              >
                <Icon className="size-5" />
              </span>
              <h3 className="mt-4 mb-2 text-lg font-semibold">{title}</h3>
              <p className="text-muted-foreground">{description}</p>
            </Card>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
