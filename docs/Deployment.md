# Deploying RoomSync

This document outlines how to deploy RoomSync to production using Vercel (for the backend/frontend) and Railway (for the database).

## Architecture

*   **Frontend/Backend:** Vercel (Serverless Node.js Express)
*   **Database:** Railway MySQL (or any cloud MySQL provider)
*   **Authentication:** Signed, httpOnly cookie sessions compatible with serverless invocations

**Important:** SQLite will *not* work for a production Vercel deployment. Vercel functions are ephemeral, meaning the local `roomsync.db` file will be lost frequently. You must use a remote MySQL database.

## 1. Set up MySQL Database (Railway)

1.  Go to [Railway.app](https://railway.app/).
2.  Click **New Project** > **Provision MySQL**.
3.  Click on the newly created MySQL service and go to the **Connect** tab.
4.  Copy the **MySQL Connection URL** (it should look like `mysql://root:password@host:port/railway`).

## 2. Initialize the Database Schema

The application can initialize missing MySQL tables on its first database connection. You may also initialize the schema manually before deploying:

1.  Open your preferred MySQL client (like DBeaver, TablePlus, or the Railway web UI query tool).
2.  Connect using the Railway credentials.
3.  Copy the contents of `database/schema_mysql.sql` and execute it in your MySQL client to create the necessary tables. This is optional when automatic schema initialization is permitted.
4.  Do not run `database/seed.sql` against MySQL; it uses SQLite date functions and is intended for local development only. Production should normally start with an empty database.

**Note:** Ensure you use `database/schema_mysql.sql` for deployment, as `database/schema.sql` uses SQLite-specific syntax (like `AUTOINCREMENT`) which will fail on MySQL.

## 3. Configure Vercel

1.  Push your RoomSync code to a GitHub repository.
2.  Log in to [Vercel](https://vercel.com/) and click **Add New Project**.
3.  Import the GitHub repository `Ankitj9568/RoomSync` (or your fork).
4.  In the **Environment Variables** section, add the following:
    *   `DATABASE_URL`: The MySQL connection URL you copied from Railway.
    *   `SESSION_SECRET`: A long random string used for signing cookies.
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
3.  Because you set `DATABASE_URL`, `config/db.js` connects to MySQL instead of trying to create a local SQLite file.

You are now ready to use RoomSync!
