import { ArrowRight } from "lucide-react";

/** The pulsing arrow between the chaos and the dashboard. Points down once they stack. */
export function TransformArrow() {
  return (
    <div className="flex justify-center" aria-hidden>
      <div className="flex size-13 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white motion-safe:animate-arrow-pulse">
        <ArrowRight className="size-6 max-lg:rotate-90" />
      </div>
    </div>
  );
}
