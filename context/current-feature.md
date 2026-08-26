# Current Feature

<!-- Feature Name -->

Database — Neon PostgreSQL + Prisma

## Status

<!-- Not Started|In Progress|Completed -->

Completed

## Goals

<!-- Goals & requirements -->

Stand up the persistence layer: a Neon serverless PostgreSQL database wired to
the app through Prisma ORM, with the initial schema migrated.

- Install and initialize Prisma 7 (breaking changes vs. 6 — read the upgrade guide)
- Provision a Neon project with a development branch and a production branch;
  `DATABASE_URL` points at the development branch
- Author the initial schema from the data models in @context/project-overview.md —
  `User`, `Item`, `ItemType`, `Collection`, `Tag`, `ItemTag`
- Add the NextAuth models: `Account`, `Session`, `VerificationToken`
- Add appropriate indexes (foreign keys, lookup columns) and cascade deletes
- Create and run the initial migration, then verify with `prisma migrate status`
- Add a shared Prisma client singleton under `src/lib/`

## Notes

<!-- Any extra notes -->

- Full spec: @context/features/database-spec.md
- Data models to mirror: @context/project-overview.md (the Prisma draft there is a
  starting point and will evolve)
- **Prisma 7** — read the whole upgrade guide before writing config:
  https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7
  Setup reference: https://www.prisma.io/docs/getting-started/prisma-orm/quickstart/prisma-postgres
- **Always migrate, never push.** `prisma migrate dev` for schema changes;
  `db push` only if explicitly asked for. Production runs `prisma migrate deploy`
- Nothing Prisma-related exists yet — no `prisma/` directory, no `.env`, and
  `package.json` has no `prisma`/`@prisma/client` dependency
- `src/types/index.ts` already mirrors the draft schema and `src/lib/mock-data.ts`
  serves the UI through getters. Swapping the getters to Prisma is a later step —
  this feature is the schema and connection only, so the dashboard keeps reading
  mock data for now
- Keep secrets out of git: `.env` stays ignored, add a `.env.example` with the
  variable names

## History

<!-- Keep this updated. Earliest to latest -->

### Initial Setup — Completed (2026-08-24)

Scaffolded the Next.js client with Tailwind CSS v4.

- Bootstrapped Next.js (React 19) + TypeScript project
- Configured Tailwind CSS v4 via `@theme` in `src/app/globals.css` (no `tailwind.config` file)
- Replaced the default landing page in `src/app/page.tsx`
- Removed unused Create Next App SVGs from `public/`
- Added `CLAUDE.md` and the `context/` docs (project overview, coding standards, AI interaction, current feature)
- Renamed the default branch `master` → `main`
- Committed as `chore: initialize next.js client with tailwind css` and pushed to `origin` (https://github.com/mercera/devstash.git)

### Mock Data Layer — Completed (2026-08-25)

Added the single source of truth for dashboard mock data.

- Created `src/types/index.ts` with `User`, `ItemType`, `Collection`, `Item` and
  the joined view types (`ItemWithRelations`, `CollectionWithCount`, …)
- Created `src/lib/mock-data.ts` with 7 system item types, 6 collections,
  16 items and a mock current user
- Added derived getters for the sidebar, collection cards, pinned/recent
  sections and search
- `npm run build` and `npm run lint` pass

Design decisions carried forward:

- `src/types/index.ts` mirrors the Prisma draft in `context/project-overview.md`
- The UI reads through the getters (`getItemTypesWithCounts`,
  `getCollectionsWithCounts`, `getPinnedItems`, `getRecentItems`, `searchItems`, …),
  never the raw arrays
- Counts are **derived** from the `items` array rather than hardcoded, so the
  sidebar and collection cards stay consistent as mock items are added
- Tags are flattened to `string[]` on `Item`. The database will model these
  through `Tag`/`ItemTag`, but the UI only ever renders names
- `color` on types and collections is a semantic name (`"blue"`, `"purple"`, …)
  that the UI maps to Tailwind classes — no inline styles
- Swapping to Prisma later should be a one-file change: the getters already
  return the joined shapes the UI expects

### Dashboard UI — Phase 1 — Completed (2026-08-26)

Built the dashboard shell: ShadCN setup, `/dashboard` route, top bar, and sidebar/main placeholders. Branch `feature/dashboard-phase-1`.

- Initialized ShadCN UI (`radix` base, `nova` preset) — added `components.json`, `src/lib/utils.ts`, and the CSS-variable theme in `src/app/globals.css`
- Installed the `button` and `input` components into `src/components/ui/`
- Dark mode by default via the `dark` class on `<html>` in `src/app/layout.tsx`; renamed the Geist font variables to `--font-sans`/`--font-mono` so the ShadCN theme tokens resolve, and added `--font-mono` to the `@theme inline` block
- Replaced the leftover "Create Next App" metadata with DevStash title/description
- Added `/dashboard` — `src/app/dashboard/layout.tsx` composes the top bar, sidebar and `<main>`; `page.tsx` renders the `Main` placeholder
- Added `src/components/dashboard/TopBar.tsx` — wordmark, centered search input with icon, and a display-only "New Item" button
- Added `src/components/dashboard/Sidebar.tsx` — fixed-width `aside` with the `Sidebar` placeholder, hidden below `md` until the phase 2 drawer lands
- `npm run build` and `npm run lint` pass; `/dashboard` prerenders as static

Built before `origin/main` was pulled, so the reference screenshots and the design
principles in `context/project-overview.md` were not available at the time. The
shell was reviewed against them after the merge and corrected — see the entry below.

### Dashboard UI — Phase 1 Design Match — Completed (2026-08-26)

Reworked the shell to match `context/screenshots/dashboard-ui-main.png`. Branch `fix/dashboard-shell-to-match-design`.

- Moved the logo out of the top bar and into the sidebar: the sidebar is now a
  full-height left column whose header holds the gradient logo tile + `DevStash`
  wordmark, and the top bar spans only the area to its right. Their bottom
  borders line up at `h-12`.
- `src/app/dashboard/layout.tsx` is now `[Sidebar][TopBar over main]` rather than
  `[TopBar][Sidebar beside main]`
- Top bar gained the sidebar toggle icon (`PanelLeft`, display only — phase 2
  wires it up) and a "New Collection" outline button
- Search moved from centered to left-aligned after the toggle, capped at
  `max-w-sm`, placeholder shortened to `Search items...`, and a `⌘K` badge added
  inside the field
- Top bar height `h-14` → `h-12` (~48px) to match the reference
- `npm run build` and `npm run lint` pass

Known gaps against the reference, left for later phases:

- The `⌘K` badge hardcodes the mac symbol; platform detection needs a client
  component, and nothing is wired to the shortcut yet
- "New Collection" is not in the phase 1 spec text but is in the screenshot — it
  is rendered display-only

### Dashboard UI — Phase 2 — Completed (2026-08-26)

Filled in the sidebar with mock data and made it collapsible. Branch `feature/dashboard-phase-2`.

- Installed the ShadCN `sidebar`, `collapsible` and `avatar` components (which
  pulled in `sheet`, `tooltip`, `separator`, `skeleton` and `use-mobile`);
  deleted the `dropdown-menu` the CLI also fetched since nothing uses it
- Rebuilt `src/components/dashboard/Sidebar.tsx` on the ShadCN sidebar
  primitives — header logo, a collapsible **Types** section (icon in the type's
  accent color, count badge, link to `/items/[slug]`), a collapsible
  **Collections** section split into `FAVORITES` (star badge) and
  `ALL COLLECTIONS` (count badge) linking to `/collections/[slug]`, and a footer
  with the avatar, name, email and a display-only settings gear
- Active rows come from `usePathname()`, so `Sidebar` is now a client component
- `TopBar` swapped its `PanelLeft` placeholder for `SidebarTrigger`: offcanvas
  collapse on desktop, Sheet drawer below `md`, plus the built-in ⌘B shortcut
- `src/app/dashboard/layout.tsx` now wraps everything in `SidebarProvider` +
  `SidebarInset`; the inner wrapper is a `div` because `SidebarInset` is the `<main>`
- Added `src/lib/icons.ts` — maps `ItemType.icon` names to lucide components and
  `AccentColor` to Tailwind text classes, keeping the data layer React-free and
  the UI free of inline styles
- Added `getRecentCollections(limit?)` to `src/lib/mock-data.ts` (all collections,
  most recently updated first) and made `byUpdatedAtDesc` generic over
  `{ updatedAt: Date }` so it sorts collections as well as items
- Dark `--sidebar` in `globals.css` was lighter than the page background; set it
  to the background value so the sidebar reads as one dark surface like the reference
- Rewrote the generated `src/hooks/use-mobile.ts` with `useSyncExternalStore` —
  the CLI's version failed `npm run lint` under `react-hooks/set-state-in-effect`
- `npm run build` and `npm run lint` pass; `/dashboard` still prerenders as static

Decisions worth carrying forward:

- Type links use the singular mock-data slug (`/items/snippet`), not the
  `/items/snippets` in the spec text — the slug is what `getItemsByType` keys on,
  so the route follows the data rather than the other way round
- The spec asks for "most recent collections" while the screenshot labels that
  section `ALL COLLECTIONS` and shows only the non-favorites. Kept the
  screenshot's label and membership, ordered most-recently-updated first
- Collapse is `offcanvas` (the ShadCN default), so there is no icon rail; the
  `tooltip` props were dropped from the menu buttons since they only ever show in
  icon mode, which also avoids needing a `TooltipProvider`
- `/items/[slug]` and `/collections/[slug]` pages do not exist yet — the sidebar
  links point ahead of them

### Dashboard UI — Phase 3 — Completed (2026-08-26)

Built the main dashboard area, replacing the `Main` placeholder. Branch `feature/dashboard-phase-3`.

- Installed the ShadCN `card` and `badge` components
- `src/app/dashboard/page.tsx` now composes four sections under the
  `Dashboard` / "Your developer knowledge hub" header: stats, collections,
  pinned items and recent items. It stays a server component
- Added `src/components/dashboard/StatCard.tsx` — tinted icon tile, tabular
  number and muted label; the page renders four (items, collections, favorite
  items, favorite collections)
- Added `src/components/dashboard/CollectionCard.tsx` — accent left edge, name
  linking to `/collections/[slug]`, star when favorited, item count,
  description and a row of type icons in their own accent colors
- Added `src/components/dashboard/ItemCard.tsx` — shared by the Pinned and
  Recent sections: accent left edge, type icon tile, title with pin/star,
  description, tag badges and the date on the right
- Added `src/components/dashboard/TypeIcon.tsx` — resolves the lucide icon named
  on an item type through `createElement`
- Extended `src/lib/icons.ts` with `getAccentBorderClass` (card left edge) and
  `getAccentTileClass` (tinted icon square)
- Added `getDashboardStats()` to `src/lib/mock-data.ts` and the matching
  `DashboardStats` type to `src/types/index.ts`
- Added `src/lib/format.ts` with `formatShortDate` for the `Jan 15` date column
- `npm run build` and `npm run lint` pass; `/dashboard` still prerenders as static

Decisions worth carrying forward:

- Item rows show `updatedAt`, not the `createdAt` the screenshot displays. Our
  mock data has the two dates diverge, so created dates made the Recent column
  read as unsorted; `updatedAt` is what both sections sort by. The screenshot's
  data appears to have had them identical
- `const Icon = getIcon(...)` followed by `<Icon />` trips
  `react-hooks/static-components`, hence `TypeIcon`. The sidebar was switched to
  it as well so the pattern lives in one place
- The Collections grid shows up to 6 cards from `getRecentCollections(6)` with a
  "View all" link to `/collections`, which does not exist yet
- Item titles are not links — an item detail route has not been specced, and
  phase 3 asks only for the listing

### Database — Neon PostgreSQL + Prisma — Completed (2026-08-26)

Stood up the persistence layer. Branch `feature/database`.

- Installed `prisma@7.10.0` + `dotenv` (dev) and `@prisma/client@7.10.0`,
  `@prisma/adapter-neon`, `@neondatabase/serverless`. npm 12 blocks install
  scripts by default — `npm install-scripts approve prisma @prisma/engines` was
  needed to fetch the schema engine
- Added `prisma/schema.prisma` — `User`, `ItemType`, `Collection`, `Item`,
  `Tag`, `ItemTag` plus the NextAuth `Account`, `Session`, `VerificationToken`
- Added `prisma.config.ts` — Prisma 7's required config file; holds the
  datasource URL and the migrations path
- Added `src/lib/prisma.ts` — client singleton over the Neon driver adapter,
  cached on `globalThis` outside production so hot reload does not exhaust the pool
- Added `.env.example` (`DATABASE_URL` pooled / `DIRECT_URL` direct) and
  un-ignored it in `.gitignore`; ignored `/src/generated`
- Added `postinstall: prisma generate` and `db:generate` / `db:migrate` /
  `db:migrate:deploy` / `db:status` / `db:studio` scripts
- ESLint globally ignores `src/generated/**`
- Initial migration `20260826135618_init` created and applied to the Neon
  development branch; `prisma migrate status` reports the schema up to date
- Verified end to end through a throwaway `/api/dbcheck` route in the dev server
  (counts returned 0 across four tables, Prisma query logs hit the pooled
  connection), then deleted the route
- `npm run build` and `npm run lint` pass

Decisions worth carrying forward:

- **Prisma 7, not 8.** npm's `latest` tag is `8.0.0-rc.11`; `7.10.0` is the
  current stable 7 release and what the spec asked for
- Prisma 7 breaking changes that shaped the setup: the `prisma-client` generator
  replaces `prisma-client-js` and needs an explicit `output` (the client is
  generated into `src/generated/prisma`, **not** `node_modules`), driver adapters
  are mandatory, `datasource.url` moved out of `schema.prisma` into
  `prisma.config.ts`, `.env` is no longer auto-loaded (hence `dotenv`), and
  `migrate dev` no longer runs `generate` or seeds — both are explicit now
- `prisma.config.ts` resolves `env("DIRECT_URL")` at load time, so **every**
  Prisma CLI command fails without a `.env`. Copy `.env.example` first
- Two URLs by design: the app runs on the pooled `DATABASE_URL` through the Neon
  adapter, the CLI migrates over the direct `DIRECT_URL` (also the shadow database)
- The generated client is ESM with extensionless relative imports, so it only
  runs through a bundler — no plain `node script.ts` against it. Smoke tests have
  to go through Next
- `contentType` and `color` are Postgres enums rather than `String`, matching the
  unions already in `src/types/index.ts`
- Added `slug` to `ItemType` and `Collection` (unique per user) — the sidebar and
  cards already route on it
- `User` gained `name`, `image` and `emailVerified` for NextAuth adapter compatibility
- Delete behaviour: user deletion cascades to everything they own; deleting a
  **collection** sets `Item.collectionId` to null rather than deleting items;
  `Item.type` is `Restrict` so a type in use cannot be dropped
- `ItemType.@@unique([userId, slug])` does not constrain system types, since
  Postgres treats NULL `userId` as distinct. System types are seeded, not user input
- The dashboard still reads `src/lib/mock-data.ts`. Swapping the getters to
  Prisma is the next feature, not this one
