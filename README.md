# Programmer's Hub

A responsive developer marketplace built with HTML, CSS, JavaScript, and Supabase.

## Files
- `index.html` — homepage with developer search, auth, WhatsApp, email
- `dashboard.html` — profile editor for signed-in users
- `login.html` — simple auth page
- `profile.html` — public profile viewer
- `css/style.css` — shared styling
- `js/app.js` — shared helpers
- `js/dashboard.js` — dashboard logic
- `supabase/schema.sql` — database schema

## Supabase
Project URL:
https://ggfukwknodeqwnitkjvk.supabase.co

Anon key is already wired in the files.

### Tables / storage
1. Run `supabase/schema.sql`
2. Create a storage bucket named `avatars`
3. Make sure your RLS policies allow:
   - public profile reads
   - users can insert/update only their own profile

## Run locally
Open `index.html` in a local server, or deploy the folder to Vercel / Netlify / GitHub Pages.
