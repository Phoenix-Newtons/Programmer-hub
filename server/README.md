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
