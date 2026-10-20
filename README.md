# Programmer's Hub

A modern developer marketplace — showcase your stack, publish the projects you've
actually shipped, and get contacted by clients in one click.

Built with **React 19 + Vite + Tailwind CSS v4**, **lucide-react** icons and
**Supabase** for auth, database and storage.

> Created by **Luwangula Alpha** · Support: [alphaluwangula@proton.me](mailto:alphaluwangula@proton.me)

---

## Features

| Area              | What you get                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Auth**          | Email + password through Supabase, password reset, password strength meter, protected routes — and **TOTP two-factor authentication** (Authenticator apps) enforced in the UI _and_ in Postgres row level security                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **Hub dashboard** | A unified workspace at [`/hub`](/hub) with its own top navbar + sidebar and three views (**Find Talent**, **Ship Projects**, **Get Hired**). It streams live activity over Supabase Realtime (`useHubRealtime`: postgres changes on `profiles`/`projects`/`jobs` become sidebar banners + optimistic count deltas that retire when the refetch lands), preserves form drafts in `localStorage` at a 500 ms debounce (`usePersistentForm`, used by the Message Composer and Post-a-Role — restored with a “Draft restored from backup” notice and cleared only on successful submit), shows verified GitHub language metrics + rich availability tooltips on talent cards, runs a Product Hunt-style upvote economy on projects (persisted locally, spring-pop CSS animation, “Most upvoted” sort), and renders sponsored jobs/profiles inside an animated indigo→violet→cyan gradient border with a ⚡ Featured badge. Live rows win when present; labelled starter content keeps a new hub non-empty |
| **Search**        | Command palette (**⌘K** / `Ctrl+K`) that fuzzy-searches developers, projects and roles at once, plus `/`-to-focus search on every directory                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Developers**    | Searchable, filterable, sortable directory with skill facets, "open to work" toggle, shareable filter URLs and pagination                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Projects**      | Featured builds from the hub + community submissions, categories, tag links, edit/delete for owners — and every live URL opens **inside the hub in a sandboxed project window** (iframe) with reload and open-in-tab escape hatches                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Hiring**        | Post roles with budget, stack and level; open/closed status; browse and filter the board; apply with a short note (falls back to email if a write fails)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **Applications**  | Every applicant lands in your dashboard inbox — only readable by the role owner, with CSV export and one-click reply                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Shortlist**     | Private saved-developer list in `localStorage`, with CSV export, bulk email/WhatsApp and sort options                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Dashboard**     | Profile editor with avatar upload, completeness checklist, project + role management, the applications inbox, and a **Security** tab that manages TOTP authenticators                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Design**        | Dark / light / system theme with no flash-of-wrong-theme, glassmorphism cards, aurora gradients, animated counters, toasts, responsive down to 320px                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Accessibility** | Skip link, focus-trapped dialogs, live regions for results, arrow-key support in the palette, visible focus rings, reduced-motion support                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Robustness**    | Error boundaries per route, offline banner, retrying data layer, honest empty/error states and skeletons instead of spinners                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Offline-ready** | The production build ships a generated service worker: hashed assets are precached, HTML is network-first, and a dropped connection still serves the app shell                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **SEO**           | Per-page titles, descriptions, canonical URLs, Open Graph/Twitter tags, JSON-LD, `robots.txt`, `sitemap.xml`, web app manifest                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

---

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production bundle in dist/
npm run preview  # serve the production build
```

### Quality checks

```bash
npm run lint         # ESLint (flat config)
npm run format:check # Prettier formatting gate
npm run format       # …and the fixer
npm run test         # Vitest unit + component tests
npm run build        # production bundle + service worker (dist/)
npm run check:build  # audits the artifacts in dist/ (sitemap, robots, sw.js)
npm run smoke        # renders every route in jsdom, fails on render errors
npm run verify       # lint + format + test + build + check:build + smoke
```

---

## Supabase setup

1. Open your project → **SQL Editor** → paste and run [`supabase/schema.sql`](supabase/schema.sql).
   It creates four tables (`profiles`, `projects`, `jobs`, `applications`), enables row
   level security, adds the public-read / owner-write policies, the `status` column on
   jobs, and keeps `updated_at` current.
2. **Storage** → create a public bucket named `avatars` (the schema does this for you).
3. **Authentication → Multi-Factor Auth** → make sure **TOTP** is enabled (it is on by
   default for new projects). The schema's `public.mfa_satisfied()` helper is what every
   write policy checks, so two-factor is enforced in the database, not just the UI.
4. (Optional) Override credentials in `.env.local` — see [`.env.example`](.env.example):
   ```bash
   VITE_SUPABASE_URL=https://ggfukwknodeqwnitkjvk.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdnZnVrd2tub2RlcXduaXRranZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyNTQwMjMsImV4cCI6MjA5ODgzMDAyM30.oqX9-CyBRox5hgFPjkzzPuCrJvsoFqbbwBgwMuFK7Vw
   ```
   Defaults already point at `https://ggfukwknodeqwnitkjvk.supabase.co`.

### How two-factor authentication works

1. A member signs in with email + password (`supabase.auth.signInWithPassword`) and lands
   on an `aal1` session.
2. `src/components/auth/MfaGate.jsx` (mounted once in the app shell) then asks for the
   second factor:
   - **no authenticator yet** → `MfaEnroll` calls `supabase.auth.mfa.enroll({ factorType: "totp" })`,
     renders the returned QR code (plus the plain secret), and verifies the first 6-digit
     code through `mfa.challengeAndVerify()`.
   - **authenticator enrolled but the session is `aal1`** → `MfaChallenge` blocks the app
     until the code is verified; the only other way out is signing out.
3. Everything that writes is guarded: the UI uses `useMfaGuard()` (friendly warning) and
   Postgres uses restrictive RLS policies calling `public.mfa_satisfied()`, which requires
   the JWT `aal` claim to be `aal2` for any account with a verified factor. A session that
   skipped the challenge cannot insert, update or delete — policies are `as restrictive`,
   so no permissive policy can override them.
4. Factors are managed in **Dashboard → Security** (`MfaPanel`): list, verify and remove
   authenticators, plus live assurance-level status.

`VITE_REQUIRE_MFA=false` makes the second factor opt-in instead of required (people who
enrol are still challenged). To make the database strict for _every_ account — even ones
that never enrolled — swap the body of `public.mfa_satisfied()` in
[`supabase/schema.sql`](supabase/schema.sql) for the one-line variant documented there.

### Project windows (iframe)

`src/components/projects/ProjectViewer.jsx` is the "project window" every
`ProjectCard` opens for `live_url`: a sandboxed `<iframe>` inside the hub with its own title
bar, host chip, reload button and a link that opens the page in a real tab. Frames are
sandboxed without `allow-top-navigation` (and without `allow-same-origin` when the target is
this app's own origin), and a hint appears after a few seconds for sites that block
embedding through `X-Frame-Options`/CSP.

### Applications inbox

Applications are readable **only by the role owner** (see the `Job owners read
applications` policy). The dashboard asks for applications belonging to your own
roles and groups them by job, so a failed or missing policy shows up as an empty
inbox rather than leaking anyone else's data.

---

## Project structure

```
src/
├─ components/
│  ├─ auth/        MfaGate, MfaChallenge, MfaEnroll, MfaPanel
│  ├─ brand/       GitHub / LinkedIn / X marks (not in lucide v1)
│  ├─ cards/       DeveloperCard, ProjectCard, JobCard
│  ├─ feedback/    ErrorBoundary
│  ├─ hiring/      JobFormModal, ApplyModal
│  ├─ home/        Hero
│  ├─ layout/      Layout, Navbar, Footer, CommandPalette, OfflineBanner, ThemeToggle, PageHeading
│  ├─ projects/    ProjectFormModal, ProjectViewer (sandboxed iframe window)
│  └─ ui/          Button, Modal, Field, Badge, Avatar, Toggle, SearchInput, SortSelect,
│                  FilterPills, ResultCount, LoadMore, SaveButton, ShareMenu, EmptyState,
│                  SetupNotice, Skeletons, Accordion, Marquee, StarRating, AnimatedCounter
├─ context/        AuthContext, ThemeContext, ToastContext
├─ data/           showcase.js — featured builds shown on /projects
├─ hooks/          useCollection, useDocument, useUrlFilters, usePageMeta, useDebouncedValue,
│                  useHotkeys, useFocusTrap, useOnlineStatus, useMediaQuery, useMfaGuard
├─ lib/            api (data layer), supabase, mfa (TOTP/AAL helpers), search (fuzzy),
│                  shortlist, store (tiny observable store), uiStore, recents, site, utils
├─ pages/          Home, Developers, DeveloperProfile, Projects, Hiring, Shortlist, About, Login, Dashboard, NotFound
└─ test/           vitest setup + zero-dependency render helper
```

Rebranding? Everything (creator name, support email, WhatsApp, repo links, filters,
sorts) lives in [`src/lib/site.js`](src/lib/site.js).

**Keyboard shortcuts:** `⌘K` / `Ctrl+K` command palette · `/` focus search · `Esc`
close dialogs · `↑ ↓ ↵` navigate the palette.

---

## No sample data

The hub is **Supabase-only**: there is no demo mode, no bundled rows and no
`VITE_DEMO_DATA` switch. With empty tables the directory, board and projects pages show
honest empty states (and a setup notice explaining how to run
[`supabase/schema.sql`](supabase/schema.sql)) instead of invented developers.

The only content that ships with the repo is `src/data/showcase.js` — the hub's own
open-source builds, attributed to its author and linking at real repositories.

---

## Brand assets

Raster assets are generated from the geometry in [`docs/brand/`](docs/brand):

```bash
npm run assets:brand    # needs python3 + Pillow
```

It writes `public/icon-192.png`, `public/icon-512.png`, `public/apple-touch-icon.png`
and `public/og-image.png` (the social card).

---

## Deployment

- **Vercel / Netlify** — zero config, `vercel.json` and `public/_redirects` handle
  client-side routing. Set `VITE_SITE_URL=https://your-domain` so canonical tags,
  Open Graph URLs and `sitemap.xml`/`robots.txt` point at the real host.
- **GitHub Pages** — drop [`docs/ci.yml`](docs/ci.yml) into `.github/workflows/ci.yml`.
  It builds with `VITE_BASE=/Programmer-hub/`, copies `index.html` to `404.html` for
  SPA fallback, and deploys on every push to `main`.

---

## Legacy v1

The original vanilla HTML/CSS/JS version is preserved untouched in
[`legacy/`](legacy/README.md) for reference. Nothing in that folder is bundled.

---

## License

MIT — see [LICENSE](LICENSE).
