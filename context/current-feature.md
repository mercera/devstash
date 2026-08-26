# Current Feature

<!-- Feature Name -->

Dashboard UI — Phase 1

## Status

<!-- Not Started|In Progress|Completed -->

Completed

## Goals

<!-- Goals & requirements -->

Phase 1 of 3 for the dashboard UI layout. Build the shell only — no real data or interactivity yet.

- Initialize ShadCN UI and install the components needed for this phase
- Add a dashboard route at `/dashboard`
- Build the main dashboard layout plus any global styles it needs
- Dark mode by default
- Top bar with search and a "New Item" button (display only, non-functional)
- Placeholder sidebar and main area — just an `h2` with "Sidebar" and "Main" for now

## Notes

<!-- Any extra notes -->

- Full spec: @context/features/dashboard-phase-1-spec.md
- Target look: @context/screenshots/dashboard-ui-main.png
- Mock data: @src/lib/mock-data.ts
- Follow-on phases: @context/features/dashboard-phase-2-spec.md, @context/features/dashboard-phase-3-spec.md
- Tailwind v4 — theme config goes in `src/app/globals.css` via `@theme`, no `tailwind.config` file

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

Open items carried into phase 2:

- `context/screenshots/dashboard-ui-main.png` does not exist yet, so the layout follows the project overview rather than the intended design — worth reviewing
- `src/lib/mock-data.ts` does not exist yet and is needed for phase 2
