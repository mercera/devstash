# DevStash

A developer knowledge hub for snippets, prompts, commands, notes, links, files
and images, all in one searchable place.

## Tech stack

- Next.js (React 19) and TypeScript
- Tailwind CSS v4 and shadcn/ui
- Neon PostgreSQL with Prisma 7
- Auth.js v5 (email/password and GitHub OAuth)
- Cloudflare R2 for uploads, Resend for email, Upstash Redis for rate limiting
- Vitest for unit tests

## Getting started

1. Install dependencies. `postinstall` runs `prisma generate`:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and fill it in. Every Prisma command fails
   without `DIRECT_URL` set.

3. Apply the migrations and seed the demo data:

   ```bash
   npm run db:migrate:deploy
   npm run db:seed
   ```

   The seed prints the demo account's password unless `SEED_DEMO_PASSWORD` is
   set.

4. Start the dev server and open http://localhost:3000:

   ```bash
   npm run dev
   ```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` / `npm run start` | Build and serve production |
| `npm run lint` | Run ESLint |
| `npm test` / `npm run test:watch` | Run the Vitest unit tests |
| `npm run db:migrate` | Create and apply a migration (`prisma migrate dev`) |
| `npm run db:migrate:deploy` | Apply pending migrations |
| `npm run db:status` | Check migration status |
| `npm run db:seed` | Seed the demo user, system item types, collections and items |
| `npm run db:test` | Database connectivity smoke test |
| `npm run db:delete-users` | Delete every user except the demo account (dry run; add `-- --confirm`) |
| `npm run db:studio` | Open Prisma Studio |

## Project docs

- `context/project-overview.md`: the product spec, data model and roadmap
- `context/coding-standards.md`: conventions for code, styling, the database
  and tests
- `context/current-feature.md`: the feature in progress and the history of
  completed work
- `context/features/`: one spec per feature
