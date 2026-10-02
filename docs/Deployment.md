# Deploying RoomSync

This document outlines how to deploy RoomSync to production using Vercel (for the backend/frontend) and Supabase PostgreSQL (for the database).

## Architecture

*   **Frontend/Backend:** Vercel (Serverless Node.js Express)
*   **Database:** Supabase PostgreSQL through Prisma
*   **Authentication:** Signed, httpOnly cookie sessions compatible with serverless invocations

**Important:** RoomSync uses PostgreSQL through Prisma in both local development and production. Vercel uses the remote Supabase database.

## 1. Set up PostgreSQL Database (Supabase)

1. Go to [Supabase](https://supabase.com/) and create a project.
2. Open **Project Settings → Database**.
3. Copy the pooled connection string for `DATABASE_URL`.
4. Copy the direct connection string for `DIRECT_URL`.

## 2. Initialize the Database Schema with Prisma

Prisma owns the PostgreSQL schema through checked-in migrations:

1. Install dependencies with `npm install`.
2. Set `DATABASE_URL` and `DIRECT_URL` in your local environment.
3. Run `npx prisma migrate deploy`.
4. For the existing MySQL deployment, also set `MYSQL_DATABASE_URL` and run `npm run db:migrate:mysql-to-postgres`.

The Vercel build only runs `prisma generate`. Run database migrations separately
from a trusted environment before deploying; this prevents a temporary database
network issue from blocking the application deployment.

The Vercel function region is configured as `icn1` (Seoul), close to the
Supabase `ap-northeast-2` project region. Keep `DATABASE_URL` on the pooled
6543 endpoint with `pgbouncer=true&connection_limit=1` for serverless runtime
connections; use `DIRECT_URL` on port 5432 only for Prisma migrations.

**Note:** Do not execute the legacy `database/schema_mysql.sql` for the new deployment. Use the Prisma migration in `prisma/migrations/`.

## 3. Configure Vercel

1.  Push your RoomSync code to a GitHub repository.
2.  Log in to [Vercel](https://vercel.com/) and click **Add New Project**.
3.  Import the GitHub repository `Ankitj9568/RoomSync` (or your fork).
4.  In the **Environment Variables** section, add the following:
     *   `DATABASE_URL`: The Supabase pooled PostgreSQL connection URL.
     *   `DIRECT_URL`: The Supabase direct PostgreSQL connection URL.
     *   `SESSION_SECRET`: A long random string used for signing cookies.
     *   `NODE_ENV`: `production`.
     *   `GOOGLE_CLIENT_ID`: Google OAuth client ID.
     *   `GOOGLE_CLIENT_SECRET`: Google OAuth client secret.
     *   `GOOGLE_CALLBACK_URL`: `https://your-domain.vercel.app/api/auth/google/callback`.
    *   `NODE_ENV`: `production`

## 4. `vercel.json` Configuration

The repository already contains `vercel.json`; it sends API and page requests to the Express server, which serves both the static frontend and API.

```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/server.js"
    },
    {
      "source": "/(.*)",
      "destination": "/server.js"
    }
  ]
}
```

## 5. Deploy!

1.  Click **Deploy** on Vercel.
2.  Once deployed, Vercel will provide a URL (e.g., `roomsync.vercel.app`).
3.  Because you set `DATABASE_URL`, Prisma connects to PostgreSQL.

You are now ready to use RoomSync!

## 6. Configure Google OAuth

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a project and configure the OAuth consent screen.
3. Create an **OAuth client ID** for a web application.
4. Add this authorized redirect URI:

```text
https://your-domain.vercel.app/api/auth/google/callback
```

5. Add the generated client ID and secret to Vercel as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
6. Set `GOOGLE_CALLBACK_URL` to the same redirect URI and redeploy.

RoomSync keeps its existing signed cookie session after Google authenticates. OAuth accounts are linked by provider account ID and verified email.
