# Deploying RoomSync

This document outlines how to deploy RoomSync to production using Vercel (for the backend/frontend) and Railway (for the database).

## Architecture

*   **Frontend/Backend:** Vercel (Serverless Node.js Express)
*   **Database:** Railway MySQL (or any cloud MySQL provider)

**Important:** SQLite will *not* work for a production Vercel deployment. Vercel functions are ephemeral, meaning the local `roomsync.db` file will be lost frequently. You must use a remote MySQL database.

## 1. Set up MySQL Database (Railway)

1.  Go to [Railway.app](https://railway.app/).
2.  Click **New Project** > **Provision MySQL**.
3.  Click on the newly created MySQL service and go to the **Connect** tab.
4.  Copy the **MySQL Connection URL** (it should look like `mysql://root:password@host:port/railway`).

## 2. Initialize the Database Schema

Since Vercel functions cannot run raw SQL seed files easily during startup (due to the serverless nature and no shell access), you should initialize the MySQL database locally or via an external tool before deploying:

1.  Open your preferred MySQL client (like DBeaver, TablePlus, or the Railway web UI query tool).
2.  Connect using the Railway credentials.
3.  Copy the contents of `database/schema_mysql.sql` and execute it in your MySQL client to create the necessary tables.
4.  *(Optional)* Execute `database/seed.sql` if you want some test data, but usually you want a clean database for production.

**Note:** Ensure you use `database/schema_mysql.sql` for deployment, as `database/schema.sql` uses SQLite-specific syntax (like `AUTOINCREMENT`) which will fail on MySQL.

## 3. Configure Vercel

1.  Push your RoomSync code to a GitHub repository.
2.  Log in to [Vercel](https://vercel.com/) and click **Add New Project**.
3.  Import your GitHub repository.
4.  In the **Environment Variables** section, add the following:
    *   `DATABASE_URL`: The MySQL connection URL you copied from Railway.
    *   `SESSION_SECRET`: A random string used for signing cookies (e.g., `super_secret_string_xyz123`).
    *   `NODE_ENV`: `production`

## 4. `vercel.json` Configuration

Ensure you have a `vercel.json` file in the root of your project. This tells Vercel how to handle the Express routes and static files.

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
      "destination": "/public/$1"
    }
  ]
}
```

## 5. Deploy!

1.  Click **Deploy** on Vercel.
2.  Once deployed, Vercel will provide a URL (e.g., `roomsync.vercel.app`).
3.  Because you set `DATABASE_URL`, the `config/db.js` file will automatically connect to your MySQL database instead of trying to create a local SQLite file.

You are now ready to use RoomSync!
