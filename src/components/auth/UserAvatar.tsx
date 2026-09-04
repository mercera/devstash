import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { CurrentUser } from "@/types";

/**
 * Initials for the fallback: the first letter of each word in the name, capped
 * at two — "Brad Traversy" becomes "BT".
 *
 * `User.name` is nullable in the schema (a credentials account always sets one,
 * but a GitHub account with no public name does not), so the email stands in.
 * Splitting on `@` and `.` as well as whitespace turns `demo@devstash.io` into
 * "DD" rather than a single letter.
 */
export function getUserInitials(user: Pick<CurrentUser, "name" | "email">): string {
  return (user.name?.trim() || user.email)
    .split(/[\s@.]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

interface UserAvatarProps {
  user: CurrentUser;
  className?: string;
}

/**
 * The user's picture wherever one is shown. Renders the GitHub `image` when the
 * account has one and falls back to initials otherwise — Radix swaps to the
 * fallback on its own if the image 404s, so a stale avatar URL degrades rather
 * than leaving a hole.
 */
export function UserAvatar({ user, className }: UserAvatarProps) {
  return (
    <Avatar className={cn("size-8", className)}>
      <AvatarImage src={user.image ?? undefined} alt="" />
      <AvatarFallback className="text-xs">{getUserInitials(user)}</AvatarFallback>
    </Avatar>
  );
}
