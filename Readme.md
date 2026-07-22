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
- Monthly spending analytics & dashboards
- Multi-group household support

---

## Technology Stack

| Layer | Technology |
|--------|------------|
| **Frontend** | HTML5, CSS3, Bootstrap 5, Vanilla JavaScript |
| **Backend** | Node.js, Express.js |
| **Database** | MySQL |
| **Authentication** | Express Session + bcrypt |
| **Charts** | Chart.js |

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
├── .env.example
├── package.json
├── server.js
└── README.md
```

---

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/<your-username>/roomsync.git
cd roomsync
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the project root.

```bash
cp .env.example .env
```

Update the values:

```env
DB_HOST=localhost
DB_USER=root
DB_PASS=yourpassword
DB_NAME=roomsync
SESSION_SECRET=your_secret_key
PORT=3000
```

---

## Database Setup

Create the database schema.

```bash
mysql -u root -p < database/schema.sql
```

(Optional) Load sample data.

```bash
mysql -u root -p < database/seed.sql
```

---

## Running the Project

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

Once the server starts, open:

```text
http://localhost:3000
```

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