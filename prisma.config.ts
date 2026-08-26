import "dotenv/config";
import { defineConfig, env } from "prisma/config";

/**
 * Prisma 7 moves the connection URL out of `schema.prisma` and into this file.
 *
 * The CLI (migrate, studio, db execute) connects with `DIRECT_URL` — Neon's
 * unpooled connection string — while the app runtime connects through the
 * pooled `DATABASE_URL` in `src/lib/prisma.ts`.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DIRECT_URL"),
  },
});
