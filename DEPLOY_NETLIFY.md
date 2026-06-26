# Deploying to Netlify (get a shareable link)

This deploys everything — the React PWA and the API — to one Netlify site, so
you get a single URL that works in any mobile browser on iOS and Android (no
app store needed). The frontend is served as a static site; the API runs as a
Netlify Function at `/api/*`.

Because Netlify Functions don't have a persistent local disk, the database
moved from a local SQLite file to **Turso** — a hosted database that speaks
the same SQL as SQLite, so none of the app logic changed. Locally, the app
still uses a plain SQLite file with no account needed.

I can't create these accounts or tokens for you — they're tied to your email
and billing, so you'll need to do the sign-ups below yourself (all free tiers
are sufficient for this app). Everything else (code, config) is already done.

## 1. Push this project to GitHub

Netlify deploys from a git repo.

```bash
cd ~/noon-conference-attendance
git init
git add .
git commit -m "Initial commit"
```

Create an empty repo on GitHub, then:

```bash
git remote add origin <your-repo-url>
git branch -M main
git push -u origin main
```

## 2. Create a Turso database (free)

1. Go to https://turso.tech and sign up.
2. Install the CLI and log in (or use the Turso web dashboard's "Create
   Database" button instead, if you'd rather not install anything):
   ```bash
   curl -sSfL https://get.tur.so/install.sh | bash
   turso auth login
   ```
3. Create a database and grab its URL + a token:
   ```bash
   turso db create noon-conference
   turso db show noon-conference --url
   turso db tokens create noon-conference
   ```
4. Keep the URL (`libsql://...`) and the token handy for step 4.

## 3. Create a Netlify site

1. Go to https://app.netlify.com and sign up / log in.
2. **Add new site → Import an existing project** → connect GitHub → pick this repo.
3. Build settings should auto-fill from `netlify.toml` (base `web`, publish
   `web/dist`, functions in `netlify/functions`). If asked, confirm:
   - Base directory: `web`
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Don't deploy yet — set environment variables first (next step), or deploy
   once and then add the variables and trigger a redeploy.

## 4. Set environment variables in Netlify

In the Netlify site → **Site configuration → Environment variables**, add:

| Variable | Value |
|---|---|
| `TURSO_DATABASE_URL` | the `libsql://...` URL from step 2 |
| `TURSO_AUTH_TOKEN` | the token from step 2 |
| `ORGANIZER_PASSCODE` | a passcode of your choosing |
| `TIME_ZONE` | `America/New_York` |

You do **not** need to set `VITE_API_URL` — the frontend defaults to the
relative path `/api`, which Netlify redirects to the function on the same domain.

## 5. Deploy

Trigger a deploy (Netlify does this automatically on every push to `main`, or
click **Trigger deploy** in the dashboard). Once it finishes, Netlify gives you
a URL like `https://your-site-name.netlify.app` — that's the shareable link.

Optionally rename it: **Site configuration → Change site name**, or attach a
custom domain you own under **Domain management**.

## 6. Share it

Send residents the Netlify URL. On their phone:
- **iOS (Safari)**: open the link → Share → "Add to Home Screen."
- **Android (Chrome)**: open the link → menu (⋮) → "Add to Home screen" / "Install app."

That gives everyone a home-screen icon that opens straight to the check-in screen.

## Troubleshooting

- **CORS errors**: shouldn't happen since frontend and API share a domain in
  production. If you see them, double check `netlify.toml`'s redirect for
  `/api/*` is in effect (check the Netlify deploy log).
- **"Invalid or missing organizer passcode"**: confirm `ORGANIZER_PASSCODE` is
  set in Netlify's environment variables and you redeployed after setting it.
