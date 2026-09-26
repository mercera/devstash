# Current Feature: Favorites Sorting

## Status

In Progress

## Goals

- `/favorites` gains a sort control that switches between **Name**, **Date**
  and **Type**
- Sorting happens client-side, on the data already loaded: no new query, no
  server round trip, no URL change
- **Name**: alphabetical by item title / collection name, case-insensitive
- **Date**: most recently updated first (the current default order)
- **Type**: items grouped by item type, with a stable secondary sort within
  each type
- Each section has its own sort control: **Items** offers Name, Date and
  Type; **Collections** offers Name and Date only (collections have no item
  type)
- Rows keep working as before: item rows open the drawer, collection rows link
  to `/collections/[slug]`, and focus return still works
- The sorting logic lives in a pure `src/lib/` utility with unit tests
- Works at 390px with no horizontal scroll

## Notes

- Loaded from an inline description rather than a spec file
- Collections have no item type, so the user chose to **hide Type for
  collections**. That means a separate control per section rather than one
  shared control
- The page and its rows are server components today. Client-side sorting
  needs a small client wrapper that receives the already-fetched rows and
  renders them sorted; the page keeps fetching on the server
- Default sort stays **Date**, so the page looks unchanged until a sort is
  picked. Persisting the choice is not specified; proposed: no persistence
- Date is newest first. No ascending/descending toggle unless asked
- Both getters (`getFavoriteItems`, `getFavoriteCollections`) are
  session-scoped and unpaginated, so the whole list is in memory and sorting
  it in the browser is correct

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

### Seed Data — Completed (2026-08-26)

Wrote `prisma/seed.ts` and seeded the Neon dev database. Branch `feature/seed-data`.

- `node_modules` was stale (missing the `prisma` package despite being in
  `package.json`), and no local `.env` existed — recreated `.env` from
  `.env.example` with the Neon dev branch's `DATABASE_URL`/`DIRECT_URL`, then
  `npm install` to restore `prisma` and regenerate the client
- Installed `bcryptjs`; skipped `@types/bcryptjs` since bcryptjs 3.x ships its
  own type definitions
- Added `prisma/seed.ts` — seeds the demo user (bcrypt-hashed password, 12
  rounds), the 7 system `ItemType`s, 5 `Collection`s and 18 `Item`s across
  them, plus `Tag`/`ItemTag` rows derived from each item's tag list
- Wired `migrations.seed` in `prisma.config.ts` to `tsx prisma/seed.ts` and
  added `db:seed: "prisma db seed"` to `package.json`
- Ran `npm run db:seed` against the Neon dev branch, then verified with
  `npm run db:test` (1 user, 7 item types, 5 collections, 18 items, 29 tags)
  and confirmed `npm run build` / `npm run lint` both pass
- Re-ran the seed a second time and re-checked counts to confirm it's
  idempotent — no duplicate rows

Decisions worth carrying forward:

- Every seeded row uses a stable, explicit `id` (`seed-user-demo`,
  `seed-type-*`, `seed-col-*`, `seed-item-*`) and is `upsert`ed by that id, so
  re-running the seed updates rows instead of duplicating them.
  `ItemType.@@unique([userId, slug])` doesn't constrain system types since
  Postgres treats `NULL` `userId` as distinct — upserting on the compound key
  would have created a new set of 7 types on every run, hence the explicit ids
- `Tag`/`ItemTag` don't need explicit ids: `Tag` upserts on the real
  `[userId, name]` unique constraint, `ItemTag` on `[itemId, tagId]`
- Item type `name`/`icon`/`color` follow the existing app convention from
  `mock-data.ts` (plural display name, singular slug — e.g. `"Snippets"` /
  `"snippet"`) rather than the spec table's lowercase literal, since the
  sidebar and `getItemsByType` already key off that shape
- Spec hex colors were mapped to the closest `AccentColor` enum value (there
  happens to be a 1:1 match — blue, purple, orange, yellow, gray, pink, green)
- Collection/item favorite and pinned flags and tag names aren't specified —
  chose a plausible mix so the dashboard's favorites/pinned sections aren't
  empty for the demo
- `scripts/test-db.ts` (the database smoke test) is unrelated to seeding — it
  only checks connectivity and does a rollback-only write, so it was left
  untouched and used purely to verify the seed's row counts

### Dashboard Collections — Live Data — Completed (2026-08-26)

Swapped the dashboard's "Collections" grid and its two stat cards from
`src/lib/mock-data.ts` to live Neon/Prisma queries. Branch
`feature/dashboard-collections`.

- Added `src/lib/db/collections.ts` — `getRecentCollections(limit)` and
  `getCollectionStats()`, both scoped to the hardcoded seeded demo user
  (`seed-user-demo`)
- Added `CollectionCardData` to `src/types/index.ts` — `accentColor` and
  `types: ItemType[]` (full objects, most-used first) replace the old
  `color` / `typeIds: string[]` pairing `CollectionWithCount` used
- Rewrote `CollectionCard.tsx` to consume `CollectionCardData` directly
  instead of looking up `typeIds` against `mock-data.ts`'s `getItemType`
- `dashboard/page.tsx` is now an async server component; fetches
  `getRecentCollections` and `getCollectionStats` via `Promise.all`
  alongside the still-mock `getPinnedItems`/`getRecentItems`/`getDashboardStats`
- Added `export const dynamic = "force-dynamic"` to the dashboard page —
  without it Next prerenders the route at build time and serves that frozen
  snapshot, defeating the point of live data (caught in the build output:
  `/dashboard` showed as `○ Static` until this was added)
- Fixed two latent icon bugs surfaced by wiring in real data:
  `src/lib/icons.ts`'s `ICONS` map was missing `Code` and `StickyNote` (the
  seed data's lucide names for snippet/note types — it only had `Code2`/
  `FileText` from `mock-data.ts`), so those types would have silently
  rendered the fallback `File` icon
- Verified in the browser: installed Playwright + Chromium (no project run
  skill existed yet, `chromium-cli` wasn't on PATH), started `npm run dev`,
  and drove `/dashboard` with a script — 5 real collections, correct per-card
  item counts, accent colors and type icons, stat cards read 5/2, zero
  console errors, screenshot matched the reference layout
- `npm run build` and `npm run lint` pass

Decisions worth carrying forward:

- The collection's own stored `color` is now only a fallback for a
  collection with zero items; `CollectionCard`'s left-edge accent always
  prefers the most-used item type's color when items exist
- Kept `CollectionWithCount`/`getCollectionsWithCounts()` in
  `mock-data.ts` untouched rather than deleting them — nothing else in the
  UI (sidebar, items) has moved off mock data yet, so removing the mock
  collections path would have broken other in-scope-later work
- `getRecentCollections` in `src/lib/db/collections.ts` and the same-named
  function in `mock-data.ts` are distinct exports from different modules;
  `dashboard/page.tsx` now imports only the DB one

### Dashboard Items — Live Data — Completed (2026-08-28)

Swapped the dashboard's "Pinned" and "Recent" item lists and the two item
stat cards from `src/lib/mock-data.ts` to live Neon/Prisma queries. Branch
`feature/dashboard-items`.

- Added `src/lib/db/items.ts` — `getPinnedItems()`, `getRecentItems(limit)`
  and `getItemStats()`, all scoped to the hardcoded seeded demo user
  (`seed-user-demo`), mirroring `src/lib/db/collections.ts`
- The module shares one `itemInclude` (type + collection + `tags: { include:
  { tag: true } }`, tags ordered by name) and a `toItemWithRelations` mapper
  that flattens the `Tag`/`ItemTag` join to `string[]` and drops `userId`, so
  the query result matches the `ItemWithRelations` shape `ItemCard` already
  consumed — no component change was needed
- `dashboard/page.tsx` dropped its `mock-data` import entirely; all five
  fetches (collections, collection stats, pinned, recent, item stats) now run
  through a single `Promise.all`
- The Pinned section is wrapped in `pinnedItems.length > 0 && …` so it
  disappears rather than rendering an empty header
- Verified in the browser: reinstalled `playwright-core` in the scratchpad
  (Chromium was still in `~/AppData/Local/ms-playwright`, but under
  `chrome-win64/`, not `chrome-win/`), drove `/dashboard` — stat cards read
  18/5/5/2, 4 pinned cards, 10 recent, correct type icons, accent borders,
  tag badges and dates, zero console errors, screenshot matched the reference
- `npx tsc --noEmit`, `npm run lint` and `npm run build` pass; `/dashboard`
  still builds as `ƒ (Dynamic)`

Decisions worth carrying forward:

- Item counts live in `src/lib/db/items.ts` (`getItemStats`) rather than being
  folded into one four-count stats call, so each `db/[feature].ts` module owns
  its own model and the page composes them
- The row type for the mapper comes from the generated
  `ItemGetPayload<{ include: typeof itemInclude }>`, which needs `itemInclude`
  declared `as const` — without it `orderBy: "asc"` widens to `string` and the
  payload type stops resolving
- Tags are ordered alphabetically by name. The join gives no inherent order,
  and the seed's authoring order isn't recoverable from `ItemTag`
- `getDashboardStats()` and the item getters in `mock-data.ts` were left in
  place (now unused by the dashboard) — the **sidebar** still reads that
  module for type counts, the collections list and the footer user, so it
  stays until a later feature moves it
- The empty-Pinned branch was not browser-verified: emptying the seeded pinned
  set needed a DB write the permission classifier blocked, and no non-mutating
  way to reach that state exists yet
- `node_modules` was stale again (`bcryptjs` missing, same as during the seed
  feature) — `npm install` before typechecking

### Stats & Sidebar — Live Data — Completed (2026-08-28)

Moved the sidebar off `src/lib/mock-data.ts` and onto live Neon/Prisma data.
Branch `feature/stats-sidebar`.

- Added `src/lib/db/user.ts` — `getCurrentUser()` returning the seeded demo
  user's `name`/`email`/`image` for the footer, plus a `CurrentUser` type in
  `src/types/index.ts`
- Added `getItemTypesWithCounts()` to `src/lib/db/items.ts` — system types
  plus the user's own, in seeded order, each with a **filtered** relation
  count (`_count: { select: { items: { where: { userId } } } }`) since system
  types are shared and a bare count would total every user's items
- `getRecentCollections(limit?)` in `src/lib/db/collections.ts` had its
  default `6` dropped so the sidebar can omit the limit and list them all;
  `dashboard/page.tsx` already passed its limit explicitly
- Added `getAccentDotClass` to `src/lib/icons.ts` (`bg-*-500`) — the existing
  maps were text/border/tile only
- `Sidebar.tsx` now takes `itemTypes`, `collections` and `user` as props and
  splits favorites from the rest itself; it stays a client component for
  `usePathname()`. Non-favorite collections show the colored circle in the
  badge slot where favorites show their star, and a "View all collections"
  link sits under the list
- `dashboard/layout.tsx` became an async server component fetching all three
  through `Promise.all`, with `export const dynamic = "force-dynamic"`
- Verified in the browser: 7 types with live counts (4/3/5/0/0/0/6 = the 18
  seeded items), 2 favorites with stars, 3 collections with green/orange/green
  dots, the "View all collections" link, footer reading Demo User /
  demo@devstash.io, zero console errors
- `npx tsc --noEmit`, `npm run lint` and `npm run build` pass; `/dashboard`
  still builds as `ƒ (Dynamic)`

Decisions worth carrying forward:

- The spec contrasts "star icons for favorites" with "a colored circle for
  recents", so the circle **replaces** the item count in the badge slot for
  non-favorite collections. The count in the reference screenshot is gone
  there as a result — revisit if both are wanted
- The circle reuses `CollectionCardData.accentColor`, which
  `getRecentCollections()` already derives from the most-used item type, so
  no new query or type was needed
- Item types are ordered by `createdAt` asc, which reproduces the seed's
  authoring order (Snippets → Prompts → Commands → Notes → Files → Images →
  Links) and so matches the reference screenshot. There is no explicit sort
  column on `ItemType`
- Notes/Files/Images legitimately read `0` — the seed's 18 items only cover
  snippet/prompt/command/link
- `User.name` is nullable in the schema, so the footer falls back to the
  email for both the display name and the avatar initials, and the whole
  footer is skipped if the user row is missing
- **A running `next dev` server does not pick up brand-new Tailwind utility
  classes** — `bg-green-500` computed as transparent against the already-open
  dev server on :3000 while `.bg-green-500` was present in the production CSS.
  Confirmed correct by building and driving `next start` on another port;
  restart the dev server after adding a new utility to `icons.ts`
- **`src/lib/mock-data.ts` is gone.** With the sidebar moved, nothing
  imported it any more, so the module was deleted along with the three view
  types only it used — `User`, `CollectionWithCount` and `DashboardStats`.
  `Item`, `Collection` and `ContentType` stay: they are still the base types
  `ItemWithRelations` builds on. The dashboard now has no mock data path at
  all; every surface reads Neon through `src/lib/db/*`

### Add Pro Badge to Sidebar — Completed (2026-08-31)

Marked the two Pro-only item types in the sidebar's Types list with a subtle
`PRO` badge. Branch `feature/pro-badge-sidebar`. One source file changed,
17 lines.

- Added `PRO_TYPE_SLUGS` (`file`, `image`) at module scope in
  `Sidebar.tsx` and rendered a ShadCN `Badge` (`variant="outline"`) inline
  after the type name when the row's slug is in the set
- Shrank the badge to sidebar scale with `className`: `h-4 px-1 text-[10px]`
  plus `tracking-wider`, `text-sidebar-foreground/50` and
  `border-sidebar-border`. The stock `Badge` is `h-5 px-2 text-xs`, sized for
  page content, and `variant="default"` is solid primary — far too loud here
- Added `truncate` to the type-name span. This is **required**, not
  cosmetic: `sidebarMenuButtonVariants` truncates via
  `[&>span:last-child]:truncate`, and `Badge` renders a `<span>`, so
  appending it silently moved truncation off the name onto the badge
- Verified in the browser against the production build: badge on Files and
  Images only, all 7 rows enumerated with counts 4/3/5/0/0/0/6, uppercase
  `PRO` as literal text (computed `text-transform: none`), computed styling
  confirmed (10px font, 16px tall, 50% foreground, 1px 10%-opacity border),
  favorites/dots/footer untouched, zero console errors
- `npx tsc --noEmit`, `npm run lint` and `npm run build` pass; `/dashboard`
  still builds as `ƒ (Dynamic)`

Decisions worth carrying forward:

- The badge sits **inline after the name**, not in the `SidebarMenuBadge`
  slot. That slot is absolutely positioned at `right-1` and already holds the
  item count, so putting `PRO` there would have dropped the count on exactly
  those two rows; inline keeps the count column aligned down all seven. It
  also means the name span must stay at natural width — making it `flex-1`
  would push the badge under the absolutely-positioned count
- `PRO_TYPE_SLUGS` keys on **slug**, matching how types are identified
  everywhere else (`/items/[slug]`, `getItemsByType`), not display name
- The Pro set lives in the component because there is exactly one consumer.
  It is domain data, though — when plan gating lands it should move to
  `src/lib/` or become a column on `ItemType`. `User.isPro` already exists in
  the schema and is still unread; this feature is display-only labelling and
  deliberately builds no gating
- **`.env.production` points at a different database than `.env`** — one
  holding the demo user and the 7 system types but **zero items and zero
  collections**. `next start` prefers `.env.production`, so verifying a
  production build against it renders an empty dashboard (0 everywhere).
  Browser checks need `DATABASE_URL` overridden from `.env`, since a real
  process env var beats the env file. Unrelated to this feature and left
  untouched, but a deploy from this state would serve an empty dashboard

### Dashboard Query Over-Fetch Fixes — Completed (2026-08-31)

Fixed the two medium-severity findings from a `code-auditor` sweep of the full
tree. Branch `fix/dashboard-query-overfetch`. Three source files, +134/−31,
no component touched.

- **Dropped the unused `Collection` relation from `itemInclude`** in
  `src/lib/db/items.ts`. `ItemCard` never read `item.collection`, but the join
  pulled a full collection row (name, slug, description, color, timestamps) for
  every pinned and recent item. Removed from the include, the
  `toItemWithRelations` mapper, and `ItemWithRelations` in
  `src/types/index.ts`. `collectionId` stays — it is a scalar and is what a
  future collection filter will key on
- **Replaced the per-item `type` fetch in `getRecentCollections`** with a
  `prisma.item.groupBy({ by: ["collectionId", "typeId"], _count: true })`
  aggregate. The old `items: { select: { type: true } }` returned one full
  `ItemType` object per item in every collection, only to compute `.length` and
  a most-used-type ordering — and the sidebar calls this with **no limit** on a
  `force-dynamic` route, so it grew with the user's total item count on every
  request
- Extracted `tallyTypesByCollection()` to bucket the `groupBy` rows, keeping
  `getRecentCollections` itself short
- Verified with a **before/after baseline** rather than by eye: stashed the
  `src/` changes, drove `/dashboard` with Playwright dumping stat cards, section
  card counts, per-collection name/count/accent class and sidebar rows to JSON,
  restored the stash and re-ran. `diff` reported the two runs identical — stats
  18/5/5/2, 4 pinned, 10 recent, 5 collection cards at 4/4/4/3/3 (= 18), accents
  green/orange/green/purple/blue, zero console errors
- The Prisma query log confirms the change: the baseline emitted two
  `SELECT … FROM "Collection" WHERE "id" IN (…)` relation loads per render (one
  each for pinned and recent), the new code emits none, and the per-item `type`
  fetch is now `SELECT COUNT(*) … GROUP BY "collectionId", "typeId"`
- `npx tsc --noEmit`, `npm run lint` and `npm run build` pass; `/dashboard`
  still builds as `ƒ (Dynamic)`

Decisions worth carrying forward:

- **The win is payload, not round trips.** Query count per
  `getRecentCollections` call went 1 → 3 (collections, item types, aggregate),
  all inside one `Promise.all`. The dashboard calls it twice per render
  (`layout.tsx` unlimited, `page.tsx` with 6), so the route went from 2 to 6
  statements — but each is tiny, they run in parallel, and the result set is now
  bounded by collections × types instead of by item count
- The `groupBy` is deliberately **not** filtered to the fetched collection ids.
  Doing so would force it to wait on the collections query; its result is
  bounded either way, so running all three in parallel is one round trip
  instead of two
- Item types are `select`ed down to the six columns the UI renders.
  `CollectionCardData.types` is typed as the narrow `ItemType`, but the old code
  assigned full Prisma rows into it, quietly serializing `userId`/`createdAt`/
  `updatedAt` across the RSC boundary into the client-side `Sidebar`. This
  duplicates the projection `getItemTypesWithCounts` already hand-lists — a
  second place to edit if `ItemType` gains a rendered field
- Equal type counts now **tie-break on seeded item-type order**. The old code
  relied on `Map` insertion order over a nested query with no `orderBy`, so a
  card's icon row was already nondeterministic between requests. Small
  correctness gain, not just parity
- The count is now `userId`-scoped. `collection.items.length` counted every item
  in the collection regardless of owner; identical today since collections are
  user-scoped, and it diverges only if items ever cross users
- **`Collection` in `src/types/index.ts` is now an unused export** —
  `ItemWithRelations` was its only consumer. Left in place because it is the
  canonical domain type and collections CRUD is next on the roadmap, but the
  precedent from the mock-data removal was to delete view types once nothing
  references them
- The audit's two **low** findings were left out of scope: the hardcoded demo
  password in `prisma/seed.ts:424` (`"12345678"` for `demo@devstash.io`, in git
  history and a working login the moment auth lands — worth randomizing and
  refusing to seed against production first) and a duplicated
  `` `/collections/${slug}` `` literal in `Sidebar.tsx`

### Auth Setup — NextAuth + GitHub Provider (Phase 1) — Completed (2026-09-03)

Stood up Auth.js v5 with GitHub OAuth and put `/dashboard/*` behind a session.
Branch `feature/auth-phase-1`. Five new source files, no existing source file
touched. Spec: `context/features/auth-phase-1-spec.md`.

- Installed `next-auth@5.0.0-beta.32` (the `beta` tag — `@latest` still resolves
  to v4) and `@auth/prisma-adapter@2.11.3`
- Added `src/auth.config.ts` — the edge-safe half, holding only
  `providers: [GitHub]` behind `satisfies NextAuthConfig`. GitHub reads
  `AUTH_GITHUB_ID`/`AUTH_GITHUB_SECRET` from the environment by convention, so
  no `clientId`/`clientSecret` is passed
- Added `src/auth.ts` — spreads the base config, then adds
  `PrismaAdapter(prisma)`, `session: { strategy: "jwt" }` and a `session`
  callback. Exports `auth`, `handlers`, `signIn`, `signOut`
- Added `src/app/api/auth/[...nextauth]/route.ts` —
  `export const { GET, POST } = handlers`
- Added `src/proxy.ts` — `export const proxy = auth(...)` with
  `matcher: ["/dashboard/:path*"]`. Anonymous requests are redirected to
  `/api/auth/signin` with the original path **and query string** preserved as
  `callbackUrl`
- Added `src/types/next-auth.d.ts` — augments `Session["user"]` with a required
  `id: string`
- Documented `AUTH_SECRET`, `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET` in
  `.env.example`, including the localhost callback URL. `.env` already had all
  three set
- Verified in the browser: `/dashboard` → `/api/auth/signin?callbackUrl=%2Fdashboard`;
  `/dashboard?tab=recent` round-trips the query string into `callbackUrl`; `/`
  stays public; the default sign-in page renders one GitHub button that hands
  off with the right `client_id`, PKCE challenge,
  `redirect_uri=…/api/auth/callback/github` and scope `read:user user:email`
- The authenticated path was verified by minting a session JWT locally with
  `AUTH_SECRET` (`@auth/core/jwt`'s `encode`, salt = the cookie name):
  `/api/auth/session` returned `user.id`, and `/dashboard` rendered fully —
  stats 18/5/5/2, all four sections, zero console errors
- The real GitHub round trip was completed by the user. Confirmed in the Neon
  dev branch afterwards: a new `User` row (name, email, image, `password` NULL)
  with its matching `Account` row (`provider=github`, `type=oauth`,
  scope `read:user,user:email`), and `Session` still empty — correct for JWT
  sessions, which write no session rows
- `npx tsc --noEmit`, `npm run lint` and `npm run build` pass; the build
  registers `ƒ Proxy (Middleware)` and `ƒ /api/auth/[...nextauth]`

Decisions worth carrying forward:

- **The user id comes from `token.sub`, not a custom claim, and there is no
  `jwt` callback.** Auth.js already writes `sub: user.id` when it mints the
  token (`@auth/core/lib/actions/callback/index.js`). The documented
  `token.id = user.id` approach was tried first and fails to typecheck:
  `declare module "next-auth/jwt"` never merges, because that module is a bare
  `export * from "@auth/core/jwt"` re-export, so `token.id` stays `unknown` and
  truthiness-narrows to `{}`. Using `sub` avoids augmenting a third-party
  module path entirely
- **The `Session` augmentation in `src/types/next-auth.d.ts` does apply** — the
  base `User.id` is `string | undefined`, so a passing typecheck alone proves
  nothing. Confirmed with a throwaway probe asserting `Session["user"]["id"]`
  rejects `undefined`
- **Next.js 16's `proxy` runs on the nodejs runtime and cannot use edge**
  (confirmed via Context7 against the v16 upgrade guide), so the split config is
  no longer strictly required for edge compatibility. It was kept as specced
  anyway: it keeps Prisma and the Neon driver out of the proxy bundle, which is
  the real win. The proxy instantiates its own `NextAuth(authConfig)`; with no
  adapter it defaults to JWT sessions, matching what `auth.ts` sets explicitly,
  so both halves read the same cookie
- `matcher: ["/dashboard/:path*"]` covers `/dashboard` itself — `:path*` matches
  zero or more segments
- The proxy **hardcodes** `/api/auth/signin` as the redirect target. Correct
  while the spec forbids `pages.signIn`, but it will silently keep pointing at
  the default page once a custom sign-in page lands. The alternative — an
  `authorized` callback in `auth.config.ts`, which lets Auth.js redirect to
  whatever sign-in page is configured — was rejected because the spec defines
  that file as providers-only and asks for the redirect logic in the proxy
- **Only `/dashboard` is protected.** The sidebar already links to
  `/items/[slug]` and `/collections/[slug]`, which do not exist yet; when they
  land they will be unprotected unless the matcher is extended, and nothing
  fails loudly
- **The session cookie is `httpOnly`**, so `document.cookie` can neither read
  nor clear it. An early "signed out" check looked like the proxy had stopped
  redirecting; in fact `/api/auth/session` had re-issued the cookie server-side.
  Clear cookies at the Playwright **context** level, not from page JS
- `TaskStop` on a backgrounded `npm run dev` kills only the npm wrapper — the
  `next dev` process and its `start-server.js` child survive and keep holding
  :3000. Kill the tree by PID (`taskkill /PID <pid> /T /F`)
- `signIn`/`signOut` are exported from `auth.ts` but unused so far; the sign-in
  and sign-out UI is a later phase
- Left deliberately out of scope: **`.env.production` has only `DATABASE_URL`
  and `DIRECT_URL`** — none of the three `AUTH_*` vars. Locally this is masked
  because Next loads `.env.production` *and* `.env`, but `.env*` is gitignored,
  so a real deploy needs all three set in the host's dashboard or Auth.js throws
  `MissingSecret` at runtime. The GitHub OAuth app is also registered only for
  `http://localhost:3000/api/auth/callback/github`
- The seeded demo user still holds the bcrypt hash of `12345678` flagged by the
  earlier audit. Not reachable yet — there is no credentials provider — but it
  becomes a working login the moment one is added
- The dashboard still renders `seed-user-demo`'s data regardless of who signs
  in; every `src/lib/db/*` getter is hardcoded to that id. Moving them onto the
  session user is a later phase. The dev database now holds two users, and
  `npm run db:seed` knows about only the seeded one

### Auth Credentials — Email/Password Provider (Phase 2) — Completed (2026-09-04)

Added email/password sign-in alongside GitHub OAuth, plus a registration
endpoint. Branch `feature/auth-phase-2`. Three new source files, two existing
auth files touched. Spec: `context/features/auth-phase-2-spec.md`.

- Installed `zod@4.5.4` — the coding standards require Zod for input
  validation and it was not yet a dependency
- Added `src/lib/validations/auth.ts` — `registerSchema` and `signInSchema`,
  shared by the route handler and `authorize`
- `src/auth.config.ts` gained the Credentials **placeholder**
  (`authorize: () => null`) and exports `CREDENTIALS_PROVIDER_ID`. The file
  still imports no Prisma, no bcrypt and no Zod, so the split holds
- `src/auth.ts` replaces that placeholder by mapping over
  `authConfig.providers`, so GitHub is not re-declared. The real `authorize`
  parses the credentials, looks the user up by email and `bcrypt.compare`s
- Added `src/app/api/auth/register/route.ts` — `POST /api/auth/register`
  returning 201/409/422/400/500 in the `{ success, data, error }` shape, with a
  P2002 catch so two concurrent registrations settle on the unique index
- `prisma/seed.ts` no longer hardcodes the demo password: it reads
  `SEED_DEMO_PASSWORD`, else generates a random one and prints it once.
  Documented in `.env.example`
- Verified end to end against the dev server. Registration: happy path 201,
  duplicate 409, mismatched passwords / bad email / short password / blank name
  422 with per-field issues, malformed JSON 400. Sign-in: correct password
  302 → `/dashboard` with `user.id` on the session; `/dashboard` then 200;
  wrong password and unknown email both → the same generic
  `CredentialsSignin`, session null
- Security paths confirmed: the GitHub-only user (`password` NULL) cannot sign
  in with credentials, and registering that account's email returns 409 rather
  than overwriting it. GitHub OAuth handoff unchanged — same `client_id`,
  `redirect_uri`, scope and PKCE S256 as Phase 1
- Seed change confirmed: the generated password signs in, the old `12345678`
  no longer does, and `SEED_DEMO_PASSWORD` suppresses generation
- Also driven through the real UI in a clean browser: signed in as the demo
  user via the Auth.js sign-in form, `/dashboard` rendered, zero console errors
- `npx tsc --noEmit`, `npm run lint` and `npm run build` pass; the build
  registers `ƒ /api/auth/register`

Decisions worth carrying forward:

- **The placeholder is swapped by `.map()` over `authConfig.providers`**, not by
  rebuilding the array. Rebuilding would mean re-declaring GitHub in `auth.ts`
  and having two places to keep in sync. `isCredentialsPlaceholder` has to guard
  `typeof provider !== "function"` first — Auth.js allows a provider to be a
  bare function (GitHub is passed unwrapped), and those have no `.id`
- **`authorize` returns null on every failure, never throws.** Throwing would
  let Auth.js surface a distinguishable error; returning null collapses unknown
  email and wrong password into one `CredentialsSignin`
- Sign-in validation is deliberately **looser** than registration —
  `signInSchema` only requires a non-empty password. Re-applying the
  registration rules at sign-in would lock out existing accounts the moment
  those rules are tightened
- The registration route is an API route rather than a Server Action because it
  is a public endpoint with a status-code contract, and the standards list
  "endpoints for future mobile/CLI clients" as the case for route handlers
- **Known limitation, deliberately left in place:** `MAX_PASSWORD_LENGTH` caps
  at 72 *characters*, but bcrypt truncates at 72 *bytes*. Verified: `'a'×60 +
  'é'×12` is 72 characters but 84 bytes, and it compares equal against a hash of
  its 72-byte prefix. So two distinct passwords can collide. The comment in
  `src/lib/validations/auth.ts` overstates the guarantee. A
  `Buffer.byteLength`/`TextEncoder` refinement fixes it in one line; skipped by
  request as low impact
- Two other review findings were also left as-is by request: the credentials
  field block (`id`, `name`, `credentials`) is duplicated verbatim between
  `auth.config.ts` and `auth.ts` — only the `auth.ts` copy ever renders — and
  `RegisterInput` is exported but never imported
- **No rate limiting** on `/api/auth/register` or credentials sign-in. Both are
  brute-forceable; this is the app's first public write endpoint. Out of scope
  here, worth a dedicated pass
- An unknown email skips `bcrypt.compare` and so returns faster than a wrong
  password. Enumeration is already possible through the registration 409, so
  the timing channel adds nothing new and no dummy compare was added
- **Untested path:** registering an email, then signing in via GitHub with that
  same email. Auth.js should return `OAuthAccountNotLinked` (account linking is
  off by default, which is the safe behaviour), but confirming it needs a real
  GitHub round trip
- No sign-in or sign-up **UI** was built — the Auth.js default page already
  renders both providers, and the spec scopes the UI to a later phase.
  `pages.signIn` is still unset, so the Phase 1 proxy's hardcoded
  `/api/auth/signin` target remains correct
- `test@test.com` / `password123` was left in the Neon **dev** database by the
  curl walkthrough, and the demo user's password is now a random value from the
  last seed run

### Auth UI — Sign In, Register & Sign Out (Phase 3) — Completed (2026-09-04)

Replaced the Auth.js default pages with custom UI and put a real account menu
in the sidebar footer. Branch `feature/auth-phase-3`. Eleven new source files,
four existing files touched, no new dependencies. Spec:
`context/features/auth-phase-3-spec.md`.

- Installed the ShadCN `dropdown-menu` and `label` components (the
  `dropdown-menu` deleted as unused back in Dashboard Phase 2)
- Added `src/app/(auth)/layout.tsx` — a route group, so `/sign-in` and
  `/register` get a shared centered card shell without a URL segment. Holds the
  logo linking back to `/`
- Added `src/app/(auth)/sign-in/page.tsx` — server component. Sanitises
  `?callbackUrl`, redirects to `/dashboard` if a session already exists, maps
  Auth.js `?error=` codes to messages, and shows an "Account created" notice on
  `?registered=1`
- Added `src/app/(auth)/register/page.tsx` — same session bounce, wraps the form
- Added `src/actions/auth.ts` — `signInWithCredentials` (for `useActionState`),
  `signInWithGitHub` and `signOutAction`, sharing one `toSafeRedirect` guard
- Added `src/components/auth/`: `SignInForm` (`useActionState`),
  `RegisterForm` (client-side `registerSchema` pass, then `fetch` to
  `/api/auth/register`), `GitHubSignInButton`, `UserAvatar`, `UserMenu`,
  `SubmitButton` (`useFormStatus`) and `FieldError`/`FormError`
- `src/auth.config.ts` gained `pages: { signIn, error }` and exports
  `SIGN_IN_PATH`; `src/proxy.ts` imports that constant instead of hardcoding
  `/api/auth/signin`
- `src/lib/db/user.ts`'s `getCurrentUser()` now resolves the session user
  instead of `seed-user-demo`
- `Sidebar.tsx` dropped its local `getInitials`, the avatar block and the
  display-only settings gear in favour of `<UserMenu />` (net −37 lines)
- Verified in the browser end to end: anonymous `/dashboard?tab=recent` →
  `/sign-in?callbackUrl=%2Fdashboard%3Ftab%3Drecent`; wrong password → "Invalid
  email or password" with the email retained and the password cleared; `a@b` →
  per-field message with `aria-invalid`; register's three validation rules,
  409 duplicate and happy path → `/sign-in?registered=1`; signing in as the new
  account rendered the footer as **BT / Brad Traversy**; sign-out → `/sign-in`;
  signed-in visits to `/sign-in` and `/register` bounce to `/dashboard`; GitHub
  handed off with the same `client_id`, PKCE S256, `redirect_uri` and scope as
  Phase 1. Zero console errors
- `npx tsc --noEmit`, `npm run lint` and `npm run build` pass; the build
  registers `ƒ /sign-in` and `ƒ /register`

Three defects were found and fixed during the review pass:

- **`pages.error` was unset**, so the stock Auth.js error page — the very thing
  this feature exists to replace — was still reachable. Auth.js routes by
  `error.kind`: `CredentialsSignin` and `OAuthAccountNotLinked` extend
  `SignInError` (kind `signIn` → `pages.signIn`), but `AccessDenied`,
  `Configuration` and `Verification` extend `AuthError` directly (kind `error`)
  and fell through to `/api/auth/error`. Two of the four `ERROR_MESSAGES`
  entries were dead code as a result. Confirmed against
  `@auth/core/index.js:135` and `@auth/core/errors.js:41`, then in the browser
- **The `AuthError` catch was too wide.** `MissingSecret`, adapter faults and
  every other Auth.js failure are also `AuthError`, so a real misconfiguration
  would have told the user their password was wrong with nothing logged.
  Narrowed to `error.type === "CredentialsSignin"`; everything else logs and
  returns a generic message
- **The sign-out pending state was unreachable** — Radix unmounts the menu item
  on select, so `isSigningOut` rendered into a dead tree. `event.preventDefault()`
  in `onSelect` keeps the menu open for the round trip

Decisions worth carrying forward:

- **`SIGN_IN_PATH` is exported from `auth.config.ts` and used three ways** —
  `pages.signIn`, `pages.error` and the proxy's redirect. Phase 1 flagged the
  hardcoded `/api/auth/signin` as something that would silently rot once a
  custom page landed; one shared constant is what stops that recurring
- **`pages.error` points at `/sign-in`, not a separate error page.** Auth.js
  guards against an error page that itself requires authentication
  (`ErrorPageLoop`); `/sign-in` is public, so this is safe, and it keeps every
  failure on one surface
- The **sign-in form is a server action** (`useActionState`) while the
  **register form is a client `fetch`**. Not an inconsistency: the spec pins
  registration to the existing `POST /api/auth/register`, and sign-in has to go
  through Auth.js's server-side `signIn` to get the cookie set
- `toSafeRedirect` rejects anything not starting with a single `/`. `//evil.com`
  is protocol-relative and browsers normalise `/\evil.com` to the same thing.
  Not exploitable on its own — Auth.js's `redirect` callback prefixes the origin
  for any `/`-leading URL — but the value is attacker-controlled, so the guard
  is defence in depth. Verified at both layers: the query param never reaches
  the hidden field, and a hand-tampered DOM value still landed on `/dashboard`
- **lucide-react v1 dropped its brand icons**, so there is no `<Github />` to
  import. The mark is inlined as an SVG in `GitHubSignInButton.tsx`
- **The `shadcn` CLI generated both components with `import { cn } from "cn"`
  and installed a junk `cn` package to match.** Fixed the imports to
  `@/lib/utils` and uninstalled it — `package.json` and the lockfile are
  unchanged by this feature. Check generated imports after any `shadcn add`
- The spec asks for both "dropdown on avatar click" and "clicking on the icon
  should go to `/profile`". Resolved as one trigger opening a menu whose first
  item is Profile, which also retires the display-only settings gear. Revisit
  if a separate direct-link icon is wanted
- `UserAvatar` exports `getUserInitials` separately — the name splits on `@` and
  `.` as well as whitespace, so a nameless GitHub account falls back to
  `demo@devstash.io` → "DD" rather than one letter
- **Only `getCurrentUser()` moved onto the session.** Every other `src/lib/db/*`
  getter is still hardcoded to `seed-user-demo`, so the footer shows the real
  signed-in user while the stats, types and collections still show demo data.
  That mismatch is now visible in the UI and wants its own phase
- `/profile` still does not exist; the menu item links ahead of it
- The **real GitHub OAuth round trip was not completed** — verified only as far
  as the authorize URL. `OAuthAccountNotLinked` now has a message and a route to
  display it, but reaching it still needs a live GitHub sign-in
- **No rate limiting** on sign-in or register, carried over from Phase 2 and now
  more exposed with a real login form. Still worth a dedicated pass
- `phase3@devstash.io` / `phase3password` (name "Brad Traversy") was left in the
  Neon **dev** database by the walkthrough, alongside Phase 2's `test@test.com`

### Email Verification on Register — Completed (2026-09-04)

New accounts are created unverified and emailed a single-use link through
Resend; credentials sign-in is gated on confirming it. Branch
`feature/email-verification`. Six new source files plus a migration and a
maintenance script, six existing files touched. Loaded from an inline
description rather than a spec file.

- Installed `resend@6.26.0` — the only new dependency
- Added `src/lib/email.ts` — Resend client singleton and the verification
  email (HTML + plain-text). `sendEmail` returns a boolean and never throws;
  the SDK reports provider failures in the payload rather than by throwing, so
  both that and a transport error are logged and collapsed to `false`
- Added `src/lib/email-verification.ts` — `issueEmailVerification`,
  `verifyEmailWithToken` and `resendEmailVerification`, plus
  `VERIFICATION_TOKEN_TTL_HOURS = 24` (imported by the UI copy so the number
  is stated in exactly one place)
- Added `src/lib/auth-errors.ts` — `EmailNotVerifiedError extends
  CredentialsSignin` with `code = "email_not_verified"`, and the
  `isEmailNotVerifiedError` narrowing helper
- Added `GET /api/auth/verify-email` — the link target. Consumes the token,
  then redirects to `/sign-in?verified=1`, or to `/verify-email` with
  `?error=expired&email=…` / `?error=invalid`
- Added `/verify-email` (in the existing `(auth)` route group) with four
  states — `pending`, `unsent`, `expired`, `invalid` — and
  `ResendVerificationForm`, a client form over a new `resendVerificationEmail`
  action
- `src/auth.ts`'s `authorize` now selects `emailVerified` and throws
  `EmailNotVerifiedError` once the password has already matched
- `src/actions/auth.ts` checks that error **before** the existing
  `AuthError` branch and returns `needsVerification`, which `SignInForm` turns
  into a "Resend the verification email" link carrying the address
- `POST /api/auth/register` issues the link after the insert and returns
  `emailSent` on the 201 body; `RegisterForm` routes to
  `/verify-email?email=…` (plus `&sent=0` when the send failed) instead of
  the old `/sign-in?registered=1`. The sign-in page's `?registered=1` notice
  was replaced by `?verified=1`
- Migration `20260904120000_verification_token_unique` adds `@unique` to
  `VerificationToken.token`; `prisma migrate status` reports the schema up to
  date
- Added `scripts/delete-users.ts` + `npm run db:delete-users` — deletes every
  user except `demo@devstash.io` and everything they own. Dry run by default,
  `-- --confirm` to act. Run once with `--confirm`: 5 accounts removed
  (including the Phase 1 GitHub `Account` row), demo's 18 items / 5
  collections / 29 tags and the 7 system types untouched
- Documented `AUTH_URL`, `RESEND_API_KEY` and `EMAIL_FROM` in `.env.example`
- `npx tsc --noEmit`, `npm run lint` and `npm run build` pass; the build
  registers `ƒ /verify-email` and `ƒ /api/auth/verify-email`

Verified in the browser end to end: register → `/verify-email`; unverified
sign-in → "Verify your email address before signing in" with the resend link
and `/api/auth/session` still `null`; wrong password and unknown email → the
unchanged generic "Invalid email or password"; a resend supersedes the
previous link (old token → invalid); valid link → `/sign-in?verified=1` →
sign in → dashboard with the footer reading **VT / Verify Tester**; replayed
link → invalid; missing `?token=` → invalid; expired link (TTL temporarily
set to 0, then reverted) → the expired state with the address prefilled, and
the account stayed blocked; resend for unknown / already-verified / seeded
addresses returned the identical neutral message and issued **zero** tokens
(confirmed by the unchanged dev-log count); GitHub handed off with the same
`client_id`, PKCE S256, `redirect_uri` and scope as Phase 1. Zero console
errors across all four page states.

Decisions worth carrying forward:

- **A thrown `CredentialsSignin` subclass survives out of Auth.js intact**,
  which is what makes a specific "verify your email" message possible at all.
  Confirmed by reading the installed source rather than guessing:
  `@auth/core/lib/actions/callback/index.js:385` rethrows any `AuthError`
  instead of wrapping it in `CallbackRouteError`, and `@auth/core/index.js:123`
  rethrows again when `raw` is set and `X-Auth-Return-Redirect` is not — which
  is exactly how `next-auth/lib/actions.js` calls `Auth` from a server action.
  `AuthError`'s constructor reads `this.constructor.type`, so a subclass still
  reports `type === "CredentialsSignin"` through static inheritance
- **The gate throws where every other failure returns null.** Phase 2's rule
  still holds for unknown email and wrong password — both stay
  indistinguishable. This branch is only reachable *after* `bcrypt.compare`
  succeeds, so naming the reason reveals nothing the caller could not already
  determine
- **The link target is a route handler, not a page.** A server component that
  consumed the token during render would burn it on any RSC re-fetch or
  prefetch, and could not cleanly end on a different URL. Always redirecting
  also keeps the token out of the address bar and out of the `Referer` header
- **Single use is enforced by the delete, not by a flag.** `findUnique` →
  `delete` by the now-unique token; whoever deletes the row first owns it, and
  the loser gets "invalid". The expiry check happens *after* the delete so an
  expired link is cleaned up rather than left to rot
- **Identifiers are namespaced** as `email-verification:<email>`.
  `VerificationToken` is NextAuth's shared table; without the prefix, issuing a
  link would delete a pending magic-link token for the same address, and
  `verifyEmailWithToken` would happily consume one. The prefix check is what
  lets it leave a foreign token alone rather than deleting it to find out
- **Only the SHA-256 of the token is stored.** A plain hash is right here where
  bcrypt would be wrong — the token is 256 bits of CSPRNG output, so there is
  nothing to brute-force and the cost would buy nothing
- **A failed send is never fatal.** The user row is already committed, so
  failing the request would leave an account the caller believes was never
  created. The 201 carries `emailSent` and the UI offers a resend
- **The resend path is deliberately silent.** Unknown address, already-verified
  account and OAuth-only account all do nothing and return the identical
  message, so the form cannot be used to enumerate accounts. Only a malformed
  address fails visibly
- **`prisma migrate dev` cannot run non-interactively when it has a warning to
  confirm** — adding a unique index triggers one. The migration file was
  hand-written into `prisma/migrations/` and applied with `migrate deploy`;
  same history, same result. Worth remembering for any future index or
  constraint addition
- The verification URL is `console.log`ged in development only. The sandbox
  sender cannot reach any address but the Resend account owner's, so without it
  the flow is untestable locally
- **Resend's sandbox sender is confirmed working but restricted.** A real send
  returned `403 validation_error`: *"You can only send testing emails to your
  own email address (mercera36@gmail.com)"* — the key and payload are good, the
  sender is the only blocker. **Nothing reaches any other recipient until a
  domain is verified and `EMAIL_FROM` is repointed.** The rendered email was
  never inbox-checked; the user opted to confirm that manually
- **`AUTH_URL` is new and required on a deployment.** It is what builds the
  absolute link; without it every verification email points at `localhost:3000`.
  `.env.production` still has none of the `AUTH_*` vars (Phase 1) and now needs
  `RESEND_API_KEY` too
- The demo user was already seeded with `emailVerified` set, so the seed needed
  no change. The Phase 2/3 throwaway accounts were left locked out by choice
  rather than backfilled — then removed entirely by `db:delete-users`
- **No rate limiting**, carried over from Phases 2 and 3 and now more exposed:
  the resend form is a third unauthenticated public write, and it triggers an
  outbound email. The strongest case yet for a dedicated pass
- `scripts/delete-users.ts` deletes items **before** users on purpose:
  `Item.type` is `onDelete: Restrict`, so a user's custom `ItemType` cannot be
  cascaded away while their own items still reference it. It also sweeps
  `VerificationToken` by hand — that table has no foreign key to `User`, so
  nothing cascades it — and refuses to run when `demo@devstash.io` is missing,
  since "everything except demo" with no demo row is just "everything"

### Email Verification Feature Flag — Completed (2026-09-04)

Made the email verification requirement switchable without a code change.
Branch `feature/email-verification-flag`. One new source file, eight existing
files touched, no new dependencies, no migration. Loaded from an inline
description rather than a spec file.

- Added `src/lib/flags.ts` — `isEmailVerificationEnabled()`, the one module
  that owns the decision. `grep process.env src/` confirms
  `EMAIL_VERIFICATION_ENABLED` is read nowhere else
- `src/auth.ts`'s `authorize` skips the `emailVerified` gate when the flag is
  off; `EmailNotVerifiedError` is otherwise untouched
- `POST /api/auth/register` issues no link when off, and reports
  `verificationRequired` on the 201 body alongside the existing `emailSent`
- `RegisterForm` gained `destinationAfterRegister()` — `/sign-in?registered=1`
  when nothing needs confirming, `/verify-email?email=…` otherwise
- `src/app/(auth)/sign-in/page.tsx` collapsed its two notices into one
  `notice` value, restoring "Account created. Sign in to continue." on
  `?registered=1` beside "Email verified…" on `?verified=1`
- `/verify-email` redirects to `SIGN_IN_PATH` when the flag is off, and
  `resendVerificationEmail` returns its usual neutral reply without sending.
  The message moved to a shared `NEUTRAL_RESEND_MESSAGE` constant now that
  two branches return it
- `.env.example` documents the flag, its default and why you would turn it off;
  `.env` was set to `"false"` locally
- `npx tsc --noEmit`, `npm run lint` and `npm run build` pass

One defect was found by the build and fixed:

- **`/verify-email` silently became a static route.** The flag check runs
  before `await searchParams`, so `next build` prerendered the page, took
  whichever branch the *build machine's* environment gave, and baked in a
  static redirect that no longer responded to the flag at runtime. Caught in
  the build output — the route dropped from `ƒ` to `○`. Fixed with
  `export const dynamic = "force-dynamic"`, same remedy as the dashboard's
  frozen-snapshot problem, and confirmed back to `ƒ`

Verified in the browser across **both** flag states. Off: register →
`/sign-in?registered=1` with the restored notice, immediate sign-in works, and
`/verify-email` redirects to `/sign-in` from all three of its states — with
**zero** verification links, **zero** Resend calls and **zero**
`VerificationToken` inserts in the server log. On: registration returns to
`/verify-email`, the page renders normally. The off → on transition was walked
end to end: `flag-off@devstash.io` registered while off, then blocked after the
flip with the session still `null`, then recovered through the resend form →
fresh link → verified → signed in as **FO / Flag Off**. The parser was checked
across 15 inputs (unset, `""`, `TRUE`, `banana`, `"  false  "`, `OFF`, …) with a
throwaway `tsx` probe, since the project has no test runner. Zero console
errors.

Decisions worth carrying forward:

- **On unless explicitly disabled.** Unset, empty, misspelled or dropped during
  a deploy all mean ON; only `"false"`, `"0"`, `"off"`, `"no"` (any case,
  trimmed) mean OFF. A variable that goes missing must never silently switch a
  protection off — the cost is that turning it off takes a deliberate setting
- **Read per call, not captured at module load.** A module-scope `const` is
  evaluated while `next build` collects page data, which turns a runtime toggle
  into a build-time one. This is the same trap the `force-dynamic` fix above
  addresses from the other end
- **No `NEXT_PUBLIC_` prefix.** Every consumer is server-side. The one client
  component that has to branch — `RegisterForm`, deciding where to go after a
  201 — is told by the server on the response body instead
- **`emailVerified` is left null when the flag is off, not stamped.** The
  column never claims an address was confirmed when it wasn't, so a
  waved-through account stays distinguishable from a genuinely verified one.
  The price is that flipping the flag back on blocks those accounts; the way
  back in is `/verify-email`, which is self-serve and was verified end to end
- **`GET /api/auth/verify-email` is deliberately not gated.** Turning the flag
  off stops the app requiring and sending verification; it must not strand a
  link already sitting in an inbox. Honouring one is harmless — the address
  really was confirmed
- The resend action's no-op branch is unreachable through the UI (its page
  redirects), so it was verified by capturing the server-action POST with the
  flag on — `Next-Action` header plus the multipart body — and replaying it
  with the flag off. Neutral message returned, link count unchanged
- **A deploy from this state cannot register anyone.** `.env.production` holds
  `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `AUTH_GITHUB_ID` and
  `AUTH_GITHUB_SECRET` — but no `EMAIL_VERIFICATION_ENABLED`, no
  `RESEND_API_KEY` and no `AUTH_URL`. So production defaults to verification
  ON, `sendEmail` finds no API key, every sign-up lands on "We couldn't send
  that email", and the resend button fails the same way. The safe default
  failing closed is working as designed, but production needs a deliberate
  setting: either the flag off until the Resend domain is verified, or all of
  `RESEND_API_KEY` + `AUTH_URL` + a verified `EMAIL_FROM`. (This also corrects
  the Phase 1 note that `.env.production` has none of the `AUTH_*` vars — it
  now has all three)
- **Known, pre-existing, not introduced here:** `issueEmailVerification` does
  two unguarded Prisma writes, so a database fault there propagates to the
  register route's catch and returns a 500 for an account that has *already*
  been created — after which a retry gets a 409. The "deliberately not fatal"
  comment only holds for *send* failures. A one-line try/catch fixes it; left
  alone as out of scope for a flag feature
- Minor and accepted: with the flag off, a bad verification link double
  redirects (`?error=invalid` → `/verify-email` → `/sign-in`) and the visitor
  gets no explanation. Not a dead end, and arguably right when there is nothing
  to verify
- `flag-off@devstash.io` / `flag-on@devstash.io` were left in the Neon **dev**
  database by the walkthrough. `npm run db:delete-users -- --confirm` clears
  them

### Forgot Password — Completed (2026-09-07)

Self-serve password reset, built on the existing `VerificationToken` model so
no schema change or migration was needed. Branch `feature/forgot-password`.
Eight new source files, eight existing files touched, no new dependencies.
Loaded from an inline description rather than a spec file.

- Added `src/lib/password-reset.ts` — `requestPasswordReset`,
  `checkPasswordResetToken`, `resetPasswordWithToken` and
  `PASSWORD_RESET_TOKEN_TTL_HOURS = 1`, mirroring `src/lib/email-verification.ts`
- Added `src/lib/tokens.ts` (`createToken`, `hashToken`, `getBaseUrl`) and
  `src/lib/password.ts` (`hashPassword`, owning the bcrypt cost factor). Both
  extract what the two emailed-link flows would otherwise have duplicated;
  `email-verification.ts` and the register route were moved onto them
- Added `src/lib/routes.ts` — `FORGOT_PASSWORD_PATH` / `RESET_PASSWORD_PATH`
- `src/lib/email.ts` gained `sendPasswordResetEmail`, and both messages now
  render through one `renderActionEmailHtml`/`renderActionEmailText` pair
- Added `/forgot-password` (states `request`, `expired`, `invalid`) and
  `/reset-password`, plus `ForgotPasswordForm` and `ResetPasswordForm`
- `src/actions/auth.ts` gained `requestPasswordResetEmail` and `resetPassword`;
  `resetPasswordSchema` was added to `src/lib/validations/auth.ts`
- `SignInForm` gained the "Forgot password?" link beside the password label;
  the sign-in page's notice logic moved into `resolveNotice` and gained
  `?reset=1`
- Added `formatHours` to `src/lib/format.ts` — the two flows' lifetimes differ
  (1 hour vs 24), so neither the email nor the page can hardcode the noun
- `npx tsc --noEmit`, `npm run lint` and `npm run build` pass; the build
  registers `ƒ /forgot-password` and `ƒ /reset-password`

Verified in the browser end to end, zero console errors throughout: unknown,
OAuth-only and real addresses all returned a byte-identical neutral reply while
the dev log showed **exactly one** link issued, for the real address only; a
malformed address was the one visible failure; reset → old password rejected
with the unchanged generic message, new password → dashboard; a replayed link,
a garbage token and a missing token all landed on `?error=invalid`; an expired
link (TTL temporarily 0, then reverted) landed on `?error=expired` with the
address prefilled; pending `email-verification:` rows survived both resets
untouched. With the flag **on**, an account registered and then blocked at
sign-in recovered through a reset and signed in immediately with no separate
verification step.

Decisions worth carrying forward:

- **The reset page is a page; the verification link is a route handler.** They
  differ because a verification link finishes on click while a reset link does
  not — a new password still has to be typed. So `/reset-password` only *reads*
  the token (`checkPasswordResetToken`), and `resetPassword` claims it on
  submit. An RSC re-fetch or a browser prefetch therefore cannot burn the link
  before it has been used
- **A link that will not work never renders a form.** Both the page's
  pre-check and the action's post-check redirect to `/forgot-password` with
  `?error=expired|invalid`, so there is one surface that explains a dead link
  and offers another. The expired branch carries the address so the form is
  prefilled
- **TTL is 1 hour, not verification's 24** — a reset link takes over an account
  rather than confirming one
- **OAuth-only accounts are a silent no-op.** Letting a reset set a password
  would attach a credentials login to an account that until then existed only
  behind GitHub, available to anyone who reached that inbox; naming the provider
  in the reply would leak whether an address is registered and how
- **A successful reset stamps `emailVerified` when it was null.** Clicking the
  link proves the same inbox control verification asks for, so without this an
  account could reset its password and still be turned away at sign-in with no
  way forward. Confirmed by contrast: `reset-me@devstash.io` registered and
  never reset is still null, while `reset-flow@` was stamped by its reset. An
  already-verified account keeps its original date
- **Not gated on `EMAIL_VERIFICATION_ENABLED`.** Being unable to sign in is a
  problem whether or not the app is asking anyone to confirm addresses. Walked
  in both flag states
- **`src/lib/routes.ts` exists because of the client boundary.** `SignInForm` is
  a client component, and importing `FORGOT_PASSWORD_PATH` from
  `password-reset.ts` would have pulled Prisma, bcrypt and the Resend client
  into the browser bundle
- The email refactor leaves the verification message **unchanged** — same
  literals, same subject, and `formatHours(24)` renders the same `"24 hours"`.
  `intro` is stored without trailing punctuation because the HTML ends it with a
  full stop and the plain-text version with a colon
- **Both new routes build as `ƒ` without `force-dynamic`**, because each awaits
  `searchParams` before any branching. This is the other side of the
  `/verify-email` trap from the previous feature: what made that page static
  was a flag check that ran *before* the await
- **Sessions survive a reset.** Sessions are JWT, so there is no session table
  to clear and an already-issued cookie stays valid until it expires. Revoking
  them needs a token version column checked in the `jwt`/`session` callback, or
  database sessions — both larger than this feature
- **Expired token rows linger.** The page's pre-check is read-only, so an
  expired link stays in the table until it is superseded or submitted. The
  verification flow behaves the same way; neither has a cleanup job
- **Resend's sandbox restriction is unchanged** — sends still only reach
  `mercera36@gmail.com`, so the whole walkthrough ran on the development-only
  `console.log` link and the reset email was never inbox-checked
- **Still no rate limiting.** This adds a fourth unauthenticated public write
  that triggers an outbound email, carried over from Phases 2/3 and email
  verification
- `reset-flow@`, `reset-me@`, `reset-verify@` and an `oauth-only@devstash.io`
  row (created with `password` NULL to exercise the no-op path) were left in the
  Neon **dev** database. `npm run db:delete-users -- --confirm` clears them

### Profile Page — Completed (2026-09-07)

The account page at `/profile` — identity, usage, change password and delete
account. Branch `feature/profile-page`. Seven new source files, nine existing
files touched, no new dependencies. Spec:
`context/features/profile-spec.md`.

- Installed the ShadCN `alert-dialog` component
- Added `src/app/profile/page.tsx` — a server component with
  `export const dynamic = "force-dynamic"`; identity card, four stat cards,
  the per-type breakdown, and the two account sections
- Added `getProfileUser()` to `src/lib/db/user.ts` and the `ProfileUser` type,
  which carries `createdAt` and a `hasPassword` boolean. The password hash is
  never selected — the page only needs to know whether one exists
- Added `src/actions/profile.ts` — `changePassword` and `deleteAccount`, both
  resolving the session user
- Added `changePasswordSchema` to `src/lib/validations/auth.ts` and
  `src/lib/validations/profile.ts` (`DELETE_CONFIRMATION_WORD`,
  `deleteAccountSchema`)
- Added `ChangePasswordForm` and `DeleteAccountDialog` under
  `src/components/profile/`
- `src/proxy.ts`'s matcher gained `/profile`
- Added `formatLongDate` to `src/lib/format.ts` (`January 15, 2026`)
- Moved both emailed-link identifier prefixes into `src/lib/tokens.ts` behind
  `EMAIL_VERIFICATION_PREFIX`, `PASSWORD_RESET_PREFIX` and
  `linkTokenIdentifiersFor()`; `email-verification.ts` and `password-reset.ts`
  now import theirs from there
- `npx tsc --noEmit`, `npm run lint` and `npm run build` pass; the build
  registers `ƒ /profile`

Verified in the browser end to end, zero console errors throughout: anonymous
`/profile` → `/sign-in?callbackUrl=%2Fprofile` and back to `/profile` after
signing in; the identity card read the real session user with initials, long
join date and "Email account"; stats 18/5/5/2 and all seven types at
4/3/5/0/0/0/6 = 18 including the zeros. Change password rejected a wrong
current password, a new password equal to the current one, a mismatched
confirmation and a too-short password, each with the right per-field message,
then succeeded with the three fields cleared — after which the new password
signed in and the old one did not. A **minted session** for the OAuth-only
account (it cannot sign in with a password) showed "GitHub account" with zero
change-password headings and zero password fields. The delete dialog named the
account, stayed disabled until the exact word was typed, **rejected a
DOM-tampered submit server-side**, and on a real confirmation redirected to
`/sign-in` with the session cleared. The database afterwards: user, custom item
type, item, collection, tag and both token rows all gone, with the demo account
intact at 18 items / 5 collections / 7 system types. The reset-link flow and the
dashboard were re-checked after the prefix refactor and were unaffected.

Decisions worth carrying forward:

- **Reads stay demo-scoped, writes are session-scoped.** By request, the usage
  stats keep reading `seed-user-demo` through the existing
  `getItemStats`/`getItemTypesWithCounts`/`getCollectionStats`, so the page
  shows the real signed-in identity above demo numbers. That is written into
  the page's doc comment so it reads as a decision, not a bug. The **actions
  must not** follow suit: pointing `changePassword` or `deleteAccount` at
  `DEMO_USER_ID` would let any signed-in user rewrite or destroy the demo
  account. Moving every getter onto the session is still its own feature,
  first flagged in Auth Phase 3
- **The delete confirmation is enforced on the server**, not by the disabled
  button. Proved by stripping `disabled` in the DOM, blanking the field and
  posting anyway — the action returned "Type DELETE to confirm." The constant
  lives in `src/lib/validations/profile.ts` because a `"use server"` module may
  only export async functions, so it could not be shared from the action
- **The delete button is a plain `Button`, not `AlertDialogAction`.** The
  latter closes the dialog on click, which unmounts the form and cancels its
  own submit before the action runs — the same trap as the Phase 3 sign-out
  menu item. The dialog stays open for the round trip and the redirect takes
  it down
- **The change-password section is absent for a GitHub account, not disabled.**
  The action refuses too: setting a first password there would attach a
  credentials login to an account that existed only behind OAuth, matching the
  rule established for password reset
- `ChangePasswordForm` clears itself with a `key` that flips on success. The
  three inputs are uncontrolled, so a re-render alone would leave the old
  values sitting in them
- **Closing the dialog on error via `useEffect` fails lint**
  (`react-hooks/set-state-in-effect`) and was the wrong design anyway — the
  error now renders inside the dialog, where it can actually be read
- **`/profile` sits outside the dashboard segment**, so it does not inherit the
  sidebar; the header carries a "Back to dashboard" link instead. Sharing the
  shell would mean restructuring both routes into a route group
- The page redirects when `getProfileUser()` returns null. The proxy already
  turns anonymous requests away, but a JWT outlives the `User` row it names, so
  a deleted account's session would otherwise reach a page with nothing to render
- **A bug from the previous feature was fixed here.**
  `scripts/delete-users.ts` built its keep-list from `email-verification:`
  identifiers only, so once password reset landed it would have deleted
  surviving users' *pending* reset tokens rather than orphans. Both namespaces
  now come from `linkTokenIdentifiersFor()`, which the delete action uses too —
  so a flow added later cannot be silently missed by either
- **The `shadcn` CLI reproduced the Auth Phase 3 bug exactly** — it generated
  `import { cn } from "cn"` and installed a junk `cn` package to match. It also
  prompts to overwrite `button.tsx` and hangs on a non-interactive stdin; pipe
  `n` into it. Import fixed and the package removed, so this feature adds no
  dependencies. Check generated imports after every `shadcn add`
- **Sessions still survive both actions.** A password change does not
  invalidate an already-issued JWT, and neither does deleting the account —
  `deleteAccount` has to call `signOut` explicitly. Revoking other devices'
  cookies needs a token version or database sessions, unchanged from the
  password reset write-up
- `profile-delete@devstash.io` was created and then deleted by the walkthrough,
  so it left nothing behind. `reset-flow@devstash.io`'s password is now
  `profilepass3`, and the `oauth-only@devstash.io` row remains in the Neon
  **dev** database for the no-password branch

### Rate Limiting for Auth — Completed (2026-09-07)

Sliding-window rate limiting over Upstash Redis on the five unauthenticated
auth surfaces. Branch `feature/rate-limiting-auth`. Four new source files,
ten existing files touched, three new dependencies, no migration. Spec:
`context/features/rate-limiting-spec.md`.

- Installed `@upstash/ratelimit@2.0.8`, `@upstash/redis@1.38.4` and the ShadCN
  `sonner` component (which brought `sonner@2.0.8`)
- Added `src/lib/rate-limit.ts` — the whole mechanism. `checkRateLimit(name,
  identifier)` returns `{ success, remaining, reset }`; `getClientIp`,
  `ipAndEmailKey`, `retryAfterSeconds` and `rateLimitMessage` are the
  supporting pieces. The five limits live in one `LIMITS` table
- Added `RateLimitedError` to `src/lib/auth-errors.ts` — a `CredentialsSignin`
  subclass carrying `retryAfterSeconds`, alongside the existing
  `EmailNotVerifiedError`
- `src/auth.ts`'s `authorize` gained the sign-in limit, consumed before the
  user lookup. Its signature is now `authorize(credentials, request)`
- `POST /api/auth/register` answers 429 with a `Retry-After` header, checked
  before the body is parsed
- `src/actions/auth.ts` gained one `rateLimitFailure()` helper serving
  `requestPasswordResetEmail`, `resetPassword` and `resendVerificationEmail`;
  all four action states gained a `rateLimited` flag
- Added `src/hooks/use-rate-limit-toast.ts` and mounted `<Toaster />` in
  `src/app/layout.tsx`. The four action-driven forms share the hook;
  `RegisterForm` reads the 429 off the status code instead
- Documented `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` in
  `.env.example`; both were already set in `.env`
- `npx tsc --noEmit`, `npm run lint` and `npm run build` pass; every route
  still builds as it did before

Verified against a running server, zero console errors throughout:

| Surface | Result |
| --- | --- |
| Register (3/1h, IP) | 3 pass, then 429 with `Retry-After: 666` |
| Sign-in via the raw `/api/auth/callback/credentials` | 5 pass, then `code=rate_limited` |
| Sign-in via the form | 5 pass, then the message inline **and** as a toast |
| Forgot password (3/1h, IP) | 3 pass, then blocked; varying the email bought no extra attempts |
| Reset password (5/15m, IP) | 5 pass, then blocked |
| Resend verification (3/15m, IP+email) | 3 pass for one address, then blocked; a different address got its own budget |
| Fail-open, credentials unset | 8 register + 8 sign-in all passed, no log spam |
| Fail-open, Upstash unreachable | all passed, failure logged |
| Happy path | 4 wrong passwords then the correct one → signed in, session issued |

Three divergences between the spec's endpoint table and this codebase were
raised at load time and resolved by the user before implementation: the
status-code contract applies to the register route only, sign-in is limited in
`authorize`, and `sonner` was installed rather than reusing the inline error
pattern.

Decisions worth carrying forward:

- **Sign-in is limited inside `authorize` because that is the only point both
  entry paths share.** Confirmed against the installed source rather than
  assumed: `signInWithCredentials` calls next-auth's server-side `signIn()`,
  which builds a `Request` and invokes `Auth()` in process
  (`next-auth/lib/actions.js:44`) — it never makes an HTTP request, so a
  wrapper around `handlers.POST` in the `[...nextauth]` route would have missed
  the entire UI path while covering only the raw callback. Both paths were then
  verified separately
- **`authorize` receives the original `Request` as its second argument**
  (`CredentialsConfig.authorize` in `@auth/core/providers/credentials.d.ts`),
  so the IP comes from `request.headers` with no `next/headers` dependency.
  Those headers really are the caller's:
  `@auth/core/lib/actions/callback/index.js:233` reconstructs the request with
  the incoming `headers` verbatim, and the server action seeds them from
  `await nextHeaders()`
- **Every limit is consumed before the account is looked up.** This is what
  keeps a 429 from becoming an enumeration channel — a limiter that only fired
  for addresses that turned out to exist would announce which addresses exist.
  Proved by driving the sign-in limit to completion against an address that has
  no account
- **It fails open, and that includes missing configuration.** Unset, empty,
  unreachable and slow all allow the request. A rate limiter that fails closed
  turns a Redis outage into a total sign-in outage, which is the worse failure.
  The cost is that a deploy without the two variables silently runs
  unprotected — which is exactly the state `.env.production` is in
- **Configuration is read per call, never captured at module load.** Same trap
  as the email-verification flag: a module-scope client would be constructed
  while `next build` collects page data, freezing the build machine's
  environment into the output. The limiter cache is keyed on the credentials so
  a change drops it rather than reusing a stale connection
- **`Retry-After` under-states on a sliding window, by design of the library.**
  Upstash computes `reset` as `(currentWindow + 1) * windowDuration` — the end
  of the current fixed bucket — while the sliding calculation keeps weighting
  the previous bucket past that boundary. So the 1-hour register limit reported
  "12 minutes". Nothing better is exposed, and the failure is self-correcting:
  retrying early earns another refusal carrying a fresh, smaller figure, and
  nobody is held longer than the window. Documented on `retryAfterSeconds`
- **The sign-in key is IP+email, per the spec, and that has a known gap.** It
  stops one account being brute-forced and stops one person's fumbling from
  locking out a shared exit node, but it does **not**, on its own, throttle one
  password sprayed across many different accounts from a single address. An
  additional IP-only sign-in limit would close it; deliberately not added,
  since the spec names the key
- **`x-forwarded-for` is only as trustworthy as the proxy in front of it.** The
  first entry of the chain is the original client, but a client talking to the
  origin directly can forge the whole header. On Vercel the proxy overwrites
  it, which is what makes it usable. Every test here spoofed it freely, which
  is both how the limits were exercised without burning real budgets and a live
  demonstration of the caveat
- **The message is rendered inline *and* as a toast, deliberately.** The spec
  asks for a toast, but a toast is transient and cannot fire at all when the
  form is submitted without JavaScript — server actions still work there. The
  inline error is the correctness floor; the toast is the attention-grabbing
  half. `useRateLimitToast` keys on the state object's identity so a re-render,
  or Strict Mode running the effect twice, does not stack duplicates
- **`next-themes` was removed after the `shadcn` CLI pulled it in for
  `sonner`.** This app hardcodes `dark` on `<html>` with no provider, so
  `useTheme()` falls back to `"system"` and would have painted a light toast
  over the dark UI on a light-mode machine. Theme pinned to `"dark"` instead.
  The CLI did **not** reproduce the `import { cn } from "cn"` bug this time,
  but it still warrants a check after every `shadcn add`
- Analytics is off on every limiter: it writes an extra key per request against
  the free tier's 10k/day and nothing in the app reads it
- **`.env.production` has neither Upstash variable**, so a deploy from this
  state fails open and runs entirely unthrottled. This is the fourth feature in
  a row to end with a production environment gap — it now also lacks
  `EMAIL_VERIFICATION_ENABLED`, `RESEND_API_KEY` and `AUTH_URL`
- `ratelimit@devstash.io` / `ratelimitpass` and one unspent password-reset
  token were left in the Neon **dev** database by the walkthrough.
  `npm run db:delete-users -- --confirm` clears them

### Items List View — Completed (2026-09-23)

The first page outside the dashboard: `/items/[type]` lists the user's items
of one type in a responsive grid. Branch `feature/items-list-view`. One new
source file, one moved layout, two existing files touched, no new
dependencies. Spec: `context/features/item-list-view-spec.md`.

- Moved `src/app/dashboard/layout.tsx` into an `(app)` route group as
  `src/app/(app)/layout.tsx` (`AppLayout`), and `dashboard/page.tsx` beside it
  under `(app)/dashboard/`. `/dashboard` and `/items/[type]` now share the
  sidebar and top bar with no change to either URL. Both files were moved with
  `git mv`, so history follows them
- Added `src/app/(app)/items/[type]/page.tsx`: a server component with a header
  (type icon tile, name, item count), a `grid gap-4 md:grid-cols-2` of the
  existing `ItemCard`, a dashed "No notes yet." empty state and `notFound()` for
  an unknown slug. The tab title is the type name (`Snippets | DevStash`)
- Added `getItemsByType(slug)` to `src/lib/db/items.ts`. It resolves the type
  first (system types or the demo user's own), then loads the items with the
  existing `itemInclude` / `toItemWithRelations`, most recently updated first.
  Returns null for an unknown slug
- `src/proxy.ts`'s matcher gained `/items/:path*`
- `npx tsc --noEmit`, `npm run lint` and `npm run build` pass; `/items/[type]`
  builds as `ƒ (Dynamic)`

Verified in the browser, zero console errors apart from the expected 404
resource log: anonymous `/items/snippet` →
`/sign-in?callbackUrl=%2Fitems%2Fsnippet` and back after signing in;
`/items/snippet` rendered 4 cards in two 560px columns with 4px blue borders,
the Snippets sidebar row active and the top bar present; `/items/link` 6 green,
`/items/command` 5 orange; `/items/note` "0 items" with the empty state;
`/items/snippets` → 404; at 390px a single column, no horizontal scroll and the
sidebar collapsed into the drawer; `/dashboard` unchanged at 18/5/5/2 with 5
collections, 4 pinned and 10 recent.

Decisions worth carrying forward:

- **The URL uses the singular slug** (`/items/snippet`), not the spec's
  `/items/snippets`. `ItemType.slug` is singular and the sidebar already linked
  there, the same call made in Dashboard Phase 2. The plural form 404s
- **The shell is shared through an `(app)` route group** rather than nesting
  under `/dashboard/items/…` or shipping without the sidebar. Chosen by the user
  at load time. Any future signed-in page with the sidebar (collections, item
  detail) goes inside `(app)/`. `/profile` is still outside it by the earlier
  decision
- **The group layout types its props as `{ children: ReactNode }`**, not
  `LayoutProps<"/dashboard">`. It no longer belongs to one route, matching how
  `(auth)/layout.tsx` does it
- **The type is resolved before the items are fetched**, rather than filtering
  items through the relation (`type: { slug }`). That keeps an unknown slug
  (404) distinct from a known type with no items (empty state), and a slug is
  only unique per owner. It costs a second round trip
- **When a custom type and a system type share a slug, the system type wins**
  (`orderBy: createdAt asc`), which leaves the custom type's page unreachable.
  Moot until custom types exist. The real fix is to reject clashing slugs when
  custom types are created
- **`generateMetadata` and the page share one lookup through React `cache`.**
  Confirmed in the Prisma log: the slug query ran once per request, not twice
- **No `force-dynamic` on the page itself.** The group layout declares it, and
  the page awaits `params` before branching anyway. The build reports it as `ƒ`
- **`/items/*` is now behind the proxy.** Auth Phase 1 flagged that new routes
  would be public unless the matcher was extended. `/collections/*` will need
  the same line when it lands
- Still demo-scoped: `getItemsByType` reads `seed-user-demo` like every other
  getter, so the list matches the sidebar counts. Moving reads onto the session
  is still its own feature
- **Not paginated.** Every item of the type is loaded. Fine at demo scale
- **The type field list is now written out in three places**: `collections.ts`'s
  `itemTypeSelect`, `getItemTypesWithCounts` and `getItemsByType`. Sharing one
  constant would fix it; left alone to keep `collections.ts` out of scope
- `ItemCard` and `TypeIcon` still live in `src/components/dashboard/` although
  `/items` uses them too. Worth moving to a shared folder once a third page does

### Vitest Unit Testing Setup — Completed (2026-09-23)

Set up Vitest for unit tests of server actions and `src/lib` utilities, and
made testing part of the feature workflow. Branch `chore/vitest-setup`. One
config file and five test files added, five docs and `package.json` touched,
one new dev dependency. Loaded from an inline description rather than a spec
file.

- Installed `vitest@4.1.11` (dev), which brought in `vite@8.3.0`
- Added `vitest.config.mts` — `node` environment,
  `include: ["src/**/*.test.ts"]`, and `restoreMocks` + `unstubEnvs` so mocks
  and `vi.stubEnv` values reset after every test. No DOM environment and no
  React Testing Library: components are out of scope by design
- Added the `test` (`vitest run`) and `test:watch` (`vitest`) scripts. The
  `feature` skill's new `test` action runs `npm test`
- Added 59 starter tests, each beside the code it covers:
  `src/lib/flags.test.ts`, `src/lib/tokens.test.ts`,
  `src/lib/rate-limit.test.ts` (the helpers, plus fail-open with Upstash
  mocked), `src/lib/validations/auth.test.ts` and `src/actions/profile.test.ts`
- Docs: the Test step in `context/ai-interaction.md` now says to write or update
  unit tests for new server actions and utilities (`/feature test`), run
  `npm test`, then check in the browser and build, and not to commit until the
  tests *and* the build pass. `context/coding-standards.md` gained a Testing
  section, `CLAUDE.md` lists the commands, and the tech stack table in
  `context/project-overview.md` lists Vitest
- `npm test`, `npx tsc --noEmit`, `npm run lint` and `npm run build` pass; the
  route table is unchanged

Checked that the suite catches real bugs, not just that it passes: two
deliberate mutations — flipping the email-verification flag's default and
removing the Zod check in both profile actions — failed 12 tests between them.
The source was restored and the suite re-ran clean.

Decisions worth carrying forward:

- **Vitest 4, not 5.** `vitest@5.0.1` (npm `latest`) has an optional peer on
  `@types/node` `^22 || >=24`, and the project still pins `^20` even though it
  runs on Node 24, so npm refuses the install. 4.x is still maintained (`V4`
  dist-tag) and accepts `^20`. Upgrading means bumping `@types/node` first — a
  separate change
- **The config is `.mts`.** As `.ts` in a package without `"type": "module"`,
  Vite warns that the ESM config is loaded as CommonJS, and says native loading
  will become the default
- **`@/` resolves through Vite 8's native `resolve.tsconfigPaths`**, so the
  alias lives only in `tsconfig.json` — no `vite-tsconfig-paths` plugin and no
  duplicated `resolve.alias`
- **Tests never touch Neon or any external service.** Every I/O boundary is
  mocked with `vi.mock`, and the mock objects are built in `vi.hoisted` so the
  factories can reference them. `src/actions/profile.test.ts` is the reference
  pattern for a server action: `@/auth`, `@/lib/prisma`, `@/lib/password` and
  `bcryptjs` are mocked, `$transaction` runs against a fake `tx`, and call order
  is asserted with `mock.invocationCallOrder`
- **`@/auth.config` loads unmocked under Vitest.** The profile action imports
  `SIGN_IN_PATH` from it, and next-auth's provider modules import cleanly in the
  `node` environment, so only `@/auth` (the Prisma-backed half) needs a mock
- **Vitest globals are off** — `describe`/`it`/`expect`/`vi` are imported
  explicitly, so `tsconfig.json` needed no `types` entry and `next build`
  typechecks the test files like any other source
- **`format.ts` has no tests, on purpose.** Its date helpers are thin
  `toLocaleDateString` wrappers and `formatHours` is one ternary; the tests for
  `rateLimitMessage` in `rate-limit` cover the pluralisation boundaries that
  matter
- **No coverage tooling**, by request. `/feature test` reports coverage as a
  written list of which functions have tests, not as numbers
- Not yet tested: `src/actions/auth.ts` (it imports `next/headers` and
  `next/navigation`, both of which will need mocks), `email-verification.ts`,
  `password-reset.ts` and the `src/lib/db/*` getters. These are the natural
  next candidates when those areas are next touched

### Items List — Three-Column Grid — Completed (2026-09-23)

`/items/[type]` now shows item cards three across on wide screens. Branch
`feature/items-three-column-grid`. One class changed in one file, no new
dependencies. Loaded from an inline description rather than a spec file.

- `src/app/(app)/items/[type]/page.tsx`'s grid went from
  `grid gap-4 md:grid-cols-2` to `grid gap-4 md:grid-cols-2 xl:grid-cols-3`
- `ItemCard` needed no change: the title and description already truncate
  (`min-w-0` + `truncate`) and the date is `shrink-0`
- `npm test` (59), `npx tsc --noEmit`, `npm run lint` and `npm run build`
  pass; `/items/[type]` still builds as `ƒ (Dynamic)`

Verified in the browser on `/items/link` (6 items), measuring the grid rather
than judging by eye: 1 column at 390px (342px cards), 2 at 768px (352px) and
1024px (480px), 3 at 1280px (315px) and 1440px (368px), and 3 at 1280px with
the sidebar collapsed (400px). No horizontal scroll and no date overflowing its
card at any width; zero console errors on the page.

Decisions worth carrying forward:

- **The breakpoint is `xl`, not `lg`, because of the sidebar.** Grid breakpoints
  key on the viewport, but the content column is the viewport minus ~256px of
  sidebar. At `lg` (1024px) three cards would be ~230px — too narrow for
  `ItemCard`'s right-hand date — while two are 480px. At `xl` three cards are
  315px. The same reasoning applies to any future grid inside the `(app)` shell
- With the sidebar collapsed the content column gains that ~256px, so 1024px
  would fit three there too. Tailwind breakpoints can't see sidebar state; a
  container query on the grid's parent would track the real width, but was
  more than this change needed
- The authenticated pages were reached with a session JWT minted locally from
  `AUTH_SECRET` (`@auth/core/jwt`'s `encode`, salt = cookie name, `sub` =
  `seed-user-demo`) and set as a Playwright context cookie — no sign-in and no
  database write. The token file was deleted afterwards

### Item Drawer — Completed (2026-09-23)

Clicking an item card opens a right-side ShadCN `Sheet` with the item's full
detail. This is the item detail view; there is no separate item page. Branch
`feature/item-drawer`. Nine new source files (two of them tests), four existing
files touched, no new dependencies, no migration. Spec:
`context/features/item-drawer-spec.md`.

- Added `getItemById(id, userId)` to `src/lib/db/items.ts`. It reuses the card
  include plus the parent collection (`id`/`name`/`slug` only) and returns null
  for an item that is missing or not the caller's. Added `ItemDetail` and
  `ItemCollectionSummary` to `src/types/index.ts`
- Added `GET /api/items/[id]`. It returns 401 without a session, 404 for an
  unknown or foreign item, and 500 on a database fault, in the
  `{ success, data, error }` shape
- Added `src/components/items/`:
  - `ItemDrawerProvider`: open and fetch state, the `useOpenItem` hook, and
    focus return
  - `ItemDrawer`: the sheet shell, skeleton and error state with retry
  - `ItemDetailView`: header and body sections
  - `ItemActions`: the action bar
  - `ItemCardButton`: an invisible button stretched over each card
- `(app)/layout.tsx` wraps page content in `ItemDrawerProvider`. `ItemCard` became
  `relative` and renders `ItemCardButton`; it stays a server component
- Added `src/lib/item-copy.ts` (`getCopyText`): the item's content, else its
  url, with blank values treated as absent
- 12 unit tests: `src/lib/item-copy.test.ts` and `src/lib/db/items.test.ts`.
  Suite 59 → 71. Removing `userId` from the `getItemById` query fails the
  ownership test, which confirms the test catches a leak
- `npm test`, `npx tsc --noEmit`, `npm run lint` and `npm run build` pass; the
  build registers `ƒ /api/items/[id]`

Verified with curl and in the browser. The API returned 401 anonymous, 200 as
the owner, and 404 for an unknown id and for another user's session. In the
browser:

- A card opens the skeleton, then the item, with no URL change. The drawer is
  512px wide
- Copy put the exact command on the clipboard for a command item and the URL
  for a link item, with a toast
- Favorite renders yellow and filled with `aria-pressed="true"` on a favorited
  item; Pin shows filled on a pinned one
- Escape, the close button, a simulated 500 followed by "Try again", and a
  close-then-reopen during a slow request all behaved
- Opening from the keyboard works, and focus returns to the originating card
- At 390px the drawer is full width, the body scrolls and long code scrolls
  sideways inside its block
- `/items/snippet` works the same way
- Zero console errors apart from the deliberate 500

The user also confirmed the drawer by hand while signed in as the demo account.

Decisions worth carrying forward:

- **The API scopes to the signed-in user; every other read is still
  demo-scoped.** So only `demo@devstash.io` can open the cards it is shown. Any
  other account gets "This item could not be found." This is exactly what
  happened on the user's first manual try. The mismatch is accepted until reads
  move onto the session, which is now the most visible open gap in the app and
  the natural next feature
- **Ownership is part of the query (`where: { id, userId }`)**, not a check
  after the fetch, so a foreign item is indistinguishable from a missing one:
  404, never 403
- **`/api/items/*` is deliberately outside the proxy matcher.** The proxy
  answers with a redirect to the sign-in page, which a `fetch` caller cannot
  use, so the route runs its own `auth()` check
- **The card opens the drawer through a stretched invisible `<button>`**, not by
  wrapping the card. Wrapping would have made `ItemCard` a client component and
  put block content (a heading, divs) inside a `<button>`, which is invalid
  HTML. The focus ring is `ring-inset` because the card's `overflow-hidden`
  clips an outset ring
- **Focus is returned by hand.** Radix only restores focus to a `SheetTrigger`;
  the cards open the sheet programmatically, so focus fell to `<body>` on close.
  The provider records `document.activeElement` on open and refocuses it in
  `onCloseAutoFocus`, if it is still in the DOM
- **Stale responses are dropped.** Each fetch gets an `AbortController`; a new
  open or a close aborts the previous one, and the result is ignored if its
  signal aborted. The sheet's modal overlay stops a second card being clicked
  while it is open, so the realistic race is close-then-reopen
- **The loaded item is kept after close**, so the slide-out animates the real
  content instead of snapping to a skeleton
- **Favorite, Pin, Edit and Delete are enabled buttons with no handler**,
  following the display-only "New Item" / "New Collection" precedent. Disabling
  them would have dimmed the yellow Favorite the reference screenshot shows
- The sheet sets `aria-describedby={undefined}` because the body is the
  description; otherwise Radix warns that none is set. Every state (skeleton,
  error, loaded) renders a `SheetTitle`, the skeleton's being `sr-only`
- **Each click costs ~850ms locally.** Prisma issues five queries in three
  sequential round trips (item → type/tag-links/collection → tag names), and
  each round trip to Neon is ~250ms from the dev machine. One joined query needs
  the `relationJoins` preview feature in `schema.prisma`, which changes every
  query in the app, so it was flagged rather than done. Prefetching on hover is
  the cheaper alternative. A deployment in Neon's region should be far faster
- Content renders as a plain `<pre>`, with no syntax highlighting or line
  numbers. The spec defers the code editor. Items have at most one collection
  (`Item.collectionId`), so "Collections" shows zero or one badge despite the
  plural heading
- The type field list is now written out in a fourth place: `itemInclude`'s
  `type: true` still returns the full `ItemType` row, including `userId` and
  timestamps, which now also crosses the API as JSON. Harmless, since it is
  null or the caller's own id, but a shared `itemTypeSelect` would trim it
- **The demo account's password was reset by the user through the Forgot
  password flow** (the dev-only console link), since the last seed generated a
  random one. `SEED_DEMO_PASSWORD` is still unset in `.env`, so the next
  `npm run db:seed` will replace it with a new random password
- The browser walkthrough used a session JWT minted locally for
  `seed-user-demo` and set as a Playwright context cookie, with no database
  write. The token file was deleted afterwards

### Item Drawer — Edit Mode — Completed (2026-09-23)

The drawer's Edit button switches the open drawer into edit mode in place.
Branch `feature/item-drawer-edit`. Nine new source files (three of them tests),
six existing files touched, no new dependencies, no migration. Spec:
`context/features/item-drawer-edit-spec.md`.

- Installed the ShadCN `textarea` component
- Added `src/lib/validations/items.ts`: `updateItemSchema`, the
  `UpdateItemInput`/`UpdateItemData` types and `parseTagInput`
- Added `src/lib/item-fields.ts`: `getItemTypeFields(slug)` says which of
  content, language and URL a type carries
- Added `updateItem(id, userId, data)` to `src/lib/db/items.ts`, returning the
  updated `ItemDetail` or null when the item is not the caller's
- Added `src/actions/items.ts` with the `updateItem(itemId, data)` server
  action: session first, then Zod, then the query, in the
  `{ success, data, error }` shape with per-field `issues`
- Added `ItemEditForm` and `ItemSections` under `src/components/items/`. The
  shared `Section`, collection and dates blocks moved into `ItemSections` so
  both modes render them
- `ItemDetailView` became a client component holding the `editing` flag;
  `ItemActions` gained `onEdit`; `ItemDrawer` and `ItemDrawerProvider` pass the
  saved item back up through `onSaved`
- 37 unit tests across `validations/items`, `item-fields`, `db/items` and
  `actions/items`. Suite 71 → 108. Removing `userId` from the write's `where`
  fails the ownership test, which confirms the test catches a leak
- `npm test`, `npx tsc --noEmit`, `npm run lint` and `npm run build` pass; the
  route table is unchanged

Verified in the browser as the demo user, with no console errors from the
pages under test:

- A command item showed Title, Description, Content, Language and Tags, and
  no URL. A link item showed Title, Description, URL and Tags
- Cancel discarded a changed title, and a later Edit started again from the
  saved values. A blank title disabled Save
- A save trimmed the title and language, stored a cleared description as
  null, kept the content's leading indentation, and turned
  `process, docker, , process ` into two tags. The toast fired, the drawer
  returned to view mode with the saved item, and the card list reordered with
  the edited item on top
- `javascript:alert(1)` as a link's URL came back with the field message
  under the input and a toast. The drawer stayed in edit mode with the value
  kept, and Cancel restored the original URL
- At 390px the drawer is full width with no horizontal scroll

Decisions worth carrying forward:

- **The tag replace is done in explicit steps, not one nested write.** The
  steps are: `updateMany` scoped to `{ id, userId }`, delete every `ItemTag`
  for the item, `tag.createMany({ skipDuplicates })`, `tag.findMany` by name,
  then `itemTag.createMany`. Prisma's docs (now written for v8) do not say
  whether a nested `deleteMany` runs before a nested `create`, so the order is
  not left to Prisma. The batched calls keep the number of round trips the
  same however many tags there are. This covers the spec's
  "disconnect all, connect-or-create"
- **The updated item is read back after the commit, not inside the
  transaction.** With the read-back inside, the transaction ran about 4 seconds
  over Neon latency, close to Prisma's 5-second default for interactive
  transactions. Moving the read-back out also cut the save from about 4
  seconds to 2.5–2.8. The read-back uses `getItemById`, so it is also scoped to
  the owner
- **Ownership is part of the write**, as in `getItemById`, so another user's
  item comes back as "This item could not be found.", never as forbidden
- **URLs must be http(s).** `z.url()` on its own accepts any scheme,
  `javascript:` included, and the drawer renders the URL as a link
- **Content is not trimmed**, because leading indentation belongs to a snippet.
  Content that is only whitespace still becomes null. The other text fields
  are trimmed, and blanks become null
- **Only the fields shown for the item's type are sent.** A missing field is
  `undefined`, and Prisma leaves the column alone, so a hidden field can never
  clear a column. The server does not check which fields belong to which type:
  a crafted request could set `content` on a link, but only on the caller's
  own item
- **The form sets `noValidate`**, so the server's messages are the only ones
  shown. The browser's own check for `type="url"` accepts `javascript:`, which
  would disagree with the schema. `type="url"` stays for the mobile keyboard
- **Edit state resets on its own.** Every item load shows the skeleton, which
  unmounts `ItemDetailView`, so its `editing` flag cannot carry over to the
  next item. `onSaved` in the provider ignores a save for an item that is no
  longer showing, which covers closing and reopening the drawer during a save
- The drawer switches back to view mode when the action returns. The cards
  catch up when `router.refresh()` finishes, about 3 seconds later over Neon
  from the dev machine
- **The `shadcn` CLI reproduced the `import { cn } from "cn"` bug** and
  installed the junk `cn` package again. The import was fixed and the package
  uninstalled, so `package.json` is unchanged. The bug has now appeared in
  three of the last four `shadcn add` runs
- **Only the demo account can edit**, the same limit the drawer already has.
  The action is scoped to the signed-in user while the lists are still
  demo-scoped. Moving reads onto the session is still the obvious next feature
- **Tags left unused stay in the database.** Tag names are case-sensitive
  (`React` and `react` are two tags)
- There are no length limits on title, content or tags; the spec names none
- The walkthrough changed then restored "Find and Kill a Process on a Port"
  (`seed-item-kill-port`) through the UI. Its values match the seed again, but
  its `updatedAt` is now 2026-09-23, so it sorts first among Commands and in
  Recent. Lucide Icons was not saved
- The browser session used a session JWT minted locally for `seed-user-demo`
  with no database write. The token file was deleted afterwards

### Delete Items — Completed (2026-09-23)

The drawer's trash button now deletes the item after a ShadCN confirmation,
with a toast on success. Branch `feature/delete-items`. One new source file,
seven existing files touched, no new dependencies, no migration. Loaded from
an inline description rather than a spec file.

- Added `deleteItem(id, userId)` to `src/lib/db/items.ts` —
  `item.deleteMany({ where: { id, userId } })`, returning whether a row went
- Added the `deleteItem(itemId)` server action to `src/actions/items.ts`,
  returning `{ success: true, data: { id } }` or an error. The three messages
  it shares with `updateItem` became module constants
- Added `src/components/items/DeleteItemDialog.tsx` — the trash button as an
  `AlertDialogTrigger`, a dialog naming the item, and a confirm that shows
  "Deleting..." with a spinner. Success toasts "Item deleted", closes the
  dialog, calls `onDeleted` and runs `router.refresh()`; failure toasts the
  error and leaves the dialog open
- `onDeleted` is threaded `ItemDrawerProvider` → `ItemDrawer` →
  `ItemDetailView` → `ItemActions`. The provider's `handleDeleted` closes the
  drawer and clears the focus-return target
- 8 unit tests across `actions/items` and `db/items`. Suite 108 → 116.
  Removing `userId` from the delete's `where` fails the ownership test
- `npm test`, `npx tsc --noEmit`, `npm run lint` and `npm run build` pass; the
  route table is unchanged

Verified in the browser as the demo user against throwaway items inserted into
the Neon **dev** branch, never a seeded one. Zero console errors throughout:

- The dialog reads "Delete this item? This permanently deletes *title*. This
  cannot be undone.", with focus starting on Cancel
- Cancel and Escape each closed only the dialog; the drawer stayed open, and
  Cancel returned focus to the trash button
- Confirming disabled both buttons and ignored Escape while pending. The toast
  appeared after ~450ms, the drawer closed, and the list, the page's item count
  and the sidebar's Commands count all dropped by one after ~1.8s
- The database afterwards: the item and its `ItemTag` row gone, the `Tag` row
  kept
- Failure path: the item was deleted directly in SQL while its dialog was open,
  then confirmed in the UI. "This item could not be found." toasted, the dialog
  stayed open with its button re-enabled, and the drawer stayed open beneath it
- At 390px the dialog is 320px wide with no horizontal scroll
- Demo data ended at 18 items and 29 tags, as seeded; no throwaway rows remain

Decisions worth carrying forward:

- **Ownership is part of the delete**, via `deleteMany` with `{ id, userId }`
  rather than `delete` by id. `delete` needs a unique selector and would throw
  on a missing row; `deleteMany` gives a count, so a missing or foreign item
  is one "not found" path, the same one `updateItem` uses
- **The confirm is a plain `Button`, not `AlertDialogAction`**, for the third
  time in this codebase (sign-out menu, delete account, now this): the Radix
  action closes on click, before the result is known
- **The dialog is controlled so it can refuse to close mid-delete.** Its
  `onOpenChange` is ignored while pending, which covers Escape and the overlay
  as well as the disabled Cancel. Without it, closing the dialog would unmount
  it mid-request and the result toast would land with no context
- **Focus goes to `<body>` after a delete, on purpose.** The provider normally
  refocuses the card that opened the drawer; that card is about to vanish on
  refresh, so `handleDeleted` clears the target rather than focusing an element
  that is removed a second later
- **The loaded item stays in drawer state after a delete**, as after a normal
  close, so the slide-out animates real content instead of a skeleton
- **Escape stacks correctly** with an `AlertDialog` over the `Sheet` — Radix's
  layered dismissal closes only the top layer. No extra handling was needed
- A modal `AlertDialog` marks the sheet `aria-hidden`, and the open sheet does
  the same to the page. Playwright role queries therefore report the drawer and
  cards as absent while a dialog is up; query `[data-slot="sheet-content"]` and
  its `data-state` instead
- There is no undo and no soft delete. The dialog says so
- **Only the demo account can delete what it sees**, the same limit edit mode
  has, since the lists are still demo-scoped. Moving reads onto the session is
  still the obvious next feature

### Item Create — Completed (2026-09-23)

The top bar's "New Item" button opens a ShadCN `Dialog` that creates an item.
Branch `feature/item-create`. Three new source files, seven existing files
touched plus their tests, no new dependencies, no migration. Spec:
`context/features/item-create-spec.md`.

- Installed the ShadCN `dialog` component
- Added `CREATABLE_TYPE_SLUGS` (snippet, prompt, command, note, link) and
  `isCreatableTypeSlug` to `src/lib/item-fields.ts`
- Added `createItemSchema` to `src/lib/validations/items.ts`, built on
  `updateItemSchema` with a `typeSlug` enum. A link must have a URL, and a
  transform stores every field the chosen type does not carry as null
- Added `createItem(userId, data)` to `src/lib/db/items.ts`. It resolves the
  system type by slug, writes the item and its tags in one transaction, and
  reads the detail back after the commit. Returns null for an unknown slug.
  The tag-linking steps moved into a `linkTags` helper that `updateItem` now
  shares
- Added the `createItem(data)` server action to `src/actions/items.ts`:
  session first, then Zod, returning `{ success, data, error }` with
  per-field `issues`
- Added `src/components/items/NewItemDialog.tsx`, the button plus the dialog,
  with a five-button type picker (icon in the type's accent color,
  `aria-pressed`) and the type's fields
- The edit form's `Field` wrapper moved to
  `src/components/items/ItemFormField.tsx` so both forms share it
- `TopBar` takes `itemTypes` from `(app)/layout.tsx` (already fetched for the
  sidebar) and passes the creatable system types, trimmed to the `ItemType`
  fields, to the dialog. It stays a server component
- 44 unit tests across `validations/items`, `item-fields`, `db/items` and
  `actions/items`. Suite 116 → 160. Dropping `isSystem` from the type lookup,
  or dropping the per-type field filter, each fail a test
- `npm test`, `npx tsc --noEmit`, `npm run lint` and `npm run build` pass; the
  route table is unchanged

Verified in the browser as the demo user, with no console errors from the
pages under test:

- Each type showed the spec's fields: Snippet and Command show Content and
  Language; Prompt and Note show Content; Link shows URL. Switching to a type
  without URL removes that input
- Opening the dialog focuses Title, and reopening starts blank with Snippet
  selected. Create stays disabled until there is a title, and a URL for a link
- `javascript:alert(1)` as a link's URL came back with the message under the
  input, `aria-invalid`, and an error toast, and the dialog stayed open
- A command created with a padded title, `  docker ps -a` and
  `process, terminal, , process `: the toast fired, the dialog closed, and the
  Commands list went 5 → 6 with the new card on top. The row had a trimmed
  title and language, the content's leading spaces kept, a null description
  and URL, and two tag links
- Link and note items (with and without tags) saved with the unused columns
  null. A created note opened in the drawer with its tag
- At 390px the dialog is 358px wide, the header and footer stay put while the
  body scrolls, and there is no horizontal scroll
- The four test items were deleted through the drawer's Delete. The demo
  account ended at 17 items and 29 tags, as it started (one seeded item had
  already been removed before this feature, so it is not at the seeded 18)

Decisions worth carrying forward:

- **Only system types can be created, and only these five.** The lookup is
  `{ slug, isSystem: true }`, so a user's custom type with the same slug can
  never be picked up. File and image stay out until uploads exist. The client
  sends a slug and the server resolves the id; it never trusts a type id
- **The schema, not the form, decides which columns are written.** The form
  still sends only the visible fields. Otherwise a bad URL typed under Link,
  then left behind by switching to Snippet, would fail validation for a field
  no longer on screen
- **Every column is set explicitly on create**, where edit leaves absent fields
  `undefined`. There is nothing to preserve on a new row, so the output type is
  plain `string | null` throughout
- **The Create button enforces required fields, so their messages never
  show.** Zod skips `superRefine` when the base object has issues, so a blank
  title and a blank link URL would only be reported one at a time. Disabling
  the button until both are filled avoids that
- **The form lives inside `DialogContent`**, which unmounts on close, so each
  opening starts blank with no reset logic. The dialog ignores Escape and the
  overlay while a save is pending, like `DeleteItemDialog`
- **Type buttons use singular labels** (`Snippet`, from the slug) because the
  stored names are plural (`Snippets`)
- **The dialog closes as soon as the action returns**; the list catches up
  when `router.refresh()` finishes, about 2s later
- **A create takes ~3.5–6.5s on the server locally.** Temporary timing logs
  showed the type lookup at 263ms warm (2s when the pool had to reconnect),
  the transaction at 0.75–1.6s, and the read-back at 1.5–2s. Round trips to
  Neon were ~500ms from the dev machine that day. The insert itself is cheap;
  the cost is the number of sequential round trips, one more than edit. The
  `relationJoins` preview feature flagged under Item Drawer would collapse the
  read-back
- **The `shadcn` CLI reproduced the `import { cn } from "cn"` bug** and
  installed the junk `cn` package again, now in four of the last five
  `shadcn add` runs. Import fixed and the package uninstalled, so
  `package.json` is unchanged
- **Only the demo account sees what it creates.** The action is scoped to the
  signed-in user while the lists and sidebar are still demo-scoped, the same
  limit as edit and delete. Moving reads onto the session is still the obvious
  next feature
- Not built, as the spec does not ask: choosing a collection, favorite/pinned
  flags, the Free plan's 50-item limit, and a keyboard shortcut
- The browser session used a session JWT minted locally for `seed-user-demo`
  with no database write. The token file was deleted afterwards

### Code Editor — Completed (2026-09-24)

Snippet and command content renders in a Monaco-based `CodeEditor`, read-only
in the drawer and editable in edit mode and the New Item dialog. Each
creatable type's page also gained a type-specific New button. Branch
`feature/code-editor`. Four new source files (one a test), nine existing files
touched, one new dependency, no migration. Spec:
`context/features/code-editor-spec.md`.

- Installed `@monaco-editor/react@4.7.0`, which brought `monaco-editor@0.56.0`
  as a peer (used for types only; the runtime comes from the CDN)
- Added `src/components/items/CodeEditor.tsx`: a macOS-style window with
  red/yellow/green dots, the language and a copy button in the header, and a
  Monaco body that grows with its content up to 400px, then scrolls. Custom
  `devstash-dark` theme with a transparent background and 8px themed
  scrollbars; Geist Mono via `var(--font-mono)`
- Added `src/lib/code-editor.ts`: `resolveMonacoLanguage` (id, then alias,
  then extension, plus a few common names like `zsh` and `golang`; anything
  else is `plaintext`), `getCodeEditorHeight` and `estimateContentHeight`
- `getItemTypeFields` gained a `code` flag (snippet + command, the types that
  record a language). `ItemDetailView`, `ItemEditForm` and `NewItemDialog`
  switch on it; prompts and notes keep the `<pre>` and the `Textarea`
- Added `src/lib/clipboard.ts` (`copyToClipboard`), now shared by the drawer's
  Copy button and the editor's
- `/items/[type]` shows "New Snippet" / "New Prompt" / "New Command" /
  "New Note" / "New Link" in its header, opening `NewItemDialog` with that type
  selected. `NewItemDialog` gained `defaultTypeSlug`, `label` and `variant`
- `getCreatableTypes` and `singularTypeName` moved into
  `src/lib/item-fields.ts`, used by the top bar and the type pages
- `getItemTypesWithCounts` is now wrapped in React `cache`, so the layout and
  a type's page share one query per request
- 32 unit tests across `code-editor` and `item-fields`. Suite 160 → 192
- `npm test`, `npx tsc --noEmit`, `npm run lint` and `npm run build` pass; the
  route table is unchanged

Verified in the browser as the demo user, zero console errors after the fix
below:

- View mode: highlighting on TypeScript, Dockerfile and bash items; `bash`
  resolves to Monaco's `shell` mode; `curl` falls back to plain text. A
  13-line snippet sized to 292px; the 19-line Dockerfile capped at 400px with
  a scrollbar. Typing into a read-only editor changed nothing
- The header copy button put the exact code on the clipboard with a toast
- The wheel scrolls the editor first, then the drawer once the editor is at
  its end
- New Item: an empty editor is six lines tall; the focus ring shows; Monaco
  auto-indents; the header's language follows the Language field. Escape with
  the suggest box open closed only the suggestions and the dialog stayed open
- Switching a new item Snippet → Prompt fell back to the textarea with the text
  kept. Create → view → edit → save kept the two-space indent and the edit
- Each creatable type's page showed its button, and Files/Images none. The
  dialog opened with the page's type selected and its fields; the top bar still
  defaults to Snippet. The Prisma log showed a single counted `ItemType`
  query per request
- At 390px the editor fits with no horizontal scroll
- Two throwaway items were created and deleted through the UI; Snippets ended
  at 4 and Commands at 6

Decisions worth carrying forward:

- **Monaco loads from jsDelivr at runtime**, the wrapper's default. Bundling
  `monaco-editor` locally under Turbopack would mean wiring its web workers by
  hand. The loader pins `0.55.1` while the installed types are `0.56.0`; minor,
  but pin one to the other if an API mismatch ever bites. Until Monaco arrives
  the raw text renders at the estimated height, so nothing jumps
- **No `useMonaco()`.** Its effect never catches the loader's cancellation, so
  every Strict Mode mount logged an unhandled
  `{type: "cancelation", msg: "operation is manually canceled"}` rejection.
  `Editor` itself does catch it. Monaco's language list is taken in
  `beforeMount` instead and cached at module scope, so later editors are
  created highlighted rather than as plain text first
- **Escape inside an editable editor is kept from the drawer and dialog.**
  Radix listens for Escape on `document` in the capture phase, before Monaco
  sees the key, so closing the suggest box also closed the form. A `window`
  capture listener, which runs first, calls `preventDefault`; Radix's
  `DismissableLayer` skips dismissal on a prevented event, and Monaco still
  handles it. Read-only editors are not guarded, so Escape still closes the
  drawer in view mode
- **Known accessibility trade-off:** in edit mode Tab indents, so a keyboard
  user leaves the editor with Monaco's Ctrl+M (toggle Tab focus mode). With
  Escape guarded, that is the only keyboard exit
- **Monaco's context menu is off.** It renders outside the drawer/dialog, where
  a click counts as outside and dismisses them
- **No `next/dynamic`.** All three hosts are client components that mount the
  editor only after interaction, and the wrapper touches `window` only in
  effects
- **Chrome edits through a native `EditContext` div**, not the textarea: the
  `.ime-text-area` is always `readOnly`, so checking it does not tell you
  whether the editor is read-only
- **The editor's height includes Monaco's horizontal scrollbar**, 8px, so the
  last line is never covered
- **The "Content" label is no longer tied to an input** for code types, since
  Monaco renders no element with that id. Screen readers get the name through
  `ariaLabel`
- **`cache` on `getItemTypesWithCounts` also applies to `/profile`**, which calls
  it once, so there is no change there. Outside a request, as under Vitest, the
  client build of `cache` is a pass-through
- `.playwright-mcp/` holds this walkthrough's screenshots and console log; it is
  gitignored
- The browser session used a session JWT minted locally for `seed-user-demo`
  with no database write. The token file was deleted afterwards

### Markdown Editor — Completed (2026-09-24)

Prompt and note content renders in a new `MarkdownEditor`: Write/Preview tabs
in the same window chrome as `CodeEditor`, read-only in the drawer and editable
in edit mode and the New Item dialog. Snippets and commands keep `CodeEditor`.
Branch `feature/markdown-editor`. One new source file, four existing files
touched, two new dependencies, no migration. Spec:
`context/features/markdown-editor-spec.md`.

- Installed `react-markdown@10.1.0` and `remark-gfm@4.0.1`
- Added `src/components/items/MarkdownEditor.tsx`:
  - Header: the traffic-light dots, then the tabs, then a copy button
  - Tabs use the `Tabs` primitive from the installed `radix-ui` package
  - Read-only mode shows only the Preview tab; editable mode opens on Write
  - Write is a plain textarea that grows with its content (`field-sizing-content`)
    to 400px, then scrolls. Preview caps at the same height
  - Editable Preview with no text shows "Nothing to preview."
- `src/app/globals.css` gained:
  - a `.markdown-preview` component class, which styles headings, inline and
    block code, lists, task lists, blockquotes, links, tables, `hr` and images
  - a `scrollbar-themed` `@utility`, a thin scrollbar in Monaco's colours
- `NewItemDialog` and `ItemEditForm` swapped the content `Textarea` for
  `MarkdownEditor`; `ItemDetailView` swapped its `<pre>`. Each keeps the
  existing `fields.code` switch, so the non-code branch is exactly prompt/note
- `npm test` (192, unchanged), `npx tsc --noEmit`, `npm run lint` and
  `npm run build` pass; the route table is unchanged

Verified in the browser as the demo user:

- View mode:
  - a seeded prompt showed only the Preview tab, with its numbered list styled
  - the drawer had no textarea
- Styling, checked in a test note by reading computed styles rather than by eye:
  - h1–h6 step down 24/20/18/16/14/12px, with h1 bold and the rest semibold
  - blue links; inline code on a muted background; `pre` in Geist Mono with a
    border
  - disc and decimal lists, each with 24px of indent
  - blockquotes with a 4px blue left border
  - `th` on a muted background; every cell has a border
  - GFM features rendered: strikethrough, two task-list checkboxes and an
    autolink
- Safety:
  - an injected `<script>` and `<b>` rendered as literal text, with no
    elements created
  - a `javascript:` link was reduced to plain text
  - real links open with `target="_blank" rel="noopener noreferrer"`
- Height: a long note capped at 400px, with the textarea and Preview each
  scrolling inside
- Round trip through the UI: New Note → Create → drawer view → Edit (opened on
  Write with the content intact) → changed the heading → Preview showed it →
  Save → view showed the saved heading with only the Preview tab
- At 390px the drawer is full width, the editor is 324px, and nothing scrolls
  sideways
- Snippets still open in Monaco
- The test note was deleted through the drawer; Notes is back to 0

Decisions worth carrying forward:

- **`CodeEditor`'s colours, not the spec's hex values.** The spec asks for
  `bg-[#1e1e1e]` and `bg-[#2d2d2d]` but also asks to match `CodeEditor`, which
  uses theme tokens (`bg-muted/30`, a header with a bottom border and no fill).
  Following the hex values would have made a note and a snippet look different
  in the same drawer
- **Radix Tabs directly, not `shadcn add tabs`.** `radix-ui` was already a
  dependency, and the CLI has produced the `import { cn } from "cn"` bug in four
  of its last five runs. Radix provides the arrow-key navigation and ARIA
  wiring
- **No `rehype-raw`, ever.** `react-markdown` renders raw HTML as text and its
  default `urlTransform` drops unsafe schemes. The custom `a` renderer adds
  `target="_blank"`. It renders a link whose `href` was stripped as a `<span>`,
  because an `<a href="">` would reopen the app in a new tab
- **No Escape guard on the Write tab.** It is a plain textarea, so Escape
  closes the dialog or drawer as the old `Textarea` did. Only Monaco needed
  `useEscapeGuard`
- **The textarea's `aria-label` is dropped when an `id` is passed**, so the
  form's `<label htmlFor>` names it. The tablist is labelled "Content view", so
  a Playwright `getByLabel("Content")` matches both it and the textarea. Use
  `getByRole("textbox", { name: "Content", exact: true })`
- **Radix unmounts the inactive tab panel**, so the Write textarea is not in
  the DOM while Preview is showing. The value is controlled by the form, so
  nothing is lost when switching tabs
- **Styles use `@apply` inside `@layer components`**, so the preview takes
  Tailwind's own scale and the theme tokens (`bg-muted`, `border`,
  `text-blue-400`) rather than hand-copied colour values
- **Preview images load from any URL** the note contains. That is standard
  Markdown, but it means opening an item can make requests to third-party
  hosts. Worth revisiting if shared collections land
- **The running `next dev` on :3000 picked up the new CSS this time.** The
  Stats & Sidebar note says it did not pick up new utilities; here the change
  included `globals.css` itself, which is the likely difference (not
  confirmed). After the `npm install`, a
  hot-reload left a stale `CodeEditor` module that logged
  `knownLanguages is not defined`. A full page load cleared it. Nothing in
  `CodeEditor` changed
- The Write/Preview tabs have no keyboard shortcut, and there is no toolbar
  (bold, link, …). The spec asks for neither
- `.playwright-mcp/` holds this walkthrough's screenshots; it is gitignored
- The browser session used a session JWT minted locally for `seed-user-demo`
  with no database write. The token file was deleted afterwards

### File & Image Upload (Cloudflare R2) — Completed (2026-09-24)

File and image items can now be created: the New Item dialog uploads to
Cloudflare R2 with drag-and-drop and a progress bar, the drawer previews
images and lists files, downloads go through the app, and deleting an item
deletes its file. Branch `feature/file-image-upload`. Seven new source files,
nine existing files touched plus their tests, one new dependency, no
migration. Spec: `context/features/file-image-spec.md`.

- Installed `@aws-sdk/client-s3@3.1139.0` — R2 speaks the S3 API
- Added `src/lib/uploads.ts` (client-safe): `UPLOAD_RULES` with the spec's
  size, extension and MIME limits, `checkUpload`, `getAcceptAttribute`,
  `formatFileSize` and the `UploadedFile` type. The browser and the upload
  route apply the same rules
- Added `src/lib/r2.ts` (server): `createUploadKey`, `getOwnedUploadKey`,
  `putUpload`, `getUpload` and `deleteUpload`. Objects live at
  `uploads/<userId>/<uuid>.<ext>`; the item stores the public URL
  (`R2_PUBLIC_URL` + key) in `fileUrl`
- Added `POST /api/uploads` (multipart `kind` + `file`; 401/400/413/422/
  500, 201 on success) and `DELETE /api/uploads` (discard an upload no item
  uses)
- Added `GET /api/items/[id]/download`, which streams the object back as an
  attachment under its original name, owner only
- Added `src/lib/upload-client.ts` (`uploadFile` over `XMLHttpRequest` for
  progress, `discardUpload` as a keepalive `fetch`) and
  `src/components/items/FileUpload.tsx`
- `CREATABLE_TYPE_SLUGS` gained `file` and `image`; `getItemTypeFields`
  gained `upload`. The dialog's type picker is now seven across
  (`grid-cols-4 sm:grid-cols-7`), and the Files/Images pages gained their
  New buttons
- `createItemSchema` takes an optional `file`, requires it for upload types
  and nulls it for every other type; it now also sets `contentType`
- `deleteItem` in `src/lib/db/items.ts` returns `{ deleted, fileUrl }`
  instead of a boolean; added `isFileUrlInUse`
- The drawer shows an Image/File section, and Download replaces Copy for
  file-backed items
- `.env.example` documents the five `R2_*` variables
- 21 existing tests updated for the new contracts; suite still 192. No new
  tests were written for the upload code — `/feature test` was not run
- `npm test`, `npx tsc --noEmit`, `npm run lint` and `npm run build` pass;
  the build registers `ƒ /api/uploads` and `ƒ /api/items/[id]/download`

Verified with curl and in the browser as the demo user:

- Upload route: anonymous 401, bad kind 400, `.exe` 422, a PNG sent as a
  file 422, a PNG claiming `text/html` 422, a 6 MB image 422, a file one byte
  over 10 MB 422, a file just under 10 MB 201. A `.toml` sent as
  `application/octet-stream` was stored as `application/toml`
- Discard: another user's URL and a `..` path 404, a URL an item still uses
  404, an own unused upload 200 and gone from the bucket
- UI: with upload throttled, progress read 13% → 92% while Create and the
  type buttons stayed disabled. The image previewed, created, rendered in the
  drawer from R2 and downloaded **byte-identical** with
  `Content-Disposition: attachment` and `nosniff`; the download route gave
  401 anonymous and 404 for a text item
- A dropped `.exe` was refused in the browser with **zero** requests; a
  dropped `.md` with no browser type uploaded. Replace, Remove, Cancel,
  Escape, switching type and reloading the page each sent the discard
- Deleting the file item and the image item from the drawer removed both
  objects; the bucket was listed afterwards and was **empty**
- At 390px the dialog is 358px wide with no horizontal scroll. Zero console
  errors from the app

Decisions worth carrying forward:

- **The extension decides the stored content type, not the browser.** The
  browser's type is only a cross-check, and a missing or generic one (`""`,
  `application/octet-stream`, and `application/vnd.ms-excel`, which Windows
  reports for `.csv` when Excel is installed) is accepted
- **The user id in the key is what makes `fileUrl` checkable.** `createItem`
  accepts only a URL under the caller's own prefix, and `getOwnedUploadKey`
  allows exactly one `<uuid>.<ext>` segment after it. Without that, a crafted
  create could attach another user's object, and deleting the item would
  delete it from R2
- **Upload happens on selection, not on Create**, so progress shows
  immediately. The cost is uploads that never become items, handled by
  discarding them. **A full page unload runs no React cleanup** — the first
  version orphaned an object on reload — so the dialog also discards on
  `pagehide` with a keepalive request
- **R2 deletion on item delete is best effort.** The row is already gone, so a
  storage failure is logged and leaves an orphan rather than failing a delete
  that happened
- **Images load from the public R2 URL; downloads go through the app.** A
  cross-origin link ignores `download`, and reading R2 with `fetch` would
  need CORS on the bucket (confirmed: an in-page `fetch` to the r2.dev URL is
  blocked). Previews are `<img>`, so an SVG's scripts never run, and the
  public URL is on R2's origin, not the app's
- **The bucket is public.** Anyone holding a file's URL can open it; the key
  is a random UUID, so URLs cannot be guessed. The download route is
  owner-only, but that does not make the file private
- **Files pass through the app, which will not work on Vercel above
  4.5 MB.** Vercel caps serverless request bodies there, below both limits.
  Locally a 10 MB file uploads fine. Presigned direct-to-R2 uploads would lift
  it, at the cost of CORS configuration on the bucket
- Edit mode leaves the file alone — it edits title, description and tags
  only. Replacing an item's file is not built
- **Known gaps:** deleting an account (`deleteAccount`, `db:delete-users`)
  leaves that user's objects in R2; nothing stops two items sharing one
  `fileUrl` (only by crafted request, against the caller's own files);
  `.env.production` has none of the `R2_*` variables
- Plan gating was not built: Files and Images still carry the sidebar's `PRO`
  badge while any account can upload
- The browser session used a session JWT minted locally for
  `seed-user-demo` with no database write. The token file was deleted
  afterwards. `.playwright-mcp/` holds the screenshots and the downloaded
  file; it is gitignored

### Image Gallery View — Completed (2026-09-24)

`/items/image` shows image items as a thumbnail gallery instead of the
regular item cards. Branch `feature/image-gallery-view`. One new source file,
one existing file touched, no new dependencies, no migration. Spec:
`context/features/image-display-spec.md`.

- Added `src/components/items/ImageCard.tsx`:
  - the image in a 16:9 `aspect-video` frame with `object-cover`
  - a 5% hover zoom (`group-hover/card:scale-105`, 300ms), kept inside the
    card by the frame's `overflow-hidden`
  - title, pin/favorite icons and date below the image
  - it opens the drawer through `ItemCardButton`, so keyboard access and
    focus return work as they do on `ItemCard`
- `src/app/(app)/items/[type]/page.tsx` renders `ImageCard` when the type is
  the system `image` type, and `ItemCard` for every other type
- `npm test` (192, unchanged), `npx tsc --noEmit`, `npm run lint` and
  `npm run build` pass; the route table is unchanged

Verified in the browser as the demo user, measuring rather than judging by
eye. Zero console errors or warnings:

- The frame measured exactly 16:9 (1.778) at every width
- Columns were 1 / 2 / 3 / 3 at 390 / 768 / 1280 / 1440px, with no
  horizontal scroll
- On hover the image went from `scale: none` to `1.05` and stayed inside
  the frame
- Clicking the card opened the drawer with the image
- `/items/snippet` still renders `ItemCard`

Decisions worth carrying forward:

- **"3 columns" follows the `(app)` grid pattern**, `md:grid-cols-2
  xl:grid-cols-3`, not a fixed three at every width. It is the same
  sidebar-width reasoning as the Three-Column Grid feature: three cards at
  `lg` would be about 230px wide
- **Tailwind v4's `scale-*` sets the CSS `scale` property, not
  `transform`.** A check that reads `getComputedStyle(el).transform`
  reports `none` while the zoom is active; read `.scale` instead
- **Tags and description are left off the thumbnail**, where they would
  compete with the image. The drawer still shows both
- **Only the Images page uses the gallery.** Image items in the dashboard's
  Pinned and Recent sections still render as `ItemCard`
- An image item with no `fileUrl` shows the type icon tile. None should exist,
  since `createItemSchema` requires a file for upload types, but the column
  is nullable
- The image is an `<img>` with `loading="lazy"` from the public R2 URL, the
  same as the drawer. There is no `next/image` and no remote pattern config,
  so the full-size upload is downloaded even for a small thumbnail. Fine at
  this scale; generated thumbnails would be the fix if galleries get large
- The walkthrough used the account's one existing image item, so several
  thumbnails were never seen side by side. The column counts were read from
  the grid's computed `grid-template-columns`
- The browser session used a session JWT minted locally for
  `seed-user-demo` with no database write. The token file was deleted
  afterwards

### File List View — Completed (2026-09-24)

`/items/file` shows file items as a single-column list of rows, like Google
Drive, instead of the card grid. Branch `feature/file-list-view`. Three new
source files (one a test), two existing files touched, no new dependencies,
no migration. Spec: `context/features/file-display-spec.md`.

- Added `src/components/items/FileRow.tsx`. Each row shows:
  - an icon chosen by the file's extension, in the type's accent tile
  - the file name, falling back to the item title, plus the pin and
    favorite marks
  - the size (omitted when null) and the upload date (`createdAt`)
  - a download icon button

  Below `sm` the size and date stack under the name
- Added `src/lib/file-icons.ts`: `getFileIconName(fileName)` returns a lucide
  icon name. pdf, txt and md map to `FileText`, json to `FileBraces`, xml to
  `FileCode`, csv to `FileSpreadsheet`, and yaml, yml, toml and ini to
  `FileCog`; anything else falls back to `File`. The five icons were added
  to the `ICONS` map in `src/lib/icons.ts`
- `src/app/(app)/items/[type]/page.tsx` renders a bordered, divided `<ul>` of
  `FileRow`s when the type is the system `file` type. Other type pages and
  the Images gallery are unchanged
- 18 unit tests in `src/lib/file-icons.test.ts`. Suite 192 → 210. One test
  checks that every extension the upload rules allow maps to an icon that is
  registered in `icons.ts`, so a missing registration fails a test instead of
  quietly showing the fallback
- `npm test`, `npx tsc --noEmit`, `npm run lint` and `npm run build` pass; the
  route table is unchanged

Verified in the browser as the demo user, with four throwaway files uploaded
through "New File" (pdf, yaml, a 2.3 MB json and csv). Zero console errors or
warnings:

- Each extension showed its own icon, and sizes read 8 B to 2.3 MB
- On hover the row's background went from transparent to `accent/30`
- A row click opened the drawer on the right item. Escape returned focus to
  the row, and Enter on a focused row opened the drawer
- A click on the download link hit the link (`elementFromPoint`), made no
  `/api/items/[id]` request and left the drawer shut. Fetched with curl
  through the same route, the file came back byte-identical with
  `Content-Disposition: attachment`
- At 390px the info column switched to `flex-direction: column` with the size
  and date under the name, and nothing scrolled sideways. At 768px it is one
  line
- `/items/snippet` and `/items/image` still render their grids
- The four items were deleted through the drawer. No file items remain, and
  the demo account is at 22 items, as before. The R2 bucket was not listed
  afterwards, so the objects' removal was not confirmed directly

Decisions worth carrying forward:

- **The URL is `/items/file`, not the spec's `/items/files`**, because
  `ItemType.slug` is singular. The plural form 404s
- **No `stopPropagation`.** The row opens the drawer through the stretched
  `ItemCardButton`, and the download link is a sibling of that overlay, not a
  child. A click on the link never reaches the overlay, so the spec's
  requirement holds without an `onClick`. The link stays a plain `<a>` and the
  row stays a server component. `relative z-10` on the link keeps it above
  the overlay
- **The open button comes before the download link in the DOM.** With it
  last, as in `ItemCard`, Tab reached a row's Download before its Open. The
  stacking comes from `z-10`, not DOM order, so moving the button changes
  only the tab order: Open, Download, then the next row
- **Downloads go through `GET /api/items/[id]/download`**, as the drawer's
  button does. A link straight to the public R2 URL is cross-origin, so the
  browser would ignore `download` and open the file
- **"Upload date" is `createdAt`**, since the file is uploaded when the item
  is created. The cards show `updatedAt`
- **The icon mapping returns a name, not a component**, like `ItemType.icon`,
  so it goes through `getIcon` and `src/lib/file-icons.ts` stays free of
  React. `lucide-react` 1.x has no `FileJson`; the braces icon is
  `FileBraces`
- **Rows sort by most recently updated**, like every other type page, not by
  name as Google Drive does by default. There is no column header and no
  sorting control; the spec asks for neither
- **Only the Files page uses the list.** File items in the dashboard's Pinned
  and Recent sections still render as `ItemCard`
- **The Playwright MCP drops its connection whenever the browser starts a real
  download**; it happened with `waitForEvent("download")` and with
  `page.route` aborting the request. The check that worked was a `window`
  capture listener that calls `preventDefault` on `a[download]` clicks,
  recording the click without starting the download, with the bytes checked
  by curl
- The browser session used a session JWT minted locally for `seed-user-demo`
  with no database write. The token file was deleted afterwards.
  `.playwright-mcp/` holds the screenshots; it is gitignored

### Sign-In Open Redirect Fix + Component Split — Completed (2026-09-24)

A `code-auditor` sweep of the full tree found one real vulnerability, fixed
here, and a size/duplication pass split the largest components. Branch
`fix/sign-in-open-redirect`, merged as two commits: `fix:` then `refactor:`.

**The fix.** `/sign-in` redirected an already-signed-in visitor straight to
`?callbackUrl`, and its inline check only rejected a leading `//`.

- `/sign-in?callbackUrl=/\evil.com` and `/%09/evil.com` both sent the
  browser to `evil.com`. Confirmed against the dev server: the old code
  answered `307 Location: /\evil.com`
- `toSafeRedirect` moved to `src/lib/routes.ts` and now serves both the page
  and the sign-in actions. It resolves the value against a placeholder
  origin, requires the origin to be unchanged, and re-checks the normalised
  path
- 17 tests in `src/lib/routes.test.ts`

**The refactor.**

- Item forms share a `useItemForm` hook, `src/lib/item-form.ts` and
  `ItemContentFields`. `NewItemForm.tsx` was split out of `NewItemDialog`, and
  `useUnsavedUpload` holds the discard-on-close logic. `NewItemForm` went
  from 212 to 114 lines, and `ItemEditForm` from 125 to 67
- `FileUpload` became a `useFileUpload` hook plus `DropZone` and
  `UploadPreview`, and went from 202 to 80 lines
- `EditorChrome.tsx` holds the frame, header dots and copy button shared by
  `CodeEditor` and `MarkdownEditor`
- The register route hashes through `hashPassword` instead of its own
  `BCRYPT_ROUNDS`
- `AuthFormField` and `FormNotice` replace 13 field blocks and 3 notice boxes
  across six auth and profile forms. `PASSWORD_LENGTH_HINT` lives in
  `src/lib/validations/auth.ts`
- `handleEmailLinkRequest` backs `resendVerificationEmail` and
  `requestPasswordResetEmail`. Their state types merged into
  `EmailLinkRequestState`
- 18 new tests: `src/lib/item-form.test.ts` (7) and
  `src/actions/auth.test.ts` (11, the first tests for that module). The suite
  went from 210 to 245

`npm test`, `npx tsc --noEmit`, `npm run lint` and `npm run build` pass; the
route table is unchanged. The fix commit was checked on its own: it
typechecks and passes 227 tests without the refactor.

Verified in the browser, zero console errors:

- The sign-in, register and forgot-password forms show the same messages as
  before, keep what was typed and hide the password hint while it has an
  error
- Drawer view and edit mode work for commands, links and prompts. A
  `javascript:` URL is rejected under its field
- New Item: each type shows its own fields, and Create stays disabled until
  the required ones are filled. A dropped file uploads (201); Remove and
  Cancel each discard it (200); a `.exe` is refused with no request
- The profile page's change-password form renders its three fields and hint

Decisions worth carrying forward:

- **Resolve redirect targets, don't pattern-match them.** The old regex
  blocked `//` and `/\` but not tabs or newlines, which the URL parser strips
  before it resolves the value. Checking the parsed origin covers every parser
  quirk at once. Dot segments are the one gap: `/.//evil.com` normalises to
  `//evil.com`, and the returned path is resolved again by the browser, so it
  is checked a second time
- **A placeholder origin, not our own.** `AUTH_URL` is not set in production
  and the `Host` header can be forged. Only paths are accepted anyway, so the
  origin only has to stay the same, not be real. `.invalid` is reserved and
  never resolves
- **Testing `src/actions/auth.ts` means mocking `next-auth`.** Its entry
  imports `next/server` without an extension, which only resolves under Next's
  bundler. The action needs only `AuthError` and `CredentialsSignin`
- **`RegisterForm` (90 lines) and `CodeEditor` (79) are still over 50.** The
  rest is markup and Monaco's options object. Left as is by choice
- **Smaller findings from the same pass, not done:** the stat grid duplicated
  between the dashboard and profile pages; the item-type field list written
  out in three `src/lib/db/` places; and splitting the profile page,
  `/items/[type]` and the sidebar types list
- The browser session used a session JWT minted locally for `seed-user-demo`
  with no database write. The token file was deleted afterwards. Two files
  uploaded to R2 during the check were discarded through the UI

### Collection Create — Completed (2026-09-25)

The top bar's "New Collection" button opens a ShadCN `Dialog` that creates a
collection, and the collection reads moved onto the signed-in user. Branch
`feature/collection-create`. Ten new source files (four of them tests), eight
existing files touched, no new dependencies, no migration. Loaded from an
inline description rather than a spec file.

- Added `src/components/collections/NewCollectionDialog.tsx`, replacing the
  display-only button: Name (required) and Description (optional), Create
  disabled until there is a name, a toast on success and on failure, and
  `router.refresh()` after a save
- Added the `createCollection(data)` server action in
  `src/actions/collections.ts`: session first, then Zod, returning
  `{ success, data, error }` with per-field `issues`
- Added `createCollectionSchema` in `src/lib/validations/collections.ts`
- Added `createCollection(userId, data)` to `src/lib/db/collections.ts`,
  returning the `Collection` domain type
- Added `src/lib/slug.ts`: `slugify` (accents folded; `collection` when nothing
  is left) and `uniqueSlug` (`base`, then `base-2`, …)
- `getRecentCollections(userId, limit?)` and `getCollectionStats(userId)` now
  take the user; `DEMO_USER_ID` is gone from the module. `(app)/layout.tsx`,
  `(app)/dashboard/page.tsx` and `/profile` pass the session user
- Added `src/lib/session.ts`: `getSessionUserId`, wrapped in React `cache`, so
  the layout and page resolve the session once per request
- `isUniqueConstraintError` moved from the register route into
  `src/lib/db/errors.ts` so the collection create can use it too
- 31 unit tests across `slug`, `validations/collections`, `db/collections` and
  `actions/collections`. Suite 245 → 276
- `npm test`, `npx tsc --noEmit`, `npm run lint` and `npm run build` pass; the
  route table is unchanged

Verified in the browser as a non-demo account (`reset-flow@devstash.io`,
which started with no collections), zero console errors or warnings:

- The dialog opens with focus on Name. Create is disabled for a blank name
  and for spaces only
- Creating "  React Patterns " with a padded description showed the "Collection
  created" toast in ~0.9s and closed the dialog. The sidebar, the dashboard
  grid and the Collections stat card (0 → 1) all updated
- Reopening started blank. The same name again was saved as
  `react-patterns-2`, and the stat card went to 2
- In the database: the name and description were trimmed, and the blank
  description was stored as null
- A blank name sent past the disabled button (DOM-tampered) came back with the
  "Please check the details you entered" toast. "Name is required" showed under
  the field with `aria-invalid`. The dialog stayed open with the description
  kept
- The demo account still shows its own 5 collections on the dashboard and on
  `/profile`
- At 390px the dialog is 358px wide with no horizontal scroll

Decisions worth carrying forward:

- **A server action, not an API route**, though the request asked for API
  routes for client-side calls. Item create, edit and delete are all server
  actions, and the coding standards say client components use them. The user
  chose this at load time
- **Collection reads are session-scoped; item reads are still demo-scoped.**
  The user chose this at load time. A non-demo account therefore sees its own
  collection counts beside the demo account's item counts, on both the
  dashboard and `/profile`. A collection card's item count and type icons come
  from the signed-in user's items. Moving the item getters is still its own
  feature
- **The getters take `userId` as a parameter** rather than calling `auth()`
  themselves, like `getItemById`. That keeps them testable, and one cached
  session lookup serves the layout and the page
- **The slug is picked by reading the user's existing slugs**
  (`startsWith: base`). The unique index settles a race: on P2002 the create
  re-reads and picks again, up to 3 attempts. Any other error is not retried.
  `uniqueSlug` fills gaps, so `react-patterns-2` can be reused after a delete
- **An expired session shows the generic "Something went wrong" toast, not
  "Your session has expired".** The action's POST goes to the current page,
  which the proxy guards, so the proxy redirects it to `/sign-in` before the
  action runs. The item dialogs already behave the same way. The action's
  own session check still matters, because a server action can be called
  directly
- **`ItemFormField` is reused for the collection form**, despite its name.
  Rename it to something generic if a third form uses it
- Not built, as asked: a color picker (the column defaults to `gray`, and the
  card accent comes from the items anyway), the favorite flag, the Free plan's
  3-collection limit, edit and delete, and a `/collections` page. The sidebar
  and grid still link to `/collections/[slug]`, which does not exist yet
- **The dashboard's Collections grid has no empty state.** An account with no
  collections sees the heading with nothing under it
- `reset-flow@devstash.io` has two collections in the Neon **dev** database
  from the walkthrough. `npm run db:delete-users -- --confirm` clears them
- The browser session used session JWTs minted locally for `seed-user-demo`
  and `reset-flow@devstash.io`. The token files were deleted afterwards.
  `.playwright-mcp/` holds the screenshot; it is gitignored

### Add Items to Collections — Completed (2026-09-25)

An item can now belong to any number of its owner's collections, chosen in the
New Item dialog and in the drawer's edit mode. Branch
`feature/item-collections`. Two new source files and a migration, nineteen
existing files touched, no new dependencies. Loaded from an inline description
rather than a spec file.

- `Item.collectionId` was replaced by an `ItemCollection` join table
  (`@@id([itemId, collectionId])`, like `ItemTag`), cascading from both sides.
  Deleting a collection removes only its links; the items stay
- Migration `20260925120000_item_collections` creates the table, copies every
  same-owner `collectionId` into it, then drops the column, index and foreign
  key. Applied to the Neon **dev** branch: 17 links before, 17 rows after
- `createItem`/`updateItem` in `src/lib/db/items.ts` gained `linkCollections`.
  An update replaces the set the same way it replaces tags
- Added `CollectionNotFoundError` to `src/lib/db/errors.ts`. Both item actions
  map it to a message under the `collectionIds` field
- `updateItemSchema` (and so `createItemSchema`) gained a required,
  de-duplicated `collectionIds` array
- `ItemDetail.collection` became `collections: ItemCollectionSummary[]`,
  ordered by name, and `Item.collectionId` is gone from `src/types`. The
  drawer's Collections section renders one badge each
- Added `src/components/items/CollectionPicker.tsx`: toggle chips (with
  `aria-pressed`), one per collection, and an empty state pointing at New
  Collection
- Added `src/components/collections/CollectionOptionsProvider.tsx`
- `getRecentCollections` counts through the join with `$queryRaw`
- `prisma/seed.ts` upserts `ItemCollection` rows; `docs/item-types.md` updated
- Tests went from 276 to 288 across `db/items`, `db/collections`,
  `actions/items` and `validations/items`
- `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build` and
  `prisma migrate status` pass; the route table is unchanged

Verified in the browser as the demo user at 390px, with no console errors or
warnings and no horizontal scroll:

- The dashboard's cards read 3/4/4/3/3 = the 17 migrated links
- The picker listed all six collections by name, and toggling one twice left
  it off
- A note created in DevOps and React Patterns moved those cards from 4 to 5
  and from 3 to 4
- The drawer showed both badges, and edit mode opened with both selected
- Swapping React Patterns for C# Methods saved, updated the badges, and moved
  the cards to 3 and 1
- Deleting the note removed its links. The database ended at 24 items and 17
  links, as it started

Decisions worth carrying forward:

- **Ownership of collection ids is checked inside the write's transaction**:
  `findMany({ id: { in }, userId })`, then a count comparison. A foreign or
  deleted id throws and rolls back the whole save, including the item's own
  fields and tags, rather than silently linking the rest. The action reports it
  as "A chosen collection no longer exists" without logging, since it is a
  user-reachable state, not a fault
- **`collectionIds` is required, not defaulted.** A default of `[]` would let a
  caller that omits the field clear an item's collections on edit. The tags
  array was already required for the same reason
- **Counts go through raw SQL.** Prisma's `groupBy` cannot group by a column on
  a related model, and loading every link with its item would bring back the
  unbounded payload the Dashboard Query Over-Fetch fix removed. The query joins
  on `Item.userId`; the collection side needs no filter because only the
  caller's collections are mapped. An item in two collections counts once in
  each
- **The picker's options come from a context**, not props. The New Item dialog
  sits in the top bar and on every type page, and the edit form in the drawer,
  so the list would otherwise be threaded through three paths. The layout
  already fetched every collection for the sidebar, so this costs no query, and
  `router.refresh()` after a New Collection brings the new one in
- **Toggle chips, not a dropdown.** ShadCN has no multi-select, the `shadcn`
  CLI keeps reproducing the `import { cn } from "cn"` bug, and the chips match
  the type picker. The group scrolls past `max-h-32` for users with many
  collections
- **The migration was hand-written and applied with `migrate deploy`.**
  `migrate dev` stops for confirmation on a column drop and cannot run
  non-interactively, the same as the unique-index case under Email
  Verification. The copy step runs between creating the table and dropping the
  column, and skips any pair whose owners differ (there were none)
- **A running `next dev` does not pick up a schema change.** `src/lib/prisma.ts`
  caches the client on `globalThis` outside production, so hot reload kept the
  pre-migration client and every page returned 500
  (`column (not available) does not exist`). The user's dev server on :3000 was
  restarted. Restart after every migration
- Adding an item to a collection does not touch the collection's `updatedAt`,
  so the "recent" ordering of collections does not change
- The foreign-id rejection was unit-tested but not exercised through the UI,
  since the picker only ever offers the user's own collections
- The browser session used a session JWT minted locally for `seed-user-demo`
  with no database write. The token file was deleted afterwards.
  `.playwright-mcp/` holds the screenshots; it is gitignored

### Collections Pages — Completed (2026-09-25)

`/collections` lists the signed-in user's collections, and
`/collections/[slug]` shows one collection's items. Branch
`feature/collections-pages`. Two new pages, six existing files touched plus
two test files, no new dependencies, no migration. Loaded from an inline
description rather than a spec file.

- Added `src/app/(app)/collections/page.tsx`: every collection as the
  existing `CollectionCard`, most recently updated first, in a
  `md:grid-cols-2 xl:grid-cols-3` grid, with a count and a dashed empty state
- Added `src/app/(app)/collections/[slug]/page.tsx`: the collection's name,
  favorite star, description and item count over its items as `ItemCard`s,
  which open the drawer. `notFound()` for an unknown or foreign slug, and an
  empty state for a collection with no items. The tab title is the
  collection name
- Added `getCollectionBySlug(userId, slug)` to `src/lib/db/collections.ts` and
  `getItemsByCollection(userId, collectionId)` to `src/lib/db/items.ts`
- `CollectionCard`'s name link now covers the whole card through an `::after`
  overlay, so the card is clickable anywhere, including on the dashboard
- The sidebar's "View all collections" is marked active on `/collections`
- `src/proxy.ts`'s matcher gained `/collections/:path*`
- 4 unit tests across `db/collections` and `db/items`. Suite 288 → 292
- `npm test`, `npx tsc --noEmit`, `npm run lint` and `npm run build` pass; the
  build registers `ƒ /collections` and `ƒ /collections/[slug]`

Verified in the browser as the demo user. The only console error was the
expected 404 resource log:

- Anonymous `/collections` → `/sign-in?callbackUrl=%2Fcollections`
- A click near a dashboard card's bottom-right corner, away from the name,
  opened `/collections/c-methods`. Its 2 items rendered, and one opened in the
  drawer
- "View all collections" opened `/collections` with all 6 cards and the link
  active
- Tabbing to a card's link showed the inset ring, and Enter opened the
  collection
- `/collections/does-not-exist` returned 404 inside the app shell
- `/collections/react-patterns` read "React Patterns | DevStash" with the star,
  description and 3 items
- Columns were 3 at 1280px and 1 at 390px, with no horizontal scroll

Decisions worth carrying forward:

- **The route uses the slug, not the id** the request named. The sidebar and
  cards already linked to `/collections/${slug}`, and `Collection.slug` is
  unique per user. This is the same call as `/items/[type]`
- **Both pages are scoped to the signed-in user.** The collection lookup is
  `{ userId, slug }`, and the items query filters on `userId` as well as the
  `ItemCollection` join, so a link to another user's item cannot surface. The
  sidebar's type counts and the dashboard's item sections are still
  demo-scoped
- **The card link is stretched with a pseudo-element**, not an overlay element
  like `ItemCardButton`. This keeps `CollectionCard` a server component and the
  link's accessible name the collection name. The ring is inset because
  `Card` is `overflow-hidden`. The name's `truncate` does not clip the
  overlay, because the overlay's containing block is the card, not the link
- **Programmatic `.focus()` does not trigger `:focus-visible`** after a mouse
  click, so the ring read `none` until the check tabbed to the link with the
  keyboard
- **The header uses a neutral folder tile**, not an accent color. A
  collection's stored `color` is usually the default `gray`, while its card's
  accent comes from its items, so the two would disagree
- `generateMetadata` and the page share one lookup through React `cache`, as
  on `/items/[type]`. After a client-side navigation the tab title updates a
  moment after the URL does, so read it after the page has loaded
- Not built, as the request does not ask: collection edit and delete, a New
  Item button that preselects the collection, favorite toggling and pagination
- The browser session used a session JWT minted locally for `seed-user-demo`
  with no database write. The token file was deleted afterwards.
  `.playwright-mcp/` holds the screenshot; it is gitignored

### Collection Actions — Edit, Delete & Favorite — Completed (2026-09-25)

Collections can be renamed, re-described and deleted from their own page and
from a three-dots menu on every collection card. Favorite is rendered but not
wired up. Branch `feature/collection-actions`. Five new source files, eight
existing files touched plus their tests, no new dependencies, no migration.
Loaded from an inline description rather than a spec file.

- Added `updateCollection(userId, id, data)` and
  `deleteCollection(userId, id)` to `src/lib/db/collections.ts`. Slug picking
  moved into a shared `pickFreeSlug` helper that `createCollection` now uses too
- Added the `updateCollection(collectionId, data)` and
  `deleteCollection(collectionId)` server actions to
  `src/actions/collections.ts`: session first, then Zod, returning
  `{ success, data, error }` with per-field `issues`. A missing or foreign
  collection is "This collection could not be found."
- Added `updateCollectionSchema` (the create schema, re-exported),
  `isSlugFor` in `src/lib/slug.ts`, `isRecordNotFoundError` (P2025) in
  `src/lib/db/errors.ts`, and the `EditableCollection` type
- Added under `src/components/collections/`:
  - `CollectionForm`: the name and description form, now shared by the New
    and Edit dialogs
  - `EditCollectionDialog` and `DeleteCollectionDialog`: controlled, with no
    trigger of their own
  - `CollectionActions`: the collection page's Favorite, Edit and Delete
    buttons
  - `CollectionCardMenu`: the cards' dropdown
- `NewCollectionDialog` moved onto `CollectionForm`, with no change in
  behaviour
- `CollectionCard` renders the menu in the header's `CardAction` slot and stays
  a server component
- The collection page dropped the star beside its heading; the Favorite button
  now shows that state
- 28 unit tests across `slug`, `db/collections` and `actions/collections`.
  Suite 292 → 320
- `npm test`, `npx tsc --noEmit`, `npm run lint` and `npm run build` pass; the
  route table is unchanged

Verified in the browser as the demo user, with a throwaway collection and a
throwaway note:

- Card menu:
  - opening it did not navigate
  - Edit opened prefilled with focus on Name
  - the rename moved the card's link to the new slug and updated the sidebar
  - focus returned to the three-dots button, and `body` kept its pointer events
- Delete's confirmation names the collection and says its items are kept.
  Cancel closed only the dialog
- A click on a card away from the name and the menu opened the collection, on
  both `/collections` and the dashboard
- Collection page:
  - Save is disabled for a blank name
  - a rename moved to `/collections/zz-page-rename` and updated the heading,
    description, tab title and sidebar
  - a save with the name unchanged kept the URL, and the old slug returned 404
- Delete from the page:
  - showed "Deleting...", then replaced the URL with `/collections` (6 cards)
    and removed the collection from the sidebar
  - the note that was in the collection **still existed** afterwards, showing
    "Not in a collection"
- Favorite showed `aria-pressed="true"` on AI Workflows, and the card menu read
  "Unfavorite" there
- At 390px the header buttons are icons only and nothing scrolls sideways
- The note and the collection were deleted through the UI; the demo account is
  back to 6 collections

Decisions worth carrying forward:

- **A rename changes the slug, and the old URL 404s.** Chosen by the user at
  load time, so the URL always matches the name. There is no redirect from old
  slugs; bookmarks to a renamed collection break
- **A slug is kept when it still fits the name**, checked with
  `isSlugFor(slug, slugify(name))`, which accepts `base` or `base-N`. Saving
  "React Patterns" keeps `react-patterns-2` rather than moving to
  `react-patterns` once that becomes free. Otherwise the new slug is picked with
  the collection's own row left out of the clash check
- **The write is `update` with `where: { id, userId }`**, preceded by a
  scoped `findFirst` for the current slug. A P2025 from a collection deleted
  between the two becomes null ("not found"), and a lost slug race re-picks,
  the same as create
- **Delete relies on the schema's cascade.** `deleteMany({ id, userId })`
  removes the collection, and `ItemCollection` cascades from it, so only the
  links go. The note verified this in the browser
- **Both navigations use `replace` then `refresh`.** `replace` because the old
  URL no longer resolves, so Back should not land on a 404. `refresh` because
  the shared `(app)` layout, which renders the sidebar, is not refetched when
  navigating between two collection pages
- **The dialogs are siblings of the dropdown, not inside it.** Radix unmounts
  the menu content when an item is chosen, which would take a nested dialog
  with it. Nothing triggered them, so `onCloseAutoFocus` hands focus back to
  the three-dots button by hand
- **The menu button is lifted above the card's stretched link** (`relative
  z-10`) as a sibling, the same way `FileRow`'s download link works, so the
  card stays a server component and only the menu is client code
- **The page passes a trimmed object to `CollectionActions`** (id, name, slug,
  description, isFavorite), so the timestamps do not cross the client boundary
- **A rename from the page took ~9s to land on the new URL** in dev against
  Neon, since the new page has to render with its items. The dialog shows
  "Saving..." throughout. Most of it is round trips to Neon
- **Radix exit animations take ~2.4s to unmount in the headless browser**,
  for the existing sidebar user menu as much as the new ones, so a DOM check
  straight after closing a menu or dialog still finds it. Wait for `detached`
  rather than a fixed timeout
- Favorite is display-only in both places, as asked. Persisting it, collection
  color and the Free plan's 3-collection limit are not built
- **A shell heredoc dropped a backslash** from the `isSlugFor` regex
  (`\d` → `\d` → `d`), which the new tests caught. Write regexes with the Edit
  tool, not heredocs
- The browser session used a session JWT minted locally for `seed-user-demo`
  with no database write. The token file was deleted afterwards.
  `.playwright-mcp/` holds the screenshots; it is gitignored

### Global Search / Command Palette — Completed (2026-09-25)

Cmd+K / Ctrl+K opens a command palette that fuzzy-searches the user's items
and collections in the browser. Branch `feature/global-search`. Two new source
files and one new test file plus two generated UI components, five existing
source files touched plus one test file, one new dependency, no migration. Spec:
`context/features/global-search-spec.md`.

- Installed `cmdk@1.1.1` and added the shadcn `command` component, with the
  `input-group` component it depends on
- Added `src/components/search/GlobalSearch.tsx`. It renders the top bar's
  search field, which is now a button, and the palette dialog it opens:
  - Ctrl+K or ⌘K toggles the palette from anywhere in the `(app)` shell
  - results are grouped into **Items** (type icon in its accent color, title,
    a one-line monospace preview, type name) and **Collections** (item count)
  - an item opens in the drawer; a collection opens `/collections/[slug]`
  - with no query it shows the 5 most recent items and collections
- Added `src/lib/search.ts`:
  - `fuzzyScore`, `searchItems` and `searchCollections` rank the results
  - `toSearchPreview` builds the item's preview
- Added `getSearchItems(userId)` to `src/lib/db/items.ts`, and the
  `SearchItem` / `SearchCollection` types to `src/types/index.ts`
- `(app)/layout.tsx` fetches the search items alongside the sidebar data. It
  reuses `getRecentCollections` for collections, so no new collection query
- `ItemDrawerProvider` moved up in the layout to wrap the top bar
- `TypeIcon`'s prop narrowed to `Pick<ItemType, "icon">`, the only field it
  reads
- 21 unit tests: `src/lib/search.test.ts` (19) and `getSearchItems` in
  `src/lib/db/items.test.ts` (2). Suite 320 → 341
- `npm test`, `npx tsc --noEmit`, `npm run lint` and `npm run build` pass; the
  route table is unchanged

Verified in the browser as the demo user. Zero console errors or warnings on
the final code:

- The hint read "Ctrl K" on Windows. Opening focused the input
- The shortcut toggled the palette closed as well as open. Escape returned
  focus to the search button
- "dock" returned four Docker items. ArrowDown then Enter opened the second in
  the drawer, and closing the drawer returned focus to the search button.
  Clicking a row worked the same way
- "rpat" found React Patterns (3 items), and Enter navigated to it
- Reopening straight after a navigation started blank. A query with no match
  showed "No results found."
- Ctrl+K inside a Monaco editor in the drawer's edit mode did not open the
  palette
- At 390px the dialog is 340px wide, the hint is hidden and nothing scrolls
  sideways

Decisions worth carrying forward:

- **Search reads the signed-in user's items**, not the demo user's. The user
  did not answer the scope question raised at load time, so the default was
  the one that lets every account open its results: the drawer's API is
  session-scoped. The item lists and sidebar counts are still demo-scoped
- **Filtering is ours, not cmdk's** (`shouldFilter={false}`), so the ranking
  can be unit tested and the groups filter independently:
  - every contiguous match outranks every subsequence match
  - titles weigh double the type name, so "snippet" lists every snippet
  - the preview only counts a contiguous match. Fuzzy-matching 120 characters
    finds almost any short query somewhere
  - every word of the query must match
  - equal scores keep recency order
- **Scattered letters score 0.** The first version put a floor of 1 on any
  subsequence, and "dock" matched "List and Update Outdated Packages". A match
  whose gap penalty outweighs its score is now dropped
- **cmdk's `vimBindings` are off.** They bind Ctrl+J/K/N/P and mark Ctrl+K
  handled, so the shortcut could open the palette but not close it
- **The global listener ignores an already-handled event**, which is how
  Monaco keeps its Ctrl+K chords. The shortcut skips Alt and Shift variants
- **An item is opened after the palette has closed**, from
  `onCloseAutoFocus`, a microtask after Radix restores focus. Opening it
  straight away would record the vanishing palette input as the drawer's
  return target, and the palette's focus scope would fight the drawer's.
  The drawer therefore appears after the palette's 100ms exit animation
- **The query resets on open, not after close.** The close animation's
  callback never runs if the palette is reopened mid-animation, which is what
  left an old query behind in the browser check. A pending item is cleared on
  open for the same reason. The toggle reads the current state through
  `useEffectEvent`
- **The hint is rendered only in the browser** (`useSyncExternalStore` with a
  null server snapshot), so a Windows user never sees ⌘ flash first
- **Previews are cut to 120 characters on the server**, so the payload sent to
  the browser is bounded per item. Prisma still reads the full `content`, since
  a `select` cannot truncate a column. Order: content, URL, file name,
  description
- **The shadcn CLI's overwrite prompts ignore piped input**, and it installed
  the junk `cn` package for the fifth time in six runs. `shadcn add command
  --path tmp-shadcn --yes` wrote every file into a scratch folder with no
  prompts; `command.tsx` and `input-group.tsx` were moved in with their
  imports fixed, and `cn` was uninstalled
- **Tags are not searched.** The spec lists title, type and preview, so
  "react" does not find an item that is only tagged `react`. Adding tag names
  to `SearchItem` would be a small change
- The search payload is loaded on every `(app)` request and grows with the
  user's item count. Fine at this scale
- The browser session used a session JWT minted locally for `seed-user-demo`
  with no database write. The token file was deleted afterwards.
  `.playwright-mcp/` holds the screenshots; it is gitignored

### Pagination — Completed (2026-09-26)

`/items/[type]`, `/collections` and `/collections/[slug]` are paginated, and
each page loads only its own rows. Branch `feature/pagination`. Three new
source files (one a test), five existing files touched plus two test files,
no new dependencies, no migration. Spec: `context/features/pagination-spec.md`.

- Added `src/lib/pagination.ts`:
  - the constants `ITEMS_PER_PAGE = 21`, `COLLECTIONS_PER_PAGE = 21`,
    `DASHBOARD_COLLECTIONS_LIMIT = 6` and `DASHBOARD_RECENT_ITEMS_LIMIT = 10`
  - `parsePageParam`, `getPageRange` (`skip`/`take`), `getTotalPages`,
    `getPageHref` and `getPageSlots`
- Added `src/components/pagination/Pagination.tsx`:
  - numbered page links plus Previous/Next, which are greyed out
    (`aria-disabled` spans) at either end
  - the current page carries `aria-current="page"`
  - below `sm` the Previous/Next labels hide and only the arrows show
  - renders nothing when everything fits on one page
- `src/lib/db/items.ts`:
  - `getItemsByType(typeId, page)` and
    `getItemsByCollection(userId, collectionId, page)` return
    `Paginated<ItemWithRelations>` (`{ rows, total }`) through a shared
    `getItemsPage`
  - the type lookup moved into its own `getItemTypeBySlug`
- `src/lib/db/collections.ts` gained `getCollectionsPage(userId, page)`.
  `getRecentCollections` and the new function share a `getCollectionCards`
  helper
- Added `Paginated<T>` to `src/types/index.ts`
- The three pages read `?page=` and render the controls under the list. Their
  header counts are now the whole list's total. The dashboard's local limits
  became the shared constants
- 24 unit tests: `src/lib/pagination.test.ts` (21), and paging in `db/items`
  (2) and `db/collections` (1). Suite 341 → 365
- `npm test`, `npx tsc --noEmit`, `npm run lint` and `npm run build` pass; the
  route table is unchanged

Verified in the browser as the demo user, with both page sizes temporarily set
to 2 (no list in the demo data exceeds 21) and then restored. Zero console
errors or warnings:

- `/items/link` showed 5 items over 3 pages. Page 1 had Previous disabled, and
  the last page had Next disabled
- `?page=99` redirected to `?page=3`, and `?page=abc` showed page 1
- Clicking Next on `/collections/devops` went to `?page=2` with the current
  page marked
- `/collections` showed 5 collections over 3 pages
- The Images gallery paged, and the Files list (2 items) showed no controls
- The disabled Previous/Next computed `opacity: 0.5` and
  `pointer-events: none`
- At 390px the controls are 176px wide, with no horizontal scroll
- The dashboard still shows 5 collections and 10 recent items

Decisions worth carrying forward:

- **The collection route is `/collections/[slug]`**, not the spec's
  `[name]`. `COLLECTIONS_PER_PAGE` applies to `/collections`, the only page that
  lists collections; the spec names no route for it
- **The page lives in the URL** as `?page=N`, and page 1 is the bare path. The
  controls are plain `Link`s, so they work without JavaScript and the pages stay
  server components
- **A page past the end redirects to the last page; a malformed one reads as
  page 1.** The redirect happens after the page's own query, so an in-range
  page costs no extra round trip. A malformed value keeps its bad URL rather
  than being redirected. `MAX_PAGE = 100_000` caps the parsed value so an
  absurd `?page=` cannot become an absurd `OFFSET`
- **The page and its count run in parallel**, so a page is still one round
  trip after the type or collection lookup
- **Ties on `updatedAt` break on `id`.** Without a unique tie-break, rows with
  the same timestamp can swap between two pages from one request to the next,
  showing one row twice and skipping another. `getRecentCollections` picked up
  the same ordering
- **The controls hide when everything fits on one page**, so with the demo
  data at 21 per page no list shows them yet
- **Seven slots, fixed.** Once ellipses are needed the list is always first,
  last, the current page, its neighbours and two gaps, so the controls do not
  change width as you page. A gap never stands in for a single page
- **Collection cards' counts are still aggregated over all the user's
  collections**, not just the page's 21. Filtering the aggregate to the page's
  ids would make it wait on the collections query, and its size is bounded by
  collections × types either way
- **Out of scope, still unbounded:** the sidebar's collection list, the
  collection picker and the search palette. They are not paginated listings
- `/items/[type]` is still demo-scoped, and the collection pages are
  session-scoped. Pagination changed neither
- **PowerShell's here-string did not reach `git commit -F -`**; the message
  became a pathspec. Commit multi-line messages through the Bash tool
- The browser session used a session JWT minted locally for `seed-user-demo`
  with no database write. The token file was deleted afterwards.
  `.playwright-mcp/` holds the screenshots; it is gitignored

### Settings Page — Completed (2026-09-26)

The account actions moved from `/profile` to a new `/settings` page, linked
from the sidebar's user menu. Branch `feature/settings-page`. One new source
file, five existing files touched, no new dependencies, no migration. Loaded
from an inline description rather than a spec file.

- Added `src/app/settings/page.tsx`: a server component with
  `force-dynamic` that redirects to sign-in when `getProfileUser()` returns
  null. It renders the Change password card (only when the account has a
  password) and the destructive Delete account card
- `/profile` no longer renders either action. It keeps the identity card,
  the usage stats and the per-type breakdown
- `UserMenu` gained a **Settings** item (lucide `Settings` icon) under
  Profile
- `src/proxy.ts`'s matcher gained `/settings`
- Doc comments in `src/actions/profile.ts` and `src/lib/db/user.ts` now name
  `/settings`
- `npm test` (365, unchanged), `npx tsc --noEmit`, `npm run lint` and
  `npm run build` pass; the build registers `ƒ /settings`

Decisions worth carrying forward:

- **"Forgot password" in the request was read as the Change password form.**
  `/profile` had no forgot-password control; that flow lives on `/sign-in`
  and stays there
- **`/settings` sits outside the `(app)` route group, beside `/profile`**,
  with a "Back to dashboard" link and no sidebar, so the two account pages
  stay consistent
- **No new server actions.** `changePassword` and `deleteAccount` stay in
  `src/actions/profile.ts` unchanged, so their tests still apply.
  `deleteAccount` redirects to `/sign-in`, so where it is called from does
  not matter. The components stay in `src/components/profile/`
- **Not verified in the browser during completion.** Tests, typecheck, lint
  and build were run; the page itself reuses the forms that were verified
  end to end under Profile Page

### Editor Preferences — Completed (2026-09-26)

`/settings` gained an Editor preferences section, and the Monaco code editor
follows it. Branch `feature/editor-preferences`. Eight new source files (three
of them tests), a migration and two generated UI components, six existing
files touched, no new dependencies. Spec:
`context/features/editor-settings-spec.md`.

- Added `editorPreferences Json?` to `User`. Migration
  `20260926084153_editor_preferences` (one `ADD COLUMN`) was created with
  `prisma migrate dev` and applied to the Neon **dev** branch
- Added `src/lib/editor-preferences.ts` (client-safe):
  - the options: font sizes 12/13/14/16/18, tab sizes 2/4/8, and themes
    `vs-dark`/`monokai`/`github-dark` with their labels
  - `DEFAULT_EDITOR_PREFERENCES`: 13px, tab size 2, wrap on, minimap off,
    `vs-dark`
  - `editorPreferencesSchema`, which is strict, for saves
  - `parseEditorPreferences`, which is lenient, for reading the column
- Added `getEditorPreferences(userId)` and `updateEditorPreferences(userId,
  preferences)` to `src/lib/db/user.ts`
- Added the `updateEditorPreferences(data)` server action in
  `src/actions/editor-preferences.ts`: session first, then Zod, returning
  `{ success, data, error }`
- Added `src/components/editor/EditorPreferencesProvider.tsx`:
  - `EditorPreferencesContext` and its provider
  - `useEditorPreferences()`, which returns the defaults outside a provider
  - `useEditorPreferencesState()`, used by the settings form
- Mounted the provider in `(app)/layout.tsx` (its query joins the existing
  `Promise.all`) and around the form on `/settings`
- Added `src/components/settings/EditorPreferencesForm.tsx`: three selects
  and two switches that auto-save, with one shared toast id
- Added `src/lib/monaco-themes.ts`:
  - `MONACO_THEMES` maps each preference to a Monaco theme name, its theme
    data and a frame background class
  - the `devstash-dark` definition moved here from `CodeEditor`
- `CodeEditor` reads the preferences for theme, font size, line height,
  tab size, word wrap and minimap. It sets `detectIndentation: false`, and
  its loading placeholder matches the font size and wrapping
- `src/lib/code-editor.ts` gained `getEditorLineHeight`, and
  `estimateContentHeight` takes an optional line height
- Added the ShadCN `select` and `switch` components
- 29 unit tests across `editor-preferences`, `code-editor`, `db/user` and
  `actions/editor-preferences`. Suite 365 → 394
- `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build` and
  `prisma migrate status` pass; the route table is unchanged

Verified in the browser as the demo user, measuring rather than judging by
eye:

- `/settings` showed the defaults for an account that has never saved any
- Each setting saved and was still set after a reload. One toast replaced
  itself rather than stacking
- The drawer's editor picked up the saved values:
  - Monokai: frame `#272822`, keywords pink
  - GitHub Dark: frame `#0d1117`
  - 16px on 24px lines and 14px on 21px lines
  - tab size 4 and 8, wrap on and off, minimap on and off
- Offline, a toggled switch flipped, then reverted when the save failed, with
  "Could not save. Check your connection and try again."
- At 390px nothing scrolls sideways
- The demo account was set back to the defaults afterwards

Decisions worth carrying forward:

- **Font and tab size options were not in the spec.** 13 and 2 are the
  defaults because they are what the editor had hardcoded
- **Word wrap now defaults to on**, per the spec. Before this, every editor
  scrolled sideways, so long snippets and commands now wrap for every account
  that has not saved a preference
- **The whole set is sent on every change**, not a patch. The stored JSON is
  always complete, and the last save wins
- **A failed save reverts only if it was the newest one**, to the last set the
  server accepted. A slow failure therefore cannot undo a change made after
  it. A network failure rejects rather than returning a result, so the form
  catches it and treats it the same way
- **Reads are lenient per field.** A missing or no-longer-offered value falls
  back to its own default, and the other fields keep their saved values. A
  null or non-object value reads as all defaults. So dropping an option later
  needs no data migration
- **The editor background stays transparent in every theme.** The frame
  paints the theme's colour instead (`bg-[#272822]`, `bg-[#0d1117]`, or
  `bg-muted/30` for VS Dark). A coloured editor would poke past the frame's
  rounded corners, and clipping it with `overflow-hidden` would also clip
  Monaco's suggest box. VS Dark keeps the app's own surface, so the default
  looks as it did before
- **`detectIndentation: false` is required.** Without it Monaco guesses the
  tab size from the content, and the setting is ignored for any code that is
  already indented. Tab size does not re-indent saved code; it sets the width
  of tab characters and new indentation
- **Line height is `round(fontSize × 1.5)`**, which gives the original 20px
  at 13px. The placeholder uses a fixed class for each size
  (`LOADING_TEXT_CLASS`), since inline styles are not allowed
- **The provider is mounted twice**, in the `(app)` layout and on
  `/settings`, because `/settings` sits outside the route group. A root-layout
  provider would have made every page, including the auth pages, read the
  session. Each mount reads the stored value on the server, so a change on
  `/settings` shows in the editors on the next navigation
- **`useEditorPreferences()` falls back to the defaults outside a provider**,
  where `useCollectionOptions()` throws. An editor must never break because
  no provider was mounted. The setter hook still throws
- **The write is `updateMany` on `{ id }`**, so a session whose row has gone
  gets "This account no longer exists." instead of a P2025
- **Only the code editor reads the preferences.** The Markdown editor for
  prompts and notes is a textarea, and the spec is about Monaco. There is no
  live preview on `/settings`; the spec does not ask for one
- **Highlighting takes about 3.6s after the editor text appears** in dev.
  `main` measured the same (3.66s twice with this change stashed), so it is
  not caused by this feature. It is likely Monaco fetching the language
  module from the CDN
- **The `shadcn` CLI reproduced the `import { cn } from "cn"` bug** and
  installed the junk `cn` package, now in six of the last seven runs. The
  scratch-folder route (`--path tmp-shadcn --yes`) worked again. Imports were
  fixed and `cn` uninstalled; `package.json` and the lockfile are unchanged
- **The commit carries no Claude attribution**, per `CLAUDE.md`. Earlier
  commits did
- The browser session used a session JWT minted locally for `seed-user-demo`.
  The token file was deleted afterwards. `.playwright-mcp/` holds the
  screenshots; it is gitignored

### Favorites Page — Completed (2026-09-26)

`/favorites` lists the signed-in user's favorited items and collections in a
compact, monospace list. A star button in the top bar links to it. Branch
`feature/favorites-page`. Three new source files, six existing files touched
plus two test files, no new dependencies, no migration. Spec:
`context/features/favorites-spec.md`.

- Added `src/app/(app)/favorites/page.tsx`, a server component in the app
  shell. It has a header counting items and collections, and an **Items** and
  a **Collections** section, each with its own count. When there are no
  favorites of either kind, one dashed empty state replaces both sections
- Added `src/components/favorites/FavoriteRow.tsx`: one row showing the icon,
  the truncated title, a small outlined badge and the date. The row is Geist
  Mono and 35px tall, with `hover:bg-accent/40`. Its click target is passed in
  as `children`, stretched over the row
- Added `src/components/favorites/FavoritesSection.tsx`: an uppercase mono
  heading with the count, over a `<ul>` with hairline dividers, or a one-line
  empty message
- Item rows show the type icon in its accent color and the type slug as the
  badge, and open the drawer through `ItemCardButton`. Collection rows show a
  folder icon and the item count as the badge, and link to
  `/collections/[slug]`
- Added `getFavoriteItems(userId)` to `src/lib/db/items.ts` and
  `getFavoriteCollections(userId)` to `src/lib/db/collections.ts`, plus the
  `FavoriteItem` / `FavoriteCollection` types
- `TopBar` gained a ghost icon `Link` to `/favorites`, first in the right-hand
  group
- `src/proxy.ts`'s matcher gained `/favorites`
- 4 unit tests across `db/items` and `db/collections`. Suite 394 → 398
- `npm test`, `npx tsc --noEmit`, `npm run lint` and `npm run build` pass; the
  build registers `ƒ /favorites`

Verified in the browser as the demo user, with zero console errors or
warnings:

- Anonymous `/favorites` → `/sign-in?callbackUrl=%2Ffavorites`
- The top bar star navigated from `/dashboard` to `/favorites`
- The page listed 8 items and 2 collections, newest first
- Rows computed Geist Mono at 35px tall, and hover changed the background
  from transparent to `accent/40`
- Clicking an item row opened the drawer on the right item. Escape returned
  focus to the row's button
- Clicking a collection row opened `/collections/ai-workflows`
- At 390px the rows are 342px wide with no horizontal scroll
- The empty state was checked with a session for a user id that has no rows.
  The header read "0 items · 0 collections", neither section rendered, and
  there was no database write

Decisions worth carrying forward:

- **Both getters read the signed-in user**, not the demo user, as search does.
  The drawer's API is session-scoped, so a demo-scoped list would show other
  accounts items they could not open. The sidebar counts and the type pages
  are still demo-scoped
- **"Most recently favorited" is `updatedAt`**, as the spec says. There is no
  favorite timestamp, so any edit moves an item to the top. `id` breaks ties,
  as on the paged lists
- **The date column is `updatedAt` too**, not `createdAt`, so it matches the
  sort
- **Collection links use the slug**, not the spec's `/collections/[id]`, like
  every other collection link
- **The collection badge is the item count** (`3 items`). A "collection" badge
  would repeat the section heading on every row
- **Collection item counts use a filtered `_count`**
  (`items: { where: { item: { userId } } }`), not the raw SQL that the cards'
  per-type tallies need. This page only needs the total
- **Rows stay server components.** An item row's click target is
  `ItemCardButton`. A collection row's is an empty `Link` with an `aria-label`,
  stretched over the row the same way
- **Only selected fields cross to the client.** The item query selects the id,
  title, `updatedAt` and the type's slug/icon/color, not the card include
- **Favoriting still cannot be changed from the UI.** The drawer and
  collection Favorite buttons are display-only, so the page shows what the
  seed flagged plus later edits made directly in the data
- The list is not paginated; the spec does not ask for it
- The top bar star has no active state on `/favorites`
- The browser session used session JWTs minted locally for `seed-user-demo`
  and a user id with no rows. The token file was deleted afterwards.
  `.playwright-mcp/` holds the screenshots; it is gitignored

### Favorite Toggle — Completed (2026-09-26)

Favorite now works from the item drawer, the collection page and the
collection card menu, and item cards gained a star button. Branch
`feature/favorite-toggle`. Three new source files, ten existing files touched
plus four test files, no new dependencies, no migration. Loaded from an inline
description rather than a spec file.

- Added `setItemFavorite(id, userId, isFavorite)` to `src/lib/db/items.ts`
  (returns `{ isFavorite, updatedAt }`) and
  `setCollectionFavorite(userId, id, isFavorite)` to
  `src/lib/db/collections.ts` (returns `{ isFavorite }`). Both return null for
  a missing or foreign row
- Added the `setItemFavorite(itemId, isFavorite)` and
  `setCollectionFavorite(collectionId, isFavorite)` server actions: session
  first, then Zod (`isFavoriteSchema` in `src/lib/validations/favorites.ts`),
  returning `{ success, data, error }`
- Added `src/hooks/use-favorite-toggle.ts`: an optimistic flip through
  `useOptimistic`, an error toast and automatic revert on failure, then
  `router.refresh()`
- Added `src/components/items/ItemFavoriteButton.tsx`, the item card's star.
  `ItemCard` renders it beside the date and dropped its static star
- `ItemActions` (drawer), `CollectionActions` (collection page) and
  `CollectionCardMenu` use the hook. The drawer hands the saved state back
  through `onSaved`, now threaded from `ItemDetailView`
- 16 unit tests across `db/items`, `db/collections`, `actions/items` and
  `actions/collections`. Suite 398 → 414
- `npm test`, `npx tsc --noEmit`, `npm run lint` and `npm run build` pass; the
  route table is unchanged

Verified in the browser as the demo user:

- Item card star:
  - it flipped at once and held for 4s while the refresh landed
  - the drawer stayed shut
  - the item then appeared on `/favorites`
- Card star visibility and keyboard:
  - an unfavorited card's star showed on hover and on keyboard focus
  - Tab went from Open to the star
- Drawer:
  - the Favorite button held its state across the refresh
  - reopening the drawer showed the saved state
  - the card behind it updated after ~2.8s
- Collection card menu: the label switched to Unfavorite, and the collection
  moved into the sidebar's Favorites
- Collection page: Favorite unfavorited it, and it left the sidebar Favorites
  after ~1.6s
- Offline: the star reverted with "Could not save. Check your connection and
  try again."
- At 390px nothing scrolls sideways

Decisions worth carrying forward:

- **"Cards" was read as both collection cards and item cards.** The question was
  raised at load time and not answered, so the goals as written were built.
  `ImageCard` and `FileRow` still show a static star
- **The actions take the state to set, not a flip**, so a double click or a
  retried request cannot land on the opposite of what was asked
- **Ownership is part of the write**: `update` with `where: { id, userId }`,
  with P2025 mapped to null. As with the other mutations, another user's row is
  "not found", never forbidden
- **The post-save `onSaved` and `refresh` run in a nested `startTransition`.**
  React only treats updates after an `await` as part of the transition when
  they are wrapped again. Wrapped, they join the pending action, so the
  optimistic value is held until the refreshed props arrive instead of
  flickering back. Confirmed by sampling `aria-pressed` every 100ms for 4s
- **The drawer's copy of the item is updated through `onSaved`**, because
  `router.refresh()` re-renders server props but not the provider's client
  state
- **Favoriting bumps `updatedAt`** (Prisma's `@updatedAt`). That is what
  `/favorites` sorts by as "most recently favorited", but it also moves the item
  up in the dashboard's Recent list and on the type pages
- **The item card's star shows only on hover or focus unless the item is a
  favorite**, and always on `pointer-coarse` screens, where there is no hover.
  Headless Chromium reports a fine pointer even at 390px, so the touch branch was
  not exercised
- **`ItemCardButton` moved first in the card's DOM**, so Tab reaches Open
  before the star. It is absolutely positioned, so the layout is unchanged. The
  same call as `FileRow`
- **The collection card's own star next to the name is not optimistic**; it
  updates when the refresh lands. Only the menu label flips at once
- **Pin is still display-only.** The same hook would serve it once a
  `setItemPinned` action exists
- Only the demo account can toggle what it sees, the same limit as edit and
  delete, since the item lists are still demo-scoped
- The walkthrough favorited then unfavorited "list files" and the DevOps
  collection, so both ended as they started, but their `updatedAt` is now
  2026-09-26
- The browser session used a session JWT minted locally for `seed-user-demo`.
  The token file was deleted afterwards. `.playwright-mcp/` holds the console
  log; it is gitignored
