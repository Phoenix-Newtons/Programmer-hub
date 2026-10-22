# Website preview reverse proxy

Strips `X-Frame-Options` / CSP framing headers server-side so the hub's
project viewer can preview sites that refuse to be framed — with SSRF
guards, an allowlist, and a sandboxed-iframe contract.

## Run it locally

```bash
npm install
npm run proxy          # http://localhost:8787 — demo UI at /, API at /proxy?url=
```

Try the demo: open <http://localhost:8787/>, enter `https://example.com`,
or call it directly:

```bash
curl -i "http://localhost:8787/proxy?url=https://example.com"
```

The response has **no** `x-frame-options`, **no** upstream
`content-security-policy`, a `<base href="https://example.com/">` injected
into `<head>`, any `<meta http-equiv="Content-Security-Policy">` removed,
and the proxy's own `content-security-policy: frame-ancestors …` in their
place.

## How it works

| Piece                                                                       | File                                                                 |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Express endpoint, redirect re-validation, byte/time caps, rate limit        | `preview-proxy.mjs`                                                  |
| Pure, unit-tested guards: URL/SSRF checks, header stripping, HTML rewriting | `proxy-core.mjs`                                                     |
| Vanilla HTML/CSS/JS demo (sandboxed iframe, loading + error handling)       | `public/`                                                            |
| React integration (opt-in)                                                  | `proxiedPreviewUrl()` in `src/components/projects/ProjectViewer.jsx` |

Per request: parse + protocol-check the URL → allowlist check → DNS
resolution with private/loopback/metadata ranges rejected → fetch with a
realistic UA (no `Host`, cookies or auth forwarded) → manually follow
redirects, re-running the full gate on every hop → strip the framing
headers (+ `Clear-Site-Data`, `Set-Cookie`) → rewrite the HTML → respond
with the proxy's own framing policy.

## Headless-Chrome snapshots: `GET /api/preview?url=`

```bash
curl "http://localhost:8787/api/preview?url=https://example.com"
```

Renders the page in real Chromium (pooled browser, fresh page per
request, page closed in `finally`, concurrency-capped) and returns JSON:

```json
{
  "ok": true,
  "url": "…",
  "title": "…",
  "metadata": { "description": "…", "image": "…" },
  "screenshotBase64": "<png, base64>",
  "mimeType": "image/png"
}
```

Needs a browser binary — resolved in this order:

1. **Serverless (Vercel/Lambda/Netlify, auto-detected):**
   `@sparticuz/chromium-min` + `puppeteer-core`. At cold start the
   service downloads the version-matched pack
   (`chromium-v131.0.1-pack.tar` from the Sparticuz GitHub release, or
   your `CHROMIUM_PACK_URL` mirror) to `/tmp`, extracts it once per warm
   instance, and launches with `chromium.args` + `--no-sandbox`. The
   browser is closed after **every** capture — frozen function instances
   never hold ghost Chrome. This is the fix for the serverless
   "No Chrome/Chromium found" 502: there is no system Chrome on those
   platforms, and standard `puppeteer` (150 MB bundled Chromium) is the
   wrong package there.
2. **Local/container:** `PUPPETEER_EXECUTABLE_PATH` or a system Chrome
   via `puppeteer-core`; full `puppeteer` if you installed it.
3. Otherwise the endpoint answers `503 BROWSER_UNAVAILABLE` with setup
   instructions instead of a misleading 502.

On Vercel the endpoint also ships as a real function at
`api/preview.mjs`, with `vercel.json` giving it `maxDuration: 60` and
`memory: 1024` (25s navigation budget + cold-start pack download must
fit the limit with room to spare; raise memory before raising timeout —
Chromium wants ≥1 GB). The SPA rewrite explicitly excludes `/api/`.
For Heroku/Render-style hosts, prefer a Docker image with system
Chromium (`PUPPETEER_EXECUTABLE_PATH`) over the serverless pack: the
pack is built for Lambda-family images and expects their system
libraries (it will not run on a bare Debian box missing e.g. libnss3).

**Cloudflare-protected targets:** the service detects challenge
interstitials ("Just a moment…") and returns
`409 { "code": "CHALLENGE_DETECTED", "screenshotUrl": "<fallback>" }` —
it does not spoof fingerprints or evade bot protection. If the site is
**yours**, the supported routes are: a Cloudflare WAF/Bot allowlist rule
for the preview service's egress IP/ASN, previewing the origin or
staging URL (e.g. the `*.vercel.app` deployment URL), or the provider's
official API. A plain server fetch getting Cloudflare's 502/503
challenge page is Cloudflare refusing the client, not a bug in your
fetch — a different HTTP library will not change that.

Tuning: `PREVIEW_MAX_CONCURRENCY` (3), `PREVIEW_TIMEOUT_MS` (30000),
`PREVIEW_SETTLE_MS` (1500), `PREVIEW_BROWSER_PER_REQUEST=true` to launch
a fresh browser per capture.

## Wire it into the hub (optional)

```bash
# .env.local
VITE_PREVIEW_PROXY_URL=https://preview.yourdomain.example
```

Unset = demos load directly and the existing screenshot fallback covers
blocked sites.

## ⚠ Security checklist (do not skip)

1. **Separate origin.** Serve the proxy from its own subdomain, never the
   app origin — proxied scripts must not share your app's cookie/DOM
   context.
2. **Sandboxed iframe, no `allow-same-origin`.** `sandbox="allow-scripts
allow-forms allow-popups"` (see `public/index.html`). Proxied scripts
   then run in an opaque origin.
3. **Pin the allowlist in production:**
   `PROXY_ALLOWED_HOSTS=example.com,*.vercel.app,*.netlify.app,*.github.io`.
   An open framing proxy is a phishing/SSRF toolkit.
4. **`PROXY_ALLOW_PRIVATE=true` is local-dev only** (it lets you proxy
   `http://localhost:…` demos). Never set it in production.
5. Only GET/HEAD are proxied; upstream `Set-Cookie` is dropped; bodies are
   capped (`PROXY_MAX_BYTES`, default 5 MB) and timed out
   (`PROXY_TIMEOUT_MS`, default 10 s); framing of the output is limited to
   `PROXY_FRAME_ANCESTORS` instead of the open web.
6. Residual risks to accept consciously: DNS-rebinding TOCTOU between the
   check and the fetch (the allowlist is the real control), and the fact
   that you are re-serving third-party content — you are responsible for
   what your proxy displays.

## Environment

| Variable                | Default                       | Purpose                                    |
| ----------------------- | ----------------------------- | ------------------------------------------ |
| `PORT`                  | `8787`                        | Listen port                                |
| `PROXY_ALLOWED_HOSTS`   | _(any public host)_           | Comma list, `*.example.com` wildcards      |
| `PROXY_ALLOW_PRIVATE`   | `false`                       | Allow localhost/private targets (dev only) |
| `PROXY_FRAME_ANCESTORS` | `'self'` + local Vite origins | Who may frame the output                   |
| `PROXY_TIMEOUT_MS`      | `10000`                       | Upstream timeout                           |
| `PROXY_MAX_BYTES`       | `5242880`                     | Upstream body cap                          |
