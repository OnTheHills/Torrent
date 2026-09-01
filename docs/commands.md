# Commands

## Setup & auth

### Log in to Vercel CLI

From `frontend/`. Run this if `npx vercel --prod` says `Not authorized`.

```bash
cd frontend
npx vercel login
```

Opens a browser. Use the same Vercel account that owns **wafers-projects / torrent**.

## Deploy

### Deploy frontend to Vercel

From `frontend/`. Uploads local files — no GitHub push.

```bash
cd frontend
npx vercel --prod
```

Updates the live site: https://torrent-ten.vercel.app

Preview only (does not update production):

```bash
cd frontend
npx vercel
```
