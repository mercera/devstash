# Current Feature

<!-- Feature Name -->

## Status

<!-- Not Started|In Progress|Completed -->

## Goals

<!-- Goals & requirements -->

## Notes

<!-- Any extra notes -->

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
