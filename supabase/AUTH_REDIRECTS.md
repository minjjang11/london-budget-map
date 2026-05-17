# Supabase (dashboard) — OAuth redirect URLs

These cannot be edited from git; set them in the [Supabase Dashboard](https://supabase.com/dashboard).

## Authentication → URL configuration → Redirect URLs

Add (and keep any web URLs you already use):

- `maimomap://auth/callback` (Capacitor Android / iOS)
- `https://london-budget-map.vercel.app/auth/callback` (production web)
- `https://london-budget-map.vercel.app` (site URL / magic links if used)
- `http://localhost:3000/auth/callback` (local web dev, if you test OAuth locally)

Remove obsolete schemes if you no longer ship them:

- `com.maimo.app://auth/callback`
- `com.mappetite.app://auth/callback` (legacy)

## Site URL (Supabase)

Set **Site URL** to your primary web origin, e.g. `https://london-budget-map.vercel.app`.

If you use a custom production domain, also add:

- `https://YOUR_DOMAIN/auth/callback`
- `https://YOUR_DOMAIN`

## Google Cloud OAuth client (Web)

**Authorized redirect URIs** must include your Supabase project callback:

- `https://<project-ref>.supabase.co/auth/v1/callback`

## Google Cloud OAuth (Android / iOS native, if configured)

Package / bundle ID remains **`com.maimo.app`**. Custom URL scheme for the app return is **`maimomap`** (`maimomap://auth/callback`).

## Email templates

Dashboard → Authentication → Email: paste HTML from `email_templates/magic_link_supabase_dashboard.html` if you use that template.
