# RoomSync — Shared Living, Without the Awkward Money Talks

## 🚀 Try it now — no setup needed

**Live App:** [https://room-sync-kappa.vercel.app/](https://room-sync-kappa.vercel.app/)

Just open the link, create an account as a **Roommate**, **PG Owner**, or **Staff**, and you are in. Nothing to install, no configuration. (The setup docs below are only for developers running their own instance.)

> RoomSync runs shared households end to end: PG owners allot rooms, assign cooks/maids/watchmen their daily tasks, and track monthly rent collection — while roommates split groceries and expenses, plan meals, and settle up with the fewest possible payments.

---

## Who is it for

| | What they get |
|---|---|
| **Roommates & flatmates** | Split groceries, expenses, and loans; plan daily meals; settle debts with one UPI/cash log instead of mental math. |
| **PG / flat owners** | Allot rooms, provision staff accounts, assign daily chores, set monthly rent and bill day, and watch dues and collection roll in — behind mandatory two-step login. |
| **Staff (cook, maid, watchman)** | A dead-simple home: today's tasks, meal headcounts, one-tap "Done". No financial noise, no clutter. |

## Use cases & why each wins

- **A 10-friend flat splitting ₹10,000** — Create a *Friends* group, log everything once, and the settlement engine collapses dozens of IOUs into a handful of payments. *Pro: no spreadsheets, no forgotten debts, no fights.*
- **Running a 30-bed PG** — Create a *PG* group (you become the owner), allot `Room 101`-style beds, provision the cook and cleaner with one-time passwords, assign daily cooking/cleaning rounds, set rent + bill day, and track who paid. *Pro: the whole PG operation — rooms, staff, tasks, money — in one place.*
- **A rented flat with a landlord** — *Flat* group: members run daily chores and pick their own help, while only the owner controls rent and billing. *Pro: responsibilities match real life instead of one-size-fits-all admin rights.*
- **Joining in seconds** — Every group has a unique QR. Scan it from the inbuilt camera scanner (or upload a screenshot): open groups ask Join/Cancel, approval groups send a request to the admin. *Pro: onboarding that actually works for non-technical staff.*
- **Cooks buying vegetables** — Staff log grocery purchases and get credited in settlements without ever being charged a share. *Pro: fair money math that respects real roles.*

---

## Features

- **Light & Dark Theme Support**: System-preference detection with a manual toggle and seamless FOUC (Flash of Unstyled Content) prevention.
- **Grocery Management**: Track purchases, assign members to shopping lists, and automatically split costs.
- **Meal Planning**: Daily lunch and dinner intimation with dietary categorization (Veg, Non-Veg, Egg).
- **Expense & Settlements**: 
  - Record shared expenses with equal or custom splitting.
  - Track cash and UPI payments with an undo capability.
  - Automated settlement calculation using a greedy algorithm to minimize transactions.
- **Visual Analytics**: Monthly spending dashboards powered by Chart.js.
- **Group Administration**: 
  - Multi-group support allowing users to be part of multiple households.
  - Role-based permissions (Owner, Admin, Member, Staff). Owners manage like
    admins; staff (chef, maid, caretaker) use meals, groceries, and shopping
    lists but are excluded from financials.
- **Household Tasks**: Owners assign chores (cooking, cleaning, laundry, grocery runs, maintenance, security) to staff or members; assignees mark them done. In flats and friends groups, members can raise tasks too; PG tasking stays with the owner.
- **Group Types**: PG (owner-run, room allotment, monthly billing), Flat (self-managed members, owner billing), and Friends (pure equal sharing).
- **Owner Oversight**: PG/flat owners get a dedicated home with occupancy, rent collection, dues owed to them, and task status — roommate-shared money stays between roommates.
- **QR Join**: Every group has a unique QR; the inbuilt camera scanner opens the group page and offers Join/Cancel or an approval request.
- **Owner MFA**: Owners must enroll a TOTP authenticator second factor; staff accounts can be provisioned by owners with a one-time temporary password.
  - Invite links and scannable QR codes for easy onboarding.
  - Configurable joining workflows (Direct Join vs Admin Approval for pending requests).
- **Modern & Responsive UI**: Sleek landing page with animated horizontal sliders, glassmorphism design, and a fully mobile-optimized interface.
- **Robust Testing**: Comprehensive testing suite built with Jest & Supertest to ensure the integrity of expense logic and settlement algorithms.
- **Mobile E2E Smoke Test**: Playwright verifies registration-to-dashboard on a mobile viewport (`npm run test:e2e` with the server running).

---

## Technology Stack

| Layer | Technology |
|--------|------------|
| **Frontend** | HTML5, CSS3, Bootstrap 5, Vanilla JavaScript |
| **Backend** | Node.js, Express.js |
| **Database** | PostgreSQL through Prisma |
| **Authentication** | Signed cookie sessions, password login, and Google OAuth |
| **Charts** | Chart.js |
| **Deployment** | Vercel & Supabase |

---

## Project Structure

```text
roomsync/
├── frontend/            # Static UI served by Express
│   ├── css/
│   ├── js/
│   ├── pages/
│   └── index.html
├── backend/             # Node.js + Express API
│   ├── server.js        # Entry point (serves frontend/ + mounts /api/*)
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   └── utils/
├── database/            # Prisma schema + migrations, legacy SQL reference
│   └── prisma/
├── tests/               # Jest unit/integration + Playwright e2e
├── scripts/
├── package.json
├── vercel.json
└── README.md
```

---

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
