# Link Preview — frontend-only website snapshots

A self-contained static page (`index.html` + `script.js` + `style.css`,
no build step, no dependencies) that renders website screenshots through
[Microlink's](https://microlink.io) public API:

```
https://api.microlink.io/?url=<encodeURIComponent(target)>&screenshot=true&embed=screenshot.url
```

With `embed=screenshot.url`, Microlink returns the PNG itself, so a plain
`<img>` displays it — the browser does all the work and there is **no
backend at all**: no serverless function timeout, no Chromium download
("No Chrome/Chromium found"), no self-hosted proxy to 502.

## Deploy to Vercel (Git integration, ~1 minute)

1. Push this repo.
2. In Vercel: **Add New → Project**, import the repo.
3. Set **Root Directory** to `link-preview`.
4. Framework preset: **Other**. No build command, no output-directory
   override, **no `vercel.json` needed** — the folder is served as-is.
5. Deploy. Every later `git push` redeploys automatically.

It also works anywhere static files work (Netlify Drop, GitHub Pages,
Cloudflare Pages, S3): just serve this folder.

> Deploying the whole Programmer's Hub repo as one project instead? The
> hub's existing `vercel.json` SPA rewrite would swallow a static subpath
> page, so give this folder its own Vercel project per the steps above.

## How it behaves

- Input is normalised (`example.com` → `https://example.com/`); non-web
  schemes and host-less input are rejected with a friendly error.
- A spinner covers the preview stage while Microlink renders (first
  renders of a URL can take a few seconds; repeats are CDN-cached).
- `<img>` `onload`/`onerror` drive the UI — including the
  `naturalWidth === 0` case where an error image "loads". A 30s watchdog
  stops a hung request from spinning forever.
- Title/description come from Microlink's metadata JSON (best-effort
  decoration; the screenshot is the product).
- `?url=` in the address bar prefills and renders, so previews are
  shareable links.

## Free-tier limits

The public API is rate-limited per IP and is fine for demos and light
traffic. For production volume, grab a free Microlink API key and set
`MICROLINK_API_KEY` at the top of `script.js` (it's a publishable client
key — still zero backend). If you outgrow that, the metadata/screenshot
split in `script.js` is the seam where a paid provider drops in.
