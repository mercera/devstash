/**
 * Whether a Prisma error is a unique-constraint violation (P2002). Checked by
 * shape rather than `instanceof`, so it holds whichever client instance threw.
 */
export function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "P2002"
  );
}
