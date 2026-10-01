/** The "or" rule between an auth form and the GitHub button. */
export function AuthDivider() {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px flex-1 bg-border" />
      <span className="text-xs text-muted-foreground uppercase">or</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
