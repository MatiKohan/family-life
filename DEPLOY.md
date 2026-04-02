# Production Deployment Guide

## Prerequisites

- Railway account — [railway.app](https://railway.app)
- Vercel account — [vercel.com](https://vercel.com)
- Google Cloud Console access (for OAuth credentials)
- Repo pushed to GitHub

---

## Step 1 — Railway: deploy API + PostgreSQL + Redis

1. Go to [railway.app](https://railway.app) → **New Project → Deploy from GitHub repo**
2. Select the `family-life` repo
3. Railway creates a service — configure it:
   - **Root Directory**: `apps/api`
   - **Dockerfile Path**: `apps/api/Dockerfile`
4. Add a **PostgreSQL** add-on: click **+ New** → **Database → PostgreSQL**
   - `DATABASE_URL` is injected automatically
5. Add a **Redis** add-on: click **+ New** → **Database → Redis**
   - `REDIS_URL` is injected automatically
6. In the API service → **Variables**, add:
   ```
   NODE_ENV=production
   JWT_SECRET=<random string, 32+ chars>
   JWT_REFRESH_SECRET=<random string, 32+ chars — different from JWT_SECRET>
   GOOGLE_CLIENT_ID=<from Google Cloud Console>
   GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
   GOOGLE_CALLBACK_URL=https://<your-api>.up.railway.app/api/auth/google/callback
   WEB_URL=https://<your-app>.vercel.app
   ```
   > WhatsApp (Phase 4 — add when ready):
   > ```
   > TWILIO_ACCOUNT_SID=
   > TWILIO_AUTH_TOKEN=
   > TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
   > ```
7. Click **Deploy** — Railway builds the Dockerfile and starts the container
8. Prisma migrations run automatically on start (`prisma migrate deploy && node dist/main`)
9. Note your API URL: `https://<your-api>.up.railway.app`

> **Generate secrets**: run `openssl rand -base64 32` twice for `JWT_SECRET` and `JWT_REFRESH_SECRET`

---

## Step 2 — Google OAuth: add production callback URL

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → your project → **APIs & Services → Credentials**
2. Edit your OAuth 2.0 Client ID
3. Add to **Authorised redirect URIs**:
   ```
   https://<your-api>.up.railway.app/api/auth/google/callback
   ```
4. Add to **Authorised JavaScript origins**:
   ```
   https://<your-app>.vercel.app
   ```

---

## Step 3 — Vercel: deploy frontend

1. Go to [vercel.com](https://vercel.com) → **Add New Project → Import Git Repository**
2. Select the `family-life` repo
3. Configure:
   - **Root Directory**: `apps/web`
   - **Framework Preset**: Vite (auto-detected)
4. Add environment variable:
   ```
   VITE_API_URL=https://<your-api>.up.railway.app
   ```
5. Click **Deploy**
6. Note your Vercel URL: `https://<your-app>.vercel.app`

---

## Step 4 — Finalize environment variables

Go back to Railway and update:
```
WEB_URL=https://<your-app>.vercel.app   ← set the actual Vercel URL
GOOGLE_CALLBACK_URL=https://<your-api>.up.railway.app/api/auth/google/callback
```

Then **redeploy** the Railway service.

---

## Step 5 — Smoke test

- [ ] Open the Vercel URL — app loads, shows login page in English
- [ ] Switch language to Hebrew — UI flips to RTL
- [ ] Register a new account — redirected to "Create a Family"
- [ ] Create a family (pick emoji + name) — lands on family home with sidebar
- [ ] Create a **List** page (e.g. 🛒 Grocery) — add a few items, check one off
- [ ] Create a **Tasks** page — add a task, cycle its status (Todo → In Progress → Done)
- [ ] Click **Calendar** in sidebar — monthly grid loads
- [ ] Create a calendar event — pill appears on the correct day
- [ ] Create an **Events** page — link the calendar event, confirm it appears in the timeline
- [ ] Copy invite link — open in incognito, register second user, confirm they join the family
- [ ] Sign in with Google — OAuth flow completes, session active

---

## Cost estimate (family use)

| Service | Plan | Cost |
|---|---|---|
| Railway API + PostgreSQL + Redis | Free credit | ~$0–2/month |
| Vercel frontend | Hobby | Free |
| **Total** | | **~$0/month** |

Railway gives $5 free credit/month. At personal/family usage the app runs within that budget.
