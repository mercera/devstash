"use client";

import { useEffect, useRef, type ComponentType, type SVGProps } from "react";
import { AppWindow, Bookmark, FileText, Terminal } from "lucide-react";

import {
  GitHubIcon,
  NotionIcon,
  SlackIcon,
  VSCodeIcon,
} from "@/components/brand/BrandIcons";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import {
  bodyTransform,
  createBody,
  frameStep,
  stepBody,
  type Point,
} from "@/lib/chaos-physics";
import { cn } from "@/lib/utils";

interface ChaosIcon {
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Brand marks keep their own colors; outline icons take the muted text color. */
  brand: boolean;
  /** Static scatter: the layout before the script runs and with reduced motion. */
  position: string;
}

const ICONS: ChaosIcon[] = [
  { label: "Notion", Icon: NotionIcon, brand: true, position: "left-[8%] top-[10%] -rotate-8" },
  { label: "GitHub", Icon: GitHubIcon, brand: true, position: "left-[58%] top-[6%] rotate-6" },
  { label: "Slack", Icon: SlackIcon, brand: true, position: "left-[34%] top-[30%] rotate-12" },
  { label: "VS Code", Icon: VSCodeIcon, brand: true, position: "left-[74%] top-[38%] -rotate-10" },
  { label: "Browser tabs", Icon: AppWindow, brand: false, position: "left-[12%] top-[52%] rotate-5" },
  { label: "Terminal", Icon: Terminal, brand: false, position: "left-[46%] top-[62%] -rotate-14" },
  { label: "Text file", Icon: FileText, brand: false, position: "left-[22%] top-[78%] rotate-9" },
  { label: "Bookmark", Icon: Bookmark, brand: false, position: "left-[68%] top-[76%] -rotate-4" },
];

/**
 * "Your knowledge today...": icons that drift, bounce off the walls, pulse and
 * shy away from the cursor. The motion itself is `src/lib/chaos-physics.ts`;
 * this component only runs the loop and writes transforms.
 */
export function ChaosField() {
  const fieldRef = useRef<HTMLDivElement>(null);
  const iconRefs = useRef<(HTMLDivElement | null)[]>([]);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const field = fieldRef.current;
    if (!field || reducedMotion) return;
    return animateField(field, iconRefs.current.filter((el) => el !== null));
  }, [reducedMotion]);

  return (
    <div
      ref={fieldRef}
      className="group/chaos relative h-75 overflow-hidden rounded-lg bg-[radial-gradient(circle_at_1px_1px,var(--color-border)_1px,transparent_0)] bg-size-[18px_18px]"
    >
      {ICONS.map(({ label, Icon, brand, position }, index) => (
        <div
          key={label}
          ref={(el) => {
            iconRefs.current[index] = el;
          }}
          title={label}
          className={cn(
            "absolute flex size-13 items-center justify-center rounded-xl border bg-card shadow-lg shadow-black/35 will-change-transform",
            "group-data-animated/chaos:top-0 group-data-animated/chaos:left-0 group-data-animated/chaos:rotate-none",
            position,
            !brand && "text-muted-foreground",
          )}
        >
          <Icon className={brand ? "size-6.5" : "size-6"} />
        </div>
      ))}
    </div>
  );
}

/**
 * Runs the animation until the returned cleanup is called. Starts from the
 * static scatter layout, then takes over positioning with transforms.
 */
function animateField(field: HTMLDivElement, icons: HTMLDivElement[]) {
  let bounds = { width: field.clientWidth, height: field.clientHeight };
  // Read before `data-animated` moves every icon to the top-left corner.
  let bodies = icons.map((el) =>
    createBody({ x: el.offsetLeft, y: el.offsetTop }, el.offsetWidth, bounds),
  );
  let pointer: Point | null = null;
  let frame = 0;
  let last: number | null = null;

  field.dataset.animated = "";

  const tick = (time: number) => {
    const dt = frameStep(last === null ? null : time - last);
    last = time;
    bodies = bodies.map((body) => stepBody(body, dt, bounds, pointer));
    bodies.forEach((body, i) => {
      icons[i].style.transform = bodyTransform(body, time);
    });
    frame = requestAnimationFrame(tick);
  };
  const start = () => {
    if (frame) return;
    last = null;
    frame = requestAnimationFrame(tick);
  };
  const stop = () => {
    cancelAnimationFrame(frame);
    frame = 0;
  };

  const onPointerMove = (event: PointerEvent) => {
    const rect = field.getBoundingClientRect();
    pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };
  const onPointerLeave = () => {
    pointer = null;
  };
  field.addEventListener("pointermove", onPointerMove);
  field.addEventListener("pointerleave", onPointerLeave);

  const resizeObserver = new ResizeObserver(() => {
    bounds = { width: field.clientWidth, height: field.clientHeight };
  });
  resizeObserver.observe(field);

  // Only animate while the field is on screen.
  const visibilityObserver = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) start();
    else stop();
  });
  visibilityObserver.observe(field);

  return () => {
    stop();
    resizeObserver.disconnect();
    visibilityObserver.disconnect();
    field.removeEventListener("pointermove", onPointerMove);
    field.removeEventListener("pointerleave", onPointerLeave);
    delete field.dataset.animated;
    icons.forEach((el) => el.style.removeProperty("transform"));
  };
}
