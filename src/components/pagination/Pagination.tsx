import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { getPageHref, getPageSlots } from "@/lib/pagination";
import { cn } from "@/lib/utils";

interface PaginationProps {
  /** The listing's path without a query string, e.g. `/items/snippet`. */
  pathname: string;
  page: number;
  totalPages: number;
}

/**
 * Numbered page links with Previous/Next for a paginated listing. Renders
 * nothing when everything fits on one page.
 *
 * Plain links, so it stays a server component and works without JavaScript.
 * Previous and Next are greyed-out spans at either end rather than links to
 * the current page.
 */
export function Pagination({ pathname, page, totalPages }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Pagination" className="flex justify-center">
      <ul className="flex items-center gap-1">
        <li>
          <StepLink
            href={page > 1 ? getPageHref(pathname, page - 1) : null}
            label="Previous"
          >
            <ChevronLeft />
            <span className="hidden sm:inline">Previous</span>
          </StepLink>
        </li>

        {getPageSlots(page, totalPages).map((slot, index) =>
          slot === "ellipsis" ? (
            <li
              key={`ellipsis-${index}`}
              aria-hidden
              className="flex size-8 items-center justify-center text-muted-foreground"
            >
              …
            </li>
          ) : (
            <li key={slot}>
              <Link
                href={getPageHref(pathname, slot)}
                aria-label={`Page ${slot}`}
                aria-current={slot === page ? "page" : undefined}
                className={cn(
                  buttonVariants({
                    variant: slot === page ? "outline" : "ghost",
                    size: "icon",
                  }),
                  "tabular-nums",
                )}
              >
                {slot}
              </Link>
            </li>
          ),
        )}

        <li>
          <StepLink
            href={page < totalPages ? getPageHref(pathname, page + 1) : null}
            label="Next"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight />
          </StepLink>
        </li>
      </ul>
    </nav>
  );
}

/** Previous or Next: a link when there is a page to go to, else a greyed-out span. */
function StepLink({
  href,
  label,
  children,
}: {
  href: string | null;
  label: string;
  children: ReactNode;
}) {
  const className = cn(
    buttonVariants({ variant: "ghost" }),
    "max-sm:size-8 max-sm:px-0",
  );

  if (href === null) {
    return (
      <span
        aria-disabled="true"
        aria-label={label}
        className={cn(className, "pointer-events-none opacity-50")}
      >
        {children}
      </span>
    );
  }

  return (
    <Link href={href} aria-label={label} className={className}>
      {children}
    </Link>
  );
}
