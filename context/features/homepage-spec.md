# Homepage

## Overview

Replace the placeholder `src/app/page.tsx` with the real marketing homepage,
built from the approved mockup in `prototypes/homepage/` (`index.html`,
`styles.css`, `script.js`). The mockup is the reference for layout, copy and
behaviour; this feature ports it to the project's stack.

## Requirements

### Route

- `/` stays public and outside the `(app)` and `(auth)` route groups
- Add page `metadata` (title and description) for the homepage
- Read the session on the server with `auth()`. A signed-in visitor sees a
  single "Go to Dashboard" button in the nav instead of Sign In / Get Started,
  and the hero and CTA buttons point to `/dashboard`
- No database queries. Everything on the page is static content

### Sections

Port every section in the mockup, with the same copy and order:

1. **Nav**: fixed, logo, Features/Pricing links, auth buttons. More opaque
   once the page is scrolled
2. **Hero**: eyebrow, gradient headline, subheadline and two CTAs, then the
   chaos → arrow → dashboard preview visual
3. **Features**: 6 cards
4. **AI**: Pro badge and checklist; code editor mockup with "AI Generated Tags"
5. **Pricing**: Free and Pro cards, "Most Popular" badge, monthly/yearly toggle
6. **CTA**: "Ready to Organize Your Knowledge?"
7. **Footer**: logo, link columns and a copyright with the current year

### Server and client components

Server components by default. Only these need `"use client"`:

- `ScrollHeader`: wraps the nav and toggles its opacity on scroll. The nav
  content is passed in as `children` and stays server-rendered
- `ChaosField`: the floating icons (`requestAnimationFrame` loop, wall bounce,
  rotation/scale pulse, cursor repel, paused while off screen)
- `Reveal`: fades its children in on scroll with `IntersectionObserver`.
  One reusable wrapper used by every section
- `PricingPlans`: the billing toggle plus both plan cards, since the toggle
  changes the Pro price

Everything else (the sections, `DashboardPreview`, `TransformArrow`, the
editor mockup and the footer) is a server component.

### File layout

- `src/app/page.tsx` composes the sections
- Components go in `src/components/home/`, one per section plus the client
  pieces above
- Section content (features, AI checklist, footer links) lives in data arrays
  that are mapped over, not repeated JSX
- Plan data (name, prices, limits, features) goes in `src/lib/plans.ts`, so the
  numbers are stated once. They match `context/project-overview.md`: Free is
  $0 with 50 items and 3 collections; Pro is $8/month or $72/year
- The chaos physics (one step of position, velocity, bounce and repel) is a
  pure function in `src/lib/chaos-physics.ts`. `ChaosField` only drives it and
  writes transforms, so the maths can be unit tested

### Links

| Element | Destination |
| --- | --- |
| Logo | `/` |
| Features / Pricing (nav and footer) | `#features` / `#pricing` |
| Sign In | `SIGN_IN_PATH` (`/sign-in`) |
| Get Started, "Start for free", Free "Get started", CTA button | `/register` |
| "Upgrade to Pro" | `/register` (billing does not exist yet) |
| "See how it works" | `#features` |
| Signed in: nav, hero and CTA buttons | `/dashboard` |

The footer keeps all three of the mockup's columns (Product, Resources,
Company) and every link in them. Changelog, Docs, Blog, Support, About,
Privacy and Terms have no pages yet, so they stay `#` placeholders. Keep their
destinations in the footer's links array so each one is a one-line change when
its page lands.

### Styling

- Tailwind v4 and ShadCN, like the rest of the app. Remove `styles.css`'s
  hand-written tokens in favour of the existing theme tokens (`bg-background`,
  `bg-card`, `text-muted-foreground`, `border-border`, …)
- `Button` (with `asChild` around `Link`) for every button and `Badge` for
  badges. `Card` for the feature and pricing cards where it fits
- Item type colors come from the helpers in `src/lib/icons.ts`, using the
  `AccentColor` values: snippet blue, prompt purple, command orange, note
  yellow, file gray, image pink, link green. Add a top-border helper beside
  `getAccentBorderClass` for the preview cards, which use a top edge rather
  than a left one. Instant Search keeps the brand indigo
- Keyframes (arrow pulse) are defined in `src/app/globals.css` under `@theme`.
  No `tailwind.config` file and no JSX `style` props. `ChaosField` writing
  `element.style.transform` from its animation loop is the one exception,
  since the positions change every frame
- The static scatter layout for the icons is Tailwind classes, so the page
  looks right before the script runs
- Honour reduced motion: with `motion-reduce`, the icons stay still in the
  scatter layout, the arrow does not pulse and `Reveal` shows content at once
- Mobile: the hero visual stacks vertically, the arrow rotates to point down,
  and the grids drop to one column. No horizontal scroll at 390px

### Keep it DRY

- Extract a shared `Logo` component (the gradient tile with the `Layers` icon
  and the wordmark). The sidebar header, `(auth)/layout.tsx` and the homepage
  all render it today or will, and they currently duplicate the markup
- Move the inline GitHub mark out of `GitHubSignInButton` into a shared brand
  icons file, beside the simplified Notion, Slack and VS Code marks the chaos
  field needs
- Reuse `EditorChrome`'s window dots for the editor mockup if it fits without
  bending its API. Otherwise keep the mockup's own markup

## Testing

- Unit tests for `src/lib/chaos-physics.ts`: wall bounce on each side, the
  repel push inside the radius and none outside it, speed easing back to
  cruising speed, and the capped time step
- Unit tests for any helper in `src/lib/plans.ts` (e.g. price formatting)
- In the browser: every link in the table above, the signed-in and signed-out
  nav, the pricing toggle, reduced motion, and 1440px and 390px widths with
  no console errors

## Out of scope

- Billing, Stripe and plan enforcement
- Pages for the placeholder footer links
- Deleting `prototypes/homepage/`. It stays as the reference
