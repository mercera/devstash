import { PrismaNeon } from "@prisma/adapter-neon";

import { PrismaClient } from "@/generated/prisma/client";

/**
 * Shared Prisma client.
 *
 * Prisma 7 requires an explicit driver adapter; we use Neon's serverless
 * driver against the pooled `DATABASE_URL`. Next.js clears the module cache on
 * every hot reload in development, so the client is cached on `globalThis` to
 * avoid exhausting the connection pool with a new one per reload.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env.");
  }

  return new PrismaClient({
    adapter: new PrismaNeon({ connectionString }),
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
