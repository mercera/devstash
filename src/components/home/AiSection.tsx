import { Sparkles } from "lucide-react";

import { Checklist } from "@/components/home/Checklist";
import { Reveal } from "@/components/home/Reveal";
import {
  Section,
  SectionDescription,
  SectionTitle,
} from "@/components/home/Section";
import { EditorHeader, editorFrameClass } from "@/components/items/EditorChrome";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const CAPABILITIES = [
  "Auto-tagging suggests tags the moment you save",
  "AI summaries for long notes and docs",
  "Explain Code breaks down any snippet line by line",
  "Prompt optimization tightens your AI prompts",
];

/** keyword, function, type, number, plain */
type TokenKind = "k" | "f" | "t" | "n" | "p";

const TOKEN_CLASS: Record<TokenKind, string> = {
  k: "text-purple-400",
  f: "text-blue-400",
  t: "text-yellow-400",
  n: "text-orange-400",
  p: "",
};

const CODE: [TokenKind, string][][] = [
  [["k", "export function"], ["p", " "], ["f", "useDebounce"], ["p", "<"], ["t", "T"], ["p", ">(value: "], ["t", "T"], ["p", ", delay = "], ["n", "300"], ["p", ") {"]],
  [["p", "  "], ["k", "const"], ["p", " [debounced, setDebounced] = "], ["f", "useState"], ["p", "(value);"]],
  [],
  [["p", "  "], ["f", "useEffect"], ["p", "(() => {"]],
  [["p", "    "], ["k", "const"], ["p", " id = "], ["f", "setTimeout"], ["p", "(() => "], ["f", "setDebounced"], ["p", "(value), delay);"]],
  [["p", "    "], ["k", "return"], ["p", " () => "], ["f", "clearTimeout"], ["p", "(id);"]],
  [["p", "  }, [value, delay]);"]],
  [],
  [["p", "  "], ["k", "return"], ["p", " debounced;"]],
  [["p", "}"]],
];

const TAGS = ["react", "hooks", "typescript", "debounce", "performance"];

/** The tags pop in one by one once the editor has faded in. */
const TAG_DELAYS = ["delay-500", "delay-650", "delay-800", "delay-950", "delay-1100"];

export function AiSection() {
  return (
    <Section className="border-y bg-card/40">
      {/* `minmax(0, …)` so the code's longest line scrolls instead of widening the column. */}
      <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-14">
        <Reveal>
          <Badge
            variant="outline"
            className="mb-4 border-purple-500/40 bg-purple-500/10 text-purple-400"
          >
            <Sparkles />
            Pro Feature
          </Badge>
          <SectionTitle>Let AI do the organizing</SectionTitle>
          <SectionDescription>
            DevStash reads what you save and does the tedious part for you.
          </SectionDescription>
          <Checklist items={CAPABILITIES} className="mt-7" />
        </Reveal>

        <Reveal>
          <EditorMockup />
        </Reveal>
      </div>
    </Section>
  );
}

function EditorMockup() {
  return (
    <div
      className={cn(
        editorFrameClass({ readOnly: true, invalid: false }),
        "overflow-hidden rounded-xl bg-background shadow-2xl shadow-black/45",
      )}
    >
      <EditorHeader>
        <span className="ml-2 font-mono text-xs text-muted-foreground">useDebounce.ts</span>
      </EditorHeader>

      <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed sm:text-[0.82rem]">
        <code>
          {CODE.map((line, lineIndex) => (
            <span key={lineIndex} className="block min-h-lh">
              {line.map(([kind, text], tokenIndex) => (
                <span key={tokenIndex} className={TOKEN_CLASS[kind]}>
                  {text}
                </span>
              ))}
            </span>
          ))}
        </code>
      </pre>

      <div className="border-t bg-purple-500/5 px-4 pt-3.5 pb-4">
        <p className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold text-purple-400">
          <Sparkles className="size-3.5" />
          AI Generated Tags
        </p>
        <ul className="flex flex-wrap gap-2">
          {TAGS.map((tag, index) => (
            <li
              key={tag}
              className={cn(
                "rounded-full border bg-muted px-2.5 py-0.5 font-mono text-xs transition duration-300",
                "motion-safe:js:scale-75 motion-safe:js:opacity-0",
                "group-data-visible/reveal:scale-100 group-data-visible/reveal:opacity-100",
                TAG_DELAYS[index],
              )}
            >
              {tag}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
