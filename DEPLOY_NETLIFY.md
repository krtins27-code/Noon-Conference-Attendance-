# Deploying to Netlify (get a shareable link)

This deploys everything — the React PWA and the API — to one Netlify site, so
you get a single URL that works in any mobile browser on iOS and Android (no
app store needed). The frontend is served as a static site; the API runs as a
Netlify Function at `/api/*`.

Data is stored in **Netlify Blobs**, which is built into every Netlify site —
there's no separate database account to create. The only account you need is
Netlify itself.

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

## 2. Create a Netlify site

1. Go to https://app.netlify.com and sign up / log in.
2. **Add new site → Import an existing project** → connect GitHub → pick this repo.
3. Build settings should auto-fill from `netlify.toml`. If asked, confirm:
   - Base directory: `web`
   - Build command: `npm run build`
   - Publish directory: `dist`

## 3. Set environment variables in Netlify

In the Netlify site → **Site configuration → Environment variables**, add:

| Variable | Value |
|---|---|
| `ORGANIZER_PASSCODE` | a passcode of your choosing |
| `TIME_ZONE` | `America/New_York` |

You do **not** need to set `VITE_API_URL` — the frontend defaults to the
relative path `/api`, which Netlify redirects to the function on the same
domain. You also don't need any database variables — Netlify Blobs works
automatically once deployed on Netlify.

## 4. Deploy

Trigger a deploy (Netlify does this automatically on every push to `main`, or
click **Trigger deploy** in the dashboard). Once it finishes, Netlify gives you
a URL like `https://your-site-name.netlify.app` — that's the shareable link.

Optionally rename it: **Site configuration → Change site name**, or attach a
custom domain you own under **Domain management**.

## 5. Share it

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
- **Check-ins or codes seem to reset**: Netlify Blobs is scoped per site —
  if you're testing against a different Netlify site/deploy preview than you
  expect, data won't carry over between them. Production deploys on the same
  site share the same blob store.
