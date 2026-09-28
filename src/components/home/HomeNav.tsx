import Link from "next/link";

import { SIGN_IN_PATH } from "@/auth.config";
import { Logo } from "@/components/brand/Logo";
import { CONTAINER_CLASS } from "@/components/home/Section";
import { ScrollHeader } from "@/components/home/ScrollHeader";
import { SECTION_LINKS } from "@/components/home/links";
import { Button } from "@/components/ui/button";
import { DASHBOARD_PATH, REGISTER_PATH } from "@/lib/routes";
import { cn } from "@/lib/utils";

export function HomeNav({ signedIn }: { signedIn: boolean }) {
  return (
    <ScrollHeader>
      <div className={cn(CONTAINER_CLASS, "flex h-full items-center gap-8")}>
        <Logo href="/" />

        <nav aria-label="Primary" className="hidden gap-6 text-sm text-muted-foreground sm:flex">
          {SECTION_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="transition-colors hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex gap-2">
          {signedIn ? (
            <Button asChild>
              <Link href={DASHBOARD_PATH}>Go to Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" className="text-muted-foreground">
                <Link href={SIGN_IN_PATH}>Sign In</Link>
              </Button>
              <Button asChild>
                <Link href={REGISTER_PATH}>Get Started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </ScrollHeader>
  );
}
