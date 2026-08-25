# Current Feature

## Status

Completed

## Goals

Create a single source of truth for mock data so the dashboard UI can be built
before the database exists.

- Define the core data model types (`User`, `ItemType`, `Collection`, `Item`)
- Seed realistic mock items, collections, item types and a current user
- Expose derived getters so the UI never reads raw arrays directly

## Notes

- `src/types/index.ts` holds the interfaces, mirroring the Prisma draft in
  `context/project-overview.md`.
- `src/lib/mock-data.ts` holds the data plus the getters the dashboard reads
  through (`getItemTypesWithCounts`, `getCollectionsWithCounts`,
  `getPinnedItems`, `getRecentItems`, `searchItems`, …).
- Counts are **derived** from the `items` array rather than hardcoded, so the
  sidebar and collection cards stay consistent as mock items are added.
- Tags are flattened to `string[]` on `Item`. The database will model these
  through `Tag`/`ItemTag`, but the UI only ever renders names.
- `color` on types and collections is a semantic name (`"blue"`, `"purple"`, …)
  that the UI maps to Tailwind classes — no inline styles.
- Swapping to Prisma later should be a one-file change: the getters already
  return the joined shapes the UI expects.

## History

### Mock Data Layer — Completed (2026-08-25)

Added the single source of truth for dashboard mock data.

- Created `src/types/index.ts` with `User`, `ItemType`, `Collection`, `Item` and
  the joined view types (`ItemWithRelations`, `CollectionWithCount`, …)
- Created `src/lib/mock-data.ts` with 7 system item types, 6 collections,
  16 items and a mock current user
- Added derived getters for the sidebar, collection cards, pinned/recent
  sections and search
- `npm run build` and `npm run lint` pass

### Initial Setup — Completed (2026-08-24)

Scaffolded the Next.js client with Tailwind CSS v4.

- Bootstrapped Next.js (React 19) + TypeScript project
- Configured Tailwind CSS v4 via `@theme` in `src/app/globals.css` (no `tailwind.config` file)
- Replaced the default landing page in `src/app/page.tsx`
- Removed unused Create Next App SVGs from `public/`
- Added `CLAUDE.md` and the `context/` docs (project overview, coding standards, AI interaction, current feature)
- Renamed the default branch `master` → `main`
- Committed as `chore: initialize next.js client with tailwind css` and pushed to `origin` (https://github.com/mercera/devstash.git)
