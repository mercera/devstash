/**
 * Database smoke test.
 *
 * Checks that the app can reach Neon through the same client the app uses,
 * that the schema is migrated, and that writes work. Run with:
 *
 *   npm run db:test
 *
 * `dotenv/config` must be imported first — ESM evaluates imports in source
 * order, and `src/lib/prisma.ts` reads DATABASE_URL as it loads.
 */
import "dotenv/config";

import { prisma } from "../src/lib/prisma";

/** Thrown to roll back the write test so it leaves no rows behind. */
class Rollback extends Error {}

async function checkConnection(): Promise<void> {
  const [row] = await prisma.$queryRaw<
    { database: string; version: string }[]
  >`SELECT current_database()::text AS database, version()::text AS version`;

  console.log(`✓ connected to "${row.database}"`);
  console.log(`  ${row.version.split(",")[0]}`);
}

async function checkMigrations(): Promise<void> {
  const migrations = await prisma.$queryRaw<
    { migration_name: string; finished_at: Date | null }[]
  >`SELECT migration_name, finished_at FROM "_prisma_migrations" ORDER BY started_at`;

  if (migrations.length === 0) {
    throw new Error("No migrations applied. Run: npm run db:migrate");
  }

  const pending = migrations.filter((m) => m.finished_at === null);
  console.log(`✓ ${migrations.length} migration(s) applied`);
  for (const migration of migrations) {
    console.log(`  ${migration.migration_name}`);
  }

  if (pending.length > 0) {
    throw new Error(`${pending.length} migration(s) did not finish`);
  }
}

async function checkTables(): Promise<void> {
  const counts = {
    users: await prisma.user.count(),
    itemTypes: await prisma.itemType.count(),
    collections: await prisma.collection.count(),
    items: await prisma.item.count(),
    tags: await prisma.tag.count(),
    accounts: await prisma.account.count(),
    sessions: await prisma.session.count(),
  };

  console.log("✓ all tables readable");
  for (const [table, count] of Object.entries(counts)) {
    console.log(`  ${table.padEnd(12)} ${count}`);
  }
}

/**
 * Exercises a write, a relation and a read, then rolls the whole thing back so
 * the development database is left exactly as it was found.
 */
async function checkWrites(): Promise<void> {
  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email: `smoke-test-${Date.now()}@devstash.local` },
      });

      const type = await tx.itemType.create({
        data: {
          name: "Smoke Test",
          slug: `smoke-test-${Date.now()}`,
          icon: "flask-conical",
          color: "gray",
          userId: user.id,
        },
      });

      await tx.item.create({
        data: {
          title: "Smoke test item",
          contentType: "text",
          content: "console.log('hello');",
          userId: user.id,
          typeId: type.id,
        },
      });

      const found = await tx.user.findUniqueOrThrow({
        where: { id: user.id },
        include: { items: { include: { type: true } } },
      });

      if (found.items[0]?.type.name !== "Smoke Test") {
        throw new Error("Relation did not read back correctly");
      }

      throw new Rollback();
    });
  } catch (error) {
    if (!(error instanceof Rollback)) throw error;
  }

  console.log("✓ write, relation and read verified (rolled back)");
}

async function main(): Promise<void> {
  await checkConnection();
  await checkMigrations();
  await checkTables();
  await checkWrites();
  console.log("\nDatabase is healthy.");
}

main()
  .catch((error: unknown) => {
    console.error("\n✗ Database check failed:");
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
