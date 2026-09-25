/**
 * Thrown inside an item write when one of the collection ids it was given is
 * not one of the caller's collections, so the whole transaction rolls back
 * rather than linking the rest.
 */
export class CollectionNotFoundError extends Error {
  constructor() {
    super("One or more collections do not belong to the user.");
    this.name = "CollectionNotFoundError";
  }
}

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

/**
 * Whether a Prisma error says the record to update or delete was not found
 * (P2025), e.g. because it was deleted between a read and a write.
 */
export function isRecordNotFoundError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "P2025"
  );
}
