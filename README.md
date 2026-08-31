# Programmer's Hub

A modern developer marketplace — showcase your stack, publish the projects you've
actually shipped, and get contacted by clients in one click.

Built with **React 19 + Vite + Tailwind CSS v4**, **lucide-react** icons and
**Supabase** for auth, database and storage.

> Created by **Luwangula Alpha** · Support: [alphaluwangula@proton.me](mailto:alphaluwangula@proton.me)

---

## Features

| Area | What you get |
| --- | --- |
| **Auth** | Real **Sign in with Google** (Supabase OAuth) plus email + password, password reset and protected routes |
| **Developers** | Searchable, filterable directory with skill filters, "open to work" toggle and public profile pages |
| **Projects** | Featured builds from the hub + community submissions with repo, live URL and cover image |
| **Hiring** | Post roles with budget and stack, browse the board, and apply with a short note |
| **Dashboard** | Profile editor with avatar upload, profile-strength meter, and management of your projects and roles |
| **Design** | Dark/light themes, glassmorphism cards, aurora gradients, animated counters, toasts, responsive down to 320px |
| **Icons** | Every icon is [lucide-react](https://lucide.dev) (brand marks live in `src/components/brand/`) |

---

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production bundle in dist/
npm run preview  # serve the production build
```

---

## Supabase setup

1. Open your project → **SQL Editor** → paste and run [`supabase/schema.sql`](supabase/schema.sql).
   It creates four tables (`profiles`, `projects`, `jobs`, `applications`), enables row
   level security and adds the public-read / owner-write policies.
2. **Storage** → create a public bucket named `avatars`.
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

---

## Project structure

```
src/
├─ components/
│  ├─ auth/        GoogleButton
│  ├─ brand/       Google + GitHub / LinkedIn / X marks (not in lucide v1)
│  ├─ cards/       DeveloperCard, ProjectCard, JobCard
│  ├─ hiring/      JobFormModal, ApplyModal
│  ├─ home/        Hero
│  ├─ layout/      Layout, Navbar, Footer, PageHeading, DemoBanner
│  ├─ projects/    ProjectFormModal
│  └─ ui/          Button, Modal, Field, Badge, Avatar, EmptyState, Skeletons, …
├─ context/        AuthContext, ThemeContext, ToastContext
├─ data/           showcase.js — featured builds shown on /projects
├─ hooks/          useCollection, useDocumentTitle
├─ lib/            supabase client, api, site config, utils
└─ pages/          Home, Developers, DeveloperProfile, Projects, Hiring, About, Login, Dashboard, NotFound
```

Rebranding? Everything (creator name, support email, WhatsApp, repo links, filters)
lives in [`src/lib/site.js`](src/lib/site.js).

---

## Sample data (opt-in)

The app is **Supabase-only by default**: with no rows in your tables, directory and
board pages show friendly empty states instead of invented developers.

If you want to review the UI with a populated board, copy `.env.example` to
`.env.local` and set:

```bash
VITE_DEMO_DATA=true
```

That reads the fictional rows in `src/lib/demoData.js` (never real people), shows a
**demo banner** across the top, and disables all saving. Turn it back off to return
to live Supabase data.

---

## Deployment

- **Vercel / Netlify** — zero config, `vercel.json` and `public/_redirects` handle
  client-side routing.
- **GitHub Pages** — drop [`docs/ci.yml`](docs/ci.yml) into `.github/workflows/ci.yml`.
  It builds with `VITE_BASE=/Programmer-hub/`, copies `index.html` to `404.html` for
  SPA fallback, and deploys on every push to `main`.

---

## Quality checks

```bash
npm run build          # production build
node scripts/smoke.mjs # renders every route in jsdom, fails on render errors
```

---

## Legacy v1

The original vanilla HTML/CSS/JS version is preserved untouched in
[`legacy/`](legacy/README.md) for reference. Nothing in that folder is bundled.

---

## License

MIT — see [LICENSE](LICENSE).
