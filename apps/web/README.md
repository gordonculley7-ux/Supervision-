# Web edition (Railway)

Next.js + Postgres (Prisma) + Auth.js. Reuses the shared `@supervision-tracker/core`
rules engine, so hour/CEU calculations are identical to the Lite app.

## What works in this foundation
- Email/password accounts (Auth.js, self-hosted, bcrypt-hashed).
- Credential setup (profession / state / route).
- Online logging of practice hours, supervision, and CEUs (stored in Postgres).
- Live progress vs. the board requirements, computed by the shared core.
- Per-user data isolation (every query scoped to the signed-in user).

## Not yet built (later increments)
- Trainee↔supervisor linking, e-signature sign-off, calendar sync.
- Stripe subscription billing.
- Encrypted-backup import (Lite→Web migration) — the core supports it; UI pending.

## Local development
```
# from repo root
npm install
# start a Postgres and set apps/web/.env (see .env.example)
cd apps/web
npx prisma db push                   # creates tables from schema.prisma
npm run dev                          # http://localhost:3000
```

## Deploy to Railway
1. Create a Railway project and add a **PostgreSQL** plugin (sets DATABASE_URL).
2. Add service variables: `AUTH_SECRET` (`openssl rand -base64 32`) and `AUTH_URL` (your public URL).
3. Deploy this repo. The included `Dockerfile` / `railway.json` builds `apps/web`,
   runs `prisma migrate deploy`, and starts the Next.js standalone server.

## HIPAA note
Designed PHI-free (no client identifiers). Obtain a Railway BAA before storing any PHI.
