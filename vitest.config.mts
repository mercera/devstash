import { defineConfig } from "vitest/config";

/**
 * Unit tests cover server actions and `src/lib` utilities only — no component
 * tests, so there is no DOM environment. Anything that does I/O (Prisma,
 * Auth.js, Resend, Upstash) is mocked per test file; a test must never reach
 * the Neon database.
 */
export default defineConfig({
  resolve: {
    // Resolves the `@/*` alias from `tsconfig.json`, so it is declared once.
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    restoreMocks: true,
    unstubEnvs: true,
  },
});
