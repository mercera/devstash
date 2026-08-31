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
