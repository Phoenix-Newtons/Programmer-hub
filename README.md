# Programmer's Hub

A modern developer marketplace — showcase your stack, publish the projects you've
actually shipped, and get contacted by clients in one click.

Built with **React 19 + Vite + Tailwind CSS v4**, **lucide-react** icons and
**Supabase** for auth, database and storage.

> Created by **Luwangula Alpha** · Support: [alphaluwangula@proton.me](mailto:alphaluwangula@proton.me)

---

## Features

| Area              | What you get                                                                                                                                                   |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Auth**          | Real **Sign in with Google** (Supabase OAuth) plus email + password, password reset, password strength meter and protected routes                              |
| **Search**        | Command palette (**⌘K** / `Ctrl+K`) that fuzzy-searches developers, projects and roles at once, plus `/`-to-focus search on every directory                    |
| **Developers**    | Searchable, filterable, sortable directory with skill facets, "open to work" toggle, shareable filter URLs and pagination                                      |
| **Projects**      | Featured builds from the hub + community submissions, with categories, tag links, edit/delete for owners and cover-image fallbacks                             |
| **Hiring**        | Post roles with budget, stack and level; open/closed status; browse and filter the board; apply with a short note (falls back to email if a write fails)       |
| **Applications**  | Every applicant lands in your dashboard inbox — only readable by the role owner, with CSV export and one-click reply                                           |
| **Shortlist**     | Private saved-developer list in `localStorage`, with CSV export, bulk email/WhatsApp and sort options                                                          |
| **Dashboard**     | Profile editor with avatar upload, completeness checklist, project + role management, and the applications inbox                                               |
| **Design**        | Dark / light / system theme with no flash-of-wrong-theme, glassmorphism cards, aurora gradients, animated counters, toasts, responsive down to 320px           |
| **Accessibility** | Skip link, focus-trapped dialogs, live regions for results, arrow-key support in the palette, visible focus rings, reduced-motion support                      |
| **Robustness**    | Error boundaries per route, offline banner, retrying data layer, honest empty/error states and skeletons instead of spinners                                   |
| **Offline-ready** | The production build ships a generated service worker: hashed assets are precached, HTML is network-first, and a dropped connection still serves the app shell |
| **SEO**           | Per-page titles, descriptions, canonical URLs, Open Graph/Twitter tags, JSON-LD, `robots.txt`, `sitemap.xml`, web app manifest                                 |

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
3. **Authentication → Providers** → enable **Google** and add the Supabase callback URL
   to your Google Cloud OAuth client.
4. (Optional) Put your own credentials in `.env.local` — see [`.env.example`](.env.example):
   ```bash
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
   Defaults already point at the public project that ships with this repo.

### How "Sign in with Google" works

`src/components/auth/GoogleButton.jsx` calls
`supabase.auth.signInWithOAuth({ provider: "google" })`, so it is a **real** OAuth
redirect — no mock session. Until you enable the Google provider in Supabase, the
button will surface the provider error in a toast; flip the switch in the Supabase
dashboard and it works everywhere (navbar, login page, mobile drawer, empty states).

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
│  ├─ auth/        GoogleButton
│  ├─ brand/       Google + GitHub / LinkedIn / X marks (not in lucide v1)
│  ├─ cards/       DeveloperCard, ProjectCard, JobCard
│  ├─ feedback/    ErrorBoundary
│  ├─ hiring/      JobFormModal, ApplyModal
│  ├─ home/        Hero
│  ├─ layout/      Layout, Navbar, Footer, CommandPalette, DemoBanner, OfflineBanner, ThemeToggle, PageHeading
│  ├─ projects/    ProjectFormModal
│  └─ ui/          Button, Modal, Field, Badge, Avatar, Toggle, SearchInput, SortSelect,
│                  FilterPills, ResultCount, LoadMore, SaveButton, ShareMenu, EmptyState,
│                  SetupNotice, Skeletons, Accordion, Marquee, StarRating, AnimatedCounter
├─ context/        AuthContext, ThemeContext, ToastContext
├─ data/           showcase.js — featured builds shown on /projects
├─ hooks/          useCollection, useDocument, useUrlFilters, usePageMeta, useDebouncedValue,
│                  useHotkeys, useFocusTrap, useOnlineStatus, useMediaQuery
├─ lib/            api (data layer), supabase, demo (sample-data switch), search (fuzzy),
│                  shortlist, store (tiny observable store), uiStore, recents, site, utils
├─ pages/          Home, Developers, DeveloperProfile, Projects, Hiring, Shortlist, About, Login, Dashboard, NotFound
└─ test/           vitest setup + zero-dependency render helper
```

Rebranding? Everything (creator name, support email, WhatsApp, repo links, filters,
sorts) lives in [`src/lib/site.js`](src/lib/site.js).

**Keyboard shortcuts:** `⌘K` / `Ctrl+K` command palette · `/` focus search · `Esc`
close dialogs · `↑ ↓ ↵` navigate the palette.

---

## Sample data (opt-in)

The app is **Supabase-only by default**: with no rows in your tables, directory and
board pages show friendly empty states instead of invented developers.

To review the UI with a populated board you have three equivalent options:

1. Copy `.env.example` to `.env.local` and set `VITE_DEMO_DATA=true` before building.
2. Click **Switch to live data**/**Explore with sample data** in the amber banner.
3. Toggle **Sample data** in the footer, or run the "Preview with sample data"
   action from the ⌘K palette (no rebuild needed).

Sample mode reads the fictional rows in `src/lib/demoData.js` (never real people),
shows a banner across the top, and disables all saving.

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
