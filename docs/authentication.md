# Authentication — how sign-in actually works here

**This project is not a Next.js app.** It is a **Vite + React 19 single-page
app** deployed to Vercel as static files, with **Supabase Auth** running
entirely in the browser. That distinction changes where every auth bug can
live, so before debugging anything else, note what does **not** exist here:

| Assumed (Next.js + NextAuth)             | Actual (this repo)                               |
| ---------------------------------------- | ------------------------------------------------ |
| `app/api/auth/[...nextauth]/route.ts`    | ❌ none — no API routes at all                   |
| `middleware.ts`                          | ❌ none — no Edge middleware                     |
| `NEXTAUTH_URL` / `NEXTAUTH_SECRET`       | ❌ none — Supabase uses `VITE_SUPABASE_*`        |
| `SessionProvider` from `next-auth/react` | `AuthProvider` in `src/context/AuthContext.jsx`  |
| Session cookie (`HttpOnly`, `SameSite`)  | ❌ none — `localStorage` (`sb-<ref>-auth-token`) |
| Serverless / Edge function timeouts      | ❌ none — zero server runtime                    |
| `NEXTAUTH_URL` callback allowlist        | Supabase **Redirect URLs** allowlist             |

Because the session lives in `localStorage` and not in a cookie, the usual
cookie-domain problems (`SameSite=None`, `Secure`, nested subdomains,
cross-domain middleware redirects) **cannot** occur here. There is also no
server function to time out. The real failure surface is the **OAuth callback
URL** and the **client-side boot sequence**.

## The sign-in sequence

```
/login  ──►  supabase.auth.signInWithOAuth({ provider: "google", redirectTo })
              │  writes sb-<ref>-auth-token-code-verifier to localStorage
              ▼
        <ref>.supabase.co/auth/v1/authorize  ──►  accounts.google.com
              ▲                                        │
              └────────────────────────────────────────┘
              ▼
        <ref>.supabase.co/auth/v1/callback
              ▼
        https://<this-origin>/dashboard?code=<ONE-TIME CODE>&sb_flow_id=…
              ▼
        SPA boots → auth-js `initialize()` → `_isPKCECallback()` matches
              ▼
        POST /auth/v1/token?grant_type=pkce   (network round trip, 200–1500 ms)
              ├─ success → session saved, `code` stripped from the URL, SIGNED_IN
              └─ failure → error SWALLOWED, `code` LEFT IN THE URL  ◄── the bug
```

## Why failures were invisible

`GoTrueClient._initialize()` (see
`node_modules/@supabase/auth-js/dist/main/GoTrueClient.js`) returns
`{ error }` when the PKCE exchange fails — but `getSession()` awaits the same
internal promise and then simply **reads storage**, reporting
`{ session: null, error: null }`. The reason is discarded.

Worse, `_isPKCECallback()` only matches when a code verifier is still present
in `localStorage`. Once the verifier is gone (consumed, cleared, or the
callback link was opened in a different browser), the `?code=` is treated as
an ordinary URL, **never stripped**, and the visitor is pinned to the
signed-out screen. Every refresh replays the same dead code. That is the
"recurring sign-in bug".

`AuthContext` now:

1. awaits `supabase.auth.initialize()` to recover the swallowed error,
2. snapshots the callback params **before** anything strips them,
3. renders them through `describeAuthCallbackError()` as a real message,
4. always removes `code` / `error` / `error_description` / tokens from the URL
   via `navigate(..., { replace: true })`, so a refresh recovers,
5. clears `loading` on the error path and via a watchdog, so the UI can never
   hang on "Checking your session…".

## Deployment checklist (the non-code half of the fix)

Supabase silently substitutes the configured **Site URL** when `redirectTo` is
not allowlisted — `signInWithOAuth()` still returns **no error**, so this looks
exactly like a code bug. In Supabase → Authentication → URL Configuration set:

- **Site URL**: `https://programmer-hub-orcin.vercel.app`
- **Redirect URLs**: at minimum
  - `https://programmer-hub-orcin.vercel.app/**`
  - `http://localhost:5173/**` (dev)
  - `http://localhost:4173/**` (`vite preview`)
  - every Vercel **Preview** deployment origin you intend to sign in from,
    or `https://*-<your-scope>.vercel.app/**`

And in Google Cloud Console → APIs & Credentials → OAuth client, the
**Authorized redirect URI** must be
`https://<ref>.supabase.co/auth/v1/callback` — the Supabase URL, _not_ your
Vercel URL.

## `vercel.json` headers, and why

- **`/sw.js` → `no-cache, no-store, must-revalidate`.** The service worker is
  generated at build time with a precache list of the hashed bundle. If a
  browser or CDN holds an old `sw.js`, it keeps serving an old HTML shell and
  an old bundle — the classic "only a hard refresh fixes it" symptom, which is
  very easy to mistake for a broken auth state.
- **`/assets/*` → `immutable`, 1 year.** Vite fingerprints these filenames.
- **`Referrer-Policy: strict-origin-when-cross-origin`.** Keeps the one-time
  OAuth `?code=` out of `Referer` headers sent to third parties.
- **`Content-Security-Policy: upgrade-insecure-requests`.** Guards against an
  `http://` callback URL carrying a session in the clear. This is the only CSP
  directive set, deliberately: `index.html` contains an inline theme script and
  the page loads Google Fonts, so a restrictive `script-src` would break first
  paint. Extracting that inline script into a hashed file is the prerequisite
  for a real CSP — worth doing, but as its own change with its own testing.
- **`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
  `Permissions-Policy`.** Baseline hardening; nothing in the app is framed.

## Verifying a fix in production

```bash
# 1. The SPA fallback and the auth callback path both return the shell.
curl -sI https://programmer-hub-orcin.vercel.app/dashboard | grep -i 'HTTP/\|cache-control'

# 2. The service worker must never be cached.
curl -sI https://programmer-hub-orcin.vercel.app/sw.js | grep -i 'cache-control'

# 3. Security headers present.
curl -sI https://programmer-hub-orcin.vercel.app/ | grep -iE 'x-frame|referrer|nosniff'
```

Then, in the browser: sign in with Google, and confirm the address bar ends at
`/dashboard` with **no `?code=` and no `?error=`**. If sign-in fails you should
now see a red notice explaining why, rather than a silent signed-out screen.
