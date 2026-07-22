# RoomSync

> **A shared living management platform for roommates, hostel students, PG residents, and shared apartments.**

RoomSync is a lightweight web application that helps people living together manage everyday household activities such as grocery purchases, shopping responsibilities, meal attendance, shared expenses, payments, settlements, and spending analytics—all from a single platform.

---

## Features

- Grocery purchase tracking
- Shared shopping list with member assignment
- Daily lunch & dinner meal intimation
- Shared expense management
- Equal & custom expense splitting
- Cash & UPI payment recording
- Manual balance adjustments
- Automated settlement calculation
- Monthly spending analytics & visual dashboards
- Dietary meal categorization (Veg, Non-Veg, Egg)
- Upcoming bills & budget tracking
- Multi-group household support

---

## Technology Stack

| Layer | Technology |
|--------|------------|
| **Frontend** | HTML5, CSS3, Bootstrap 5, Vanilla JavaScript |
| **Backend** | Node.js, Express.js |
| **Database** | SQLite (Local Development) / MySQL (Production) |
| **Authentication** | Express Session + bcrypt |
| **Charts** | Chart.js |
| **Deployment** | Vercel & Railway |

---

## Project Structure

```text
roomsync/
├── config/
├── controllers/
├── database/
├── middleware/
├── models/
├── public/
│   ├── css/
│   ├── js/
│   └── pages/
├── routes/
├── utils/
├── docs/
├── package.json
├── server.js
├── vercel.json
└── README.md
```

---

## Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/<your-username>/roomsync.git
cd roomsync
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run the Application Locally

By default, RoomSync uses a local **SQLite** database for development. You do not need to configure any external database to run it locally. It will auto-migrate and seed `database/roomsync.db` on the first run.

```bash
npm start
```

Once the server starts, open `http://localhost:3000` in your browser.

---

## Production Deployment (Vercel + MySQL)

For deploying to production (like Vercel), SQLite cannot be used due to serverless ephemeral filesystems. RoomSync supports automatically switching to MySQL if a `DATABASE_URL` is provided.

1. Set up a MySQL database (e.g., using Railway or PlanetScale).
2. Set the following environment variables in your Vercel project:
   - `DATABASE_URL`: Your full MySQL connection string.
   - `SESSION_SECRET`: A secure random string for signing cookies.
3. Deploy! RoomSync includes a `vercel.json` file ready for zero-config Vercel deployment.

> For detailed deployment instructions, see [docs/Deployment.md](docs/Deployment.md).

---

## REST API

RoomSync exposes a RESTful API for managing all shared household activities.

### Available Modules

| Module | Endpoint |
|----------|-----------|
| Authentication | `/api/auth/*` |
| Users | `/api/users/*` |
| Groups | `/api/groups/*` |
| Group Settings | `/api/groups/:id/settings` |
| Groceries | `/api/groceries` |
| Shopping List | `/api/shopping-list` |
| Meals | `/api/meals` |
| Expenses | `/api/expenses` |
| Payments | `/api/payments` |
| Adjustments | `/api/adjustments` |
| Dashboard | `/api/dashboard` |
| Settlements | `/api/settlements` |
| Analytics | `/api/analytics` |

---