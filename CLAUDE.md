# DevStash

A developer knowledge hub for snippets, commands, prompts, notes, files, images, links and custom types.

## Context Files

Read the following to get the full context of the project:

- @context/project-overview.md
- @context/coding-standards.md
- @context/ai-interaction.md
- @context/current-feature.md

Per-feature specs live in `context/features/` — one file per feature, written
before implementation starts. Read the relevant one when working on a feature.

## Commands

- **Dev server**: `npm run dev` (runs on http://localhost:3000)
- **Build**: `npm run build`
- **Production server**: `npm run start`
- **Lint**: `npm run lint`

## Neon MCP / Database Access

**ALWAYS** target the DevStash project's **development** branch when using the Neon MCP tools.

- **Org**: `Thenura` — `org-withered-rain-62168282`
- **Project**: `Devstash` — `patient-wildflower-80911518`
- **Branch (default for ALL work)**: `development` — `br-bold-voice-axcpacvq`
- **Branch (off-limits)**: `production` — `br-nameless-moon-ax2h1cdp`

Rules:

1. Pass `project_id: "patient-wildflower-80911518"` and
   `branch_id: "br-bold-voice-axcpacvq"` on **every** Neon MCP call that accepts
   them. Never rely on the default branch — the project default is `production`,
   so omitting `branch_id` silently targets production.
2. **NEVER read from or write to the `production` branch** unless I explicitly
   name it in the request. If a task seems to need production, stop and ask first.
3. Never run destructive SQL (`DROP`, `TRUNCATE`, `DELETE`, `UPDATE` without a
   narrow `WHERE`, schema changes) on any branch without asking me first — this
   includes `development`.
4. Schema changes go through `prisma migrate dev` (see Database in
   `context/coding-standards.md`), not ad-hoc SQL or MCP migration tools.
5. `.env` points at `development`; `.env.production` points at `production`.
   Don't run app or verification commands against `.env.production`.

**IMPORTANT:** Do not add Claude to any commit messages
