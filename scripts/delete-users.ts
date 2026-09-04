/**
 * Removes every user except the seeded demo account, along with everything they
 * own. Meant for clearing out the throwaway accounts that auth walkthroughs
 * leave behind in the development database.
 *
 *   npm run db:delete-users             # dry run — lists what would go
 *   npm run db:delete-users -- --confirm  # actually deletes
 *
 * Nothing is deleted without `--confirm`, and the script refuses to run at all
 * if the demo account is missing — without it as an anchor, "everything except
 * demo" is just "everything".
 *
 * `dotenv/config` must be imported first: ESM evaluates imports in source
 * order, and `src/lib/prisma.ts` reads DATABASE_URL as it loads.
 */
import "dotenv/config";

import { prisma } from "../src/lib/prisma";

/** The one account that always survives. */
const KEEP_EMAIL = "demo@devstash.io";

/**
 * `VerificationToken` has no foreign key to `User` — it is keyed on a free-text
 * identifier — so its rows are never cascaded away and have to be swept by
 * hand. Email verification namespaces its identifiers (see
 * `src/lib/email-verification.ts`); the bare address is also matched in case a
 * magic-link provider is ever added.
 */
const VERIFICATION_IDENTIFIER_PREFIX = "email-verification:";

interface DoomedUser {
  id: string;
  email: string;
  name: string | null;
  _count: {
    items: number;
    collections: number;
    tags: number;
    itemTypes: number;
    accounts: number;
    sessions: number;
  };
}

/** Which database this is pointed at, so a dry run is never ambiguous. */
function describeTarget(): string {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env first.");
  }

  return new URL(url).host;
}

async function findDoomedUsers(): Promise<DoomedUser[]> {
  const demo = await prisma.user.findUnique({
    where: { email: KEEP_EMAIL },
    select: { id: true },
  });

  // Refusing here is the whole safety net: with no demo row, the filter below
  // matches every user in the database.
  if (!demo) {
    throw new Error(
      `No ${KEEP_EMAIL} account exists in this database. ` +
        "Run `npm run db:seed` first, or point .env at the right branch.",
    );
  }

  return prisma.user.findMany({
    where: { email: { not: KEEP_EMAIL } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      email: true,
      name: true,
      _count: {
        select: {
          items: true,
          collections: true,
          tags: true,
          itemTypes: true,
          accounts: true,
          sessions: true,
        },
      },
    },
  });
}

function report(users: DoomedUser[]): void {
  for (const user of users) {
    const owned = [
      `${user._count.items} items`,
      `${user._count.collections} collections`,
      `${user._count.tags} tags`,
      `${user._count.itemTypes} custom types`,
      `${user._count.accounts} accounts`,
      `${user._count.sessions} sessions`,
    ].join(", ");

    console.log(`  ${user.email}${user.name ? ` (${user.name})` : ""}`);
    console.log(`    ${owned}`);
  }
}

async function deleteUsers(users: DoomedUser[]): Promise<void> {
  const ids = users.map((user) => user.id);

  const deleted = await prisma.$transaction(async (tx) => {
    // Items go first. `Item.type` is `onDelete: Restrict`, so a user's custom
    // ItemType cannot be cascaded away while their own items still point at it.
    // Clearing the items removes that dependency; ItemTag rows cascade with
    // them, and collections, tags, types, accounts and sessions all cascade
    // from the user rows below.
    const items = await tx.item.deleteMany({ where: { userId: { in: ids } } });
    const removed = await tx.user.deleteMany({ where: { id: { in: ids } } });

    // Whatever is left is keyed to an address that no longer has an account.
    const survivors = await tx.user.findMany({ select: { email: true } });
    const keepIdentifiers = survivors.flatMap((user) => [
      user.email,
      `${VERIFICATION_IDENTIFIER_PREFIX}${user.email}`,
    ]);

    const tokens = await tx.verificationToken.deleteMany({
      where: { identifier: { notIn: keepIdentifiers } },
    });

    return { items: items.count, users: removed.count, tokens: tokens.count };
  });

  console.log(`✓ deleted ${deleted.users} user(s)`);
  console.log(`  ${deleted.items} item(s) removed directly`);
  console.log(`  ${deleted.tokens} orphaned verification token(s) swept`);
  console.log("  collections, tags, custom types, accounts and sessions cascaded");
}

async function main(): Promise<void> {
  const confirmed = process.argv.includes("--confirm");

  console.log(`Target:  ${describeTarget()}`);
  console.log(`Keeping: ${KEEP_EMAIL} and everything it owns\n`);

  const users = await findDoomedUsers();

  if (users.length === 0) {
    console.log(`Nothing to do — ${KEEP_EMAIL} is the only account.`);

    return;
  }

  console.log(`${users.length} user(s) would be deleted:\n`);
  report(users);
  console.log();

  if (!confirmed) {
    console.log("Dry run — nothing was deleted.");
    console.log("Re-run with --confirm to go ahead:");
    console.log("  npm run db:delete-users -- --confirm");

    return;
  }

  await deleteUsers(users);
}

main()
  .catch((error: unknown) => {
    console.error("\n✗ Failed to delete users:");
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
