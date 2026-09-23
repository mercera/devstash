# Item Types

Reference for DevStash's 7 built-in (system) item types: what each one is for,
how it is stored, and how the UI renders it today.

> Researched 2026-09-23 against `main` at `30e64ef`.
>
> Sources: `context/project-overview.md`, `prisma/schema.prisma`,
> `prisma/seed.ts`, `context/features/seed-spec.md`, `src/lib/icons.ts`,
> `src/types/index.ts`, `src/lib/db/items.ts` and the dashboard components.
> The research prompt also named `src/lib/constants.tsx`. That file does not
> exist, and the type metadata it would have held is spread across the files
> above.

---

## Where type metadata lives

There is no constants module for item types. The metadata is split across
four places:

| Concern | Location |
| --- | --- |
| Canonical rows (id, name, slug, icon, color) | `prisma/seed.ts` → `ITEM_TYPES`, upserted into the `ItemType` table |
| Spec hex colors | `context/features/seed-spec.md` (docs only, never stored) |
| Icon name → lucide component | `src/lib/icons.ts` → `ICONS` / `getIcon()` |
| Accent name → Tailwind classes | `src/lib/icons.ts` → `ACCENT_TEXT`, `ACCENT_BORDER`, `ACCENT_DOT`, `ACCENT_TILE` |
| Pro-only flag | `src/components/dashboard/Sidebar.tsx` → `PRO_TYPE_SLUGS` (display only) |

The database stores the icon as a **lucide component name** (a string) and the
color as a **semantic `AccentColor` enum value**, not a hex. This keeps the data
layer free of React and Tailwind. A hex exists only in the seed spec.

---

## The 7 system types

All seven are seeded with `isSystem: true` and `userId: null`, so every user
shares them. They are listed in seed order, which the sidebar also uses
(`orderBy: createdAt asc`).

| # | Name | Slug | Seed id | Icon (lucide) | Accent | Spec hex | Storage | Plan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Snippets | `snippet` | `seed-type-snippet` | `Code` | `blue` | `#3b82f6` | text | Free |
| 2 | Prompts | `prompt` | `seed-type-prompt` | `Sparkles` | `purple` | `#8b5cf6` | text | Free |
| 3 | Commands | `command` | `seed-type-command` | `Terminal` | `orange` | `#f97316` | text | Free |
| 4 | Notes | `note` | `seed-type-note` | `StickyNote` | `yellow` | `#fde047` | text | Free |
| 5 | Files | `file` | `seed-type-file` | `File` | `gray` | `#6b7280` | file | **Pro** |
| 6 | Images | `image` | `seed-type-image` | `Image` | `pink` | `#ec4899` | file | **Pro** |
| 7 | Links | `link` | `seed-type-link` | `Link` | `green` | `#10b981` | URL | Free |

Naming convention: `name` is the plural display label and `slug` is the
singular, URL-safe key (`/items/snippet`). Everything that identifies a type in
code keys on `slug`: routes, `PRO_TYPE_SLUGS` and the seed's item mapping.

### Spec hex vs. rendered color

The spec hexes were mapped to the nearest `AccentColor` value when the seed was
written. The UI renders Tailwind's palette for that accent, not the spec hex,
so four of the seven render as a different shade from the spec:

| Type | Spec hex | Closest Tailwind to spec | Rendered as (`AccentColor` → Tailwind) | Match? |
| --- | --- | --- | --- | --- |
| snippet | `#3b82f6` | blue-500 | `blue` → blue-400 / blue-500 | ✅ same hue family and shade |
| prompt | `#8b5cf6` | **violet**-500 | `purple` → purple-400 / purple-500 | ⚠️ violet vs purple |
| command | `#f97316` | orange-500 | `orange` → orange-400 / orange-500 | ✅ |
| note | `#fde047` | yellow-**300** | `yellow` → yellow-400 / yellow-500 | ⚠️ darker than spec |
| file | `#6b7280` | **gray**-500 | `gray` → **neutral**-400 / neutral-500 | ⚠️ cool gray vs neutral |
| image | `#ec4899` | pink-500 | `pink` → pink-400 / pink-500 | ✅ |
| link | `#10b981` | **emerald**-500 | `green` → green-400 / green-500 | ⚠️ emerald vs green |

The differences are small, and the dark UI reads them as the intended hue.
Matching the spec exactly would mean widening `AccentColor` (for example adding
`violet` and `emerald`) or storing hex. Both are schema changes.

---

## Per-type detail

"Key fields" lists the `Item` columns that type is meant to use, on top of the
shared properties described [below](#shared-properties).

### Snippet — `Code` · blue

- **Purpose:** Reusable code: hooks, utilities, component patterns, config
  files (Dockerfiles, CI).
- **Key fields:** `content` (the code), `language` (syntax highlighting hint,
  e.g. `typescript`, `dockerfile`).
- **`contentType`:** `text`
- **Seed data:** 4 items (`useLocalStorage`, compound component, `groupBy`,
  multi-stage Dockerfile), all with `language` set.

### Prompt — `Sparkles` · purple

- **Purpose:** AI prompts and workflow instructions (code review,
  documentation generation, refactoring).
- **Key fields:** `content` (the prompt text, markdown-friendly). `language` is
  left null because prompts are prose, not code.
- **`contentType`:** `text`
- **Seed data:** 3 items, all in the *AI Workflows* collection.
- **Roadmap:** the target for the Pro "prompt optimization" AI feature.

### Command — `Terminal` · orange

- **Purpose:** Shell commands and short scripts: git, docker, process
  management, package managers, deploy steps.
- **Key fields:** `content` (one-liners or multi-line scripts), `language`
  (`bash` in every seeded row).
- **`contentType`:** `text`
- **Seed data:** 5 items. Four are single-line and one is a four-line deploy script.
- **How it differs from snippet:** Storage is identical. A command is
  something to *run* and a snippet is something to *paste into code*. The
  split is semantic only, and nothing in the schema enforces it.

### Note — `StickyNote` · yellow

- **Purpose:** Free-form markdown notes: course notes, context files,
  documentation fragments.
- **Key fields:** `content` (markdown). `language` is normally null.
- **`contentType`:** `text`
- **Seed data:** none. The sidebar count reads `0`.
- **Roadmap:** the main consumer of the planned "Markdown editor for text
  items".

### File — `File` · gray · Pro

- **Purpose:** Uploaded documents and templates (docs, boilerplates, context
  files as attachments).
- **Key fields:** `fileUrl` (Cloudflare R2 object URL), `fileName`, `fileSize`
  (bytes). `content` is null.
- **`contentType`:** `file`
- **Seed data:** none.
- **Plan:** Pro. It is labelled with a `PRO` badge in the sidebar, but nothing
  gates it yet. `User.isPro` is not read anywhere.
- **Status:** File upload and R2 storage are not implemented.

### Image — `Image` · pink · Pro

- **Purpose:** Screenshots, diagrams and design references.
- **Key fields:** `fileUrl`, `fileName`, `fileSize`, the same as File.
- **`contentType`:** `file`
- **Seed data:** none.
- **Plan:** Labelled Pro in the sidebar. The overview's pricing table
  contradicts this. See [open questions](#inconsistencies--open-questions).
- **Status:** Upload is not implemented. When it lands, the display should
  probably render a thumbnail rather than an icon.

### Link — `Link` · green

- **Purpose:** Bookmarks: documentation, component libraries, design
  systems, tools.
- **Key fields:** `url`. `content` and `language` are null.
- **`contentType`:** `text`. The enum has no `url` value (see below).
- **Seed data:** 6 items (Docker, GitHub Actions, Tailwind, shadcn/ui,
  Material 3, Lucide), all with real URLs.

---

## Classification: text vs. file vs. URL

The schema has **two** storage kinds (`enum ContentType { text, file }`), but
the types actually use **three** payload shapes:

| Class | Types | Payload columns | `contentType` stored |
| --- | --- | --- | --- |
| **Text** | snippet, prompt, command, note | `content` (+ optional `language`) | `text` |
| **File** | file, image | `fileUrl`, `fileName`, `fileSize` | `file` |
| **URL** | link | `url` | `text` ⚠️ |

URL has no enum value of its own, so link items are stored as `contentType:
text` with `content = null` and the payload in `url`. `contentType` therefore
cannot tell a link apart from an empty note. Code that needs to know the
payload shape has to branch on **type slug** (or on which column is non-null),
not on `contentType` alone.

Nothing enforces these pairings. The database allows a snippet with a `fileUrl`
or a link with `content`. When items CRUD lands, the Zod schemas are the
natural place to require the right column per type.

Within the text class there is a second, softer split:

- **Code-like** (snippet, command): `language` is set and content should be
  syntax-highlighted.
- **Prose-like** (prompt, note): `language` is null and content is markdown.

---

## Shared properties

Every item has these regardless of type (`model Item`):

| Field | Notes |
| --- | --- |
| `id`, `createdAt`, `updatedAt` | `updatedAt` drives every "recent" ordering and the date shown on cards |
| `title` | Required |
| `description` | Optional one-liner, shown under the title on cards |
| `isFavorite`, `isPinned` | Star / pin markers. Indexed per user |
| `userId` | Owner. Cascades on user delete |
| `typeId` | Required. `onDelete: Restrict`, so a type that has items cannot be deleted |
| `collectionId` | Optional. Deleting the collection sets this to null and keeps the item |
| `tags` | Many-to-many through `Tag`/`ItemTag`. Flattened to `string[]` in the UI, sorted by name |

`ItemType` itself also carries `isSystem` and `userId`. The 7 types here are
all system types. Pro users will be able to create custom types
(`isSystem: false`, `userId` set) using the same icon/color mechanism. Because
of the `@@unique([userId, slug])` constraint, a custom type's slug must be
unique only within that user. System types are not constrained by it, since
Postgres treats a null `userId` as distinct.

---

## Display differences (current UI)

The current UI does **not** render items differently by type beyond the icon
and accent color. `ItemCard` shows the title, description, tags, pin/star and
date, and never reads `content`, `url`, `language` or the file fields.

| Surface | Per-type treatment |
| --- | --- |
| **Sidebar → Types** | Icon in `text-{accent}-400`, per-user item count, link to `/items/{slug}` (route not built yet). Files and Images show an outline `PRO` badge |
| **ItemCard** (Pinned / Recent) | 4px left border `border-l-{accent}-500` and icon in a tinted tile `bg-{accent}-500/10 text-{accent}-400` |
| **CollectionCard** | Row of type icons, most-used type first. The card's left border uses the most-used type's accent, falling back to the collection's own `color` when it has no items |
| **Sidebar → Collections** | Non-favorite collections show a dot (`bg-{accent}-500`) in the most-used type's accent |
| **Profile page** | Per-type breakdown with icon, name and count for all 7, including zeros |

The icon lookup falls back to lucide `File` for any name missing from
`ICONS`. That has already hidden one bug: `Code` and `StickyNote` were missing
until the dashboard moved onto live data. A custom type with an unregistered
icon name will render as a file icon without any error.

### Expected type-specific display (not built)

These are implied by the spec but not implemented:

- **Snippet / Command:** syntax-highlighted body using `language`. Commands
  probably also want a one-click copy.
- **Prompt / Note:** rendered markdown (the markdown editor is on the feature
  list).
- **Link:** clickable `url`, likely with its domain shown.
- **Image:** thumbnail preview from `fileUrl`.
- **File:** file name, human-readable size and a download action.

---

## Inconsistencies & open questions

1. **Are images Free or Pro?** The overview's pricing table gives Free "image
   uploads" and restricts only "file uploads" to Pro. The sidebar
   (`PRO_TYPE_SLUGS = {file, image}`) marks both as Pro. One of them needs
   correcting before plan gating is built.
2. **Link's `contentType`.** The enum has no `url` value, so links are stored as
   `text`. Adding `url` to the enum is a small migration, and would make
   `contentType` a reliable discriminator.
3. **Pro status is UI-only.** `PRO_TYPE_SLUGS` is hardcoded in a component.
   When gating lands it should move to `src/lib/` or become an `ItemType`
   column, and be enforced server-side against `User.isPro`.
4. **Spec hex vs. rendered shade** for prompt, note, file and link (see the
   [color table](#spec-hex-vs-rendered-color)).
5. **Naming drift.** The overview calls the seventh type "URL", while the seed,
   slug and UI call it "Link" (`link`). The seed spec also lists lowercase
   singular names, while the seeded `name` is the plural display label.
6. **No seeded rows** for note, file or image, so their display paths have
   never rendered real data.
