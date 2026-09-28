import Link from "next/link";

import { Logo } from "@/components/brand/Logo";
import { CONTAINER_CLASS } from "@/components/home/Section";
import { FOOTER_COLUMNS } from "@/components/home/links";
import { cn } from "@/lib/utils";

export function HomeFooter() {
  return (
    <footer className="border-t pt-14 pb-6 text-sm">
      <div className={cn(CONTAINER_CLASS, "flex flex-col justify-between gap-10 sm:flex-row")}>
        <div>
          <Logo href="/" />
          <p className="mt-3 text-muted-foreground">Store Smarter. Build Faster.</p>
        </div>

        <nav aria-label="Footer" className="grid grid-cols-3 gap-4 sm:gap-12">
          {FOOTER_COLUMNS.map((column) => (
            <div key={column.title}>
              <h4 className="mb-3 font-semibold">{column.title}</h4>
              <ul className="grid gap-2 text-muted-foreground">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="transition-colors hover:text-foreground">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      <div className={cn(CONTAINER_CLASS, "mt-12")}>
        <p className="border-t pt-6 text-muted-foreground">
          &copy; {new Date().getFullYear()} DevStash. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
