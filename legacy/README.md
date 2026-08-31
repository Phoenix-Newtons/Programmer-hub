# Legacy (v1) — original vanilla build

This folder holds the **original static version** of Programmer's Hub: plain
`index.html`, `style.css` and a couple of module scripts talking to Supabase.

It is kept purely for reference. The app itself now lives in the Vite + React
project at the repository root:

```
src/            React 19 app (pages, components, hooks, context)
supabase/       schema.sql for the Postgres tables and RLS policies
index.html      Vite entry point
```

Nothing in this folder is bundled or served by Vite — see `optimizeDeps.entries`
and `build.rollupOptions.input` in `vite.config.js`.
