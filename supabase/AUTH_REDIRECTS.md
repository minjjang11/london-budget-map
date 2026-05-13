# Supabase (dashboard) — after native bundle ID change

These cannot be edited from git; set them in the [Supabase Dashboard](https://supabase.com/dashboard).

## Authentication → URL configuration → Redirect URLs

Add (and keep any web URLs you already use):

- `com.maimo.app://auth/callback`

Remove the old scheme if you no longer ship it:

- `com.mappetite.app://auth/callback` (legacy)

## Google Cloud OAuth client (Web)

If you use Google sign-in with Supabase, the OAuth client’s **Authorized redirect URIs** must still include your project’s HTTPS callback, e.g.:

- `https://<project-ref>.supabase.co/auth/v1/callback`

## Google Cloud OAuth (Android / iOS native, if configured)

Update **package name / bundle ID** and any **custom scheme** entries to match **`com.maimo.app`** and your new redirect URI above.

## Email templates

Dashboard → Authentication → Email: paste HTML from `email_templates/magic_link_supabase_dashboard.html` if you use that template.
