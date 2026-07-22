# 📄 TRD.md — Technical Requirements Document

## 1. Overall Architecture

RoomSync follows a **3-tier monolithic MVC architecture** — simple, beginner-friendly, and appropriate for a college-scale full-stack project.

```
┌─────────────────────────────────────────────┐
│  Presentation Layer (Client)                 │
│  HTML5 + CSS3 + Bootstrap 5 + Vanilla JS      │
│  (Static pages served by Express)             │
└───────────────────┬───────────────────────────┘
                    │  Fetch API (JSON over HTTP)
┌───────────────────▼───────────────────────────┐
│  Application Layer (Server)                   │
│  Node.js + Express.js                         │
│  Routes → Controllers → Models                │
└───────────────────┬───────────────────────────┘
                    │  mysql2 (parameterized queries)
┌───────────────────▼───────────────────────────┐
│  Data Layer                                   │
│  MySQL (normalized relational schema)         │
└─────────────────────────────────────────────────┘
```

**Architectural pattern:** MVC (Model–View–Controller), with "View" being static HTML pages progressively enhanced via JS calling REST APIs (a lightweight SPA-like feel without a frontend framework).

**Request lifecycle:**
`Browser → Express Route → Middleware (auth/validation) → Controller → Model (SQL) → MySQL → Controller → JSON Response → JS Fetch → DOM Update`

---

## 2. Folder Structure

```
roomsync/
├── config/
│   └── db.js                  # MySQL connection pool
├── controllers/
│   ├── authController.js
│   ├── groupController.js
│   ├── groceryController.js
│   ├── shoppingListController.js
│   ├── mealController.js
│   ├── expenseController.js
│   ├── paymentController.js
│   ├── adjustmentController.js
│   ├── analyticsController.js
│   ├── dashboardController.js
│   └── userController.js
├── models/
│   ├── userModel.js
│   ├── groupModel.js
│   ├── groceryModel.js
│   ├── shoppingListModel.js
│   ├── mealModel.js
│   ├── expenseModel.js
│   ├── expenseMemberModel.js
│   ├── paymentModel.js
│   ├── adjustmentModel.js
│   └── groupSettingsModel.js
├── routes/
│   ├── authRoutes.js
│   ├── groupRoutes.js
│   ├── groceryRoutes.js
│   ├── shoppingListRoutes.js
│   ├── mealRoutes.js
│   ├── expenseRoutes.js
│   ├── paymentRoutes.js
│   ├── adjustmentRoutes.js
│   ├── analyticsRoutes.js
│   ├── dashboardRoutes.js
│   └── userRoutes.js
├── middleware/
│   ├── authMiddleware.js
│   ├── validateRequest.js
│   └── errorHandler.js
├── public/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   ├── api.js             # centralized fetch wrapper
│   │   ├── auth.js
│   │   ├── dashboard.js
│   │   ├── groceries.js
│   │   ├── shoppingList.js
│   │   ├── meals.js
│   │   ├── expenses.js
│   │   ├── settlements.js
│   │   └── analytics.js
│   └── pages/
│       ├── login.html
│       ├── register.html
│       ├── dashboard.html
│       ├── groceries.html
│       ├── shopping-list.html
│       ├── meals.html
│       ├── expenses.html
│       ├── settlements.html
│       ├── analytics.html
│       └── settings.html
├── utils/
│   ├── settlementEngine.js    # debt-simplification algorithm
│   └── responseHelper.js
├── database/
│   ├── schema.sql
│   └── seed.sql
├── .env.example
├── .gitignore
├── package.json
├── server.js
└── README.md
```

---

## 3. Module-wise Breakdown

| Module | Responsibility |
|---|---|
| **Auth** | Register, login, session/JWT issuance, logout |
| **Group** | Create/join group, manage membership, group code |
| **Groceries** | Log purchased grocery items and cost |
| **Shopping List** | Pending items and manual shopping-duty assignment. |
| **Meals** | Daily Lunch/Dinner intimation toggle, headcount view |
| **Expenses** | Create shared expense, choose split type |
| **Expense Members** | Per-member share amount for each expense |
| **Payments** | Record Cash/UPI payments between members |
| **Adjustments** | Manual balance corrections with reason |
| **Settlement Engine** | Compute net balances + simplify debts |
| **Analytics** | SQL aggregate queries for summaries/dashboards |
| **Dashboard** | Single aggregation endpoint combining balance, meals, and duty for the home page |
| **Users** | Self-service profile view/update (name, phone, UPI ID) |
| **Group Settings** | Per-group configuration (currently: meal cutoff time) |

---

## 4. Database Design

See **DATABASE.md** for full schema, CREATE TABLE statements, and normalization notes.

**Core entities:** Users, Groups, GroupMembers, Groceries, ShoppingList, Meals, Expenses, ExpenseMembers, Payments, Adjustments, GroupSettings (11 tables total — see DATABASE.md).

---

## 5. Table Relationships

- **Users** and **Groups** have a Many-to-Many relationship implemented through the `group_members` junction table. A user may belong to multiple groups, and a group may contain multiple users.
- One **Group** has many **Groceries**, **ShoppingListItems**, **Meals**, **Expenses**, **Payments**, **Adjustments** → One-to-Many
- One **Expense** has many **ExpenseMembers** (one row per participant's share) → One-to-Many
- One **User** can be `paid_by` in many **Expenses** and a `payer`/`payee` in many **Payments** → One-to-Many (self-referencing via role)

(Full ERD in DATABASE.md)

---

## 6. SQL Constraints

- All primary keys: `AUTO_INCREMENT INT`
- All foreign keys: `ON DELETE CASCADE` where child data is meaningless without parent (e.g., `expense_members` without `expenses`), `ON DELETE RESTRICT` where deletion should be prevented (e.g., `users` referenced by `payments`)
- `NOT NULL` on all mandatory fields (amounts, dates, foreign keys)
- `CHECK` constraints on amounts (`amount > 0`)
- `ENUM` used for fixed-choice fields (`payment_mode`, `meal_type`, `split_type`, `status`)
- `UNIQUE` constraint on `users.email` and `groups.group_code`

---

## 7. Backend Routing Structure

RESTful, resource-based, versionless (college scope):

```
/api/auth/register            POST
/api/auth/login               POST
/api/auth/logout              POST

/api/users/me                 GET, PUT

/api/groups                   POST, GET
/api/groups/:id               GET
/api/groups/join              POST
/api/groups/:id/leave         POST
/api/groups/:id/members       GET, DELETE
/api/groups/:id/settings      GET, PUT

/api/groceries                GET, POST
/api/groceries/:id            PUT, DELETE

/api/shopping-list            GET, POST
/api/shopping-list/:id        PUT, DELETE

/api/meals                    GET, POST
/api/meals/:id                PUT

/api/expenses                 GET, POST
/api/expenses/:id             GET, PUT, DELETE

/api/payments                 GET, POST
/api/payments/:id             DELETE

/api/adjustments              GET, POST
/api/adjustments/:id          DELETE

/api/dashboard                 GET
/api/settlements               GET
/api/settlements/simplified    GET
/api/analytics                 GET
```

---

## 8. CRUD Operations

Every core module (Groceries, Shopping List, Meals, Expenses, Payments, Adjustments) implements standard CRUD:

| Operation | HTTP Verb | Layer Flow |
|---|---|---|
| Create | POST | Route → Validate → Controller → Model.insert() → MySQL |
| Read | GET | Route → Controller → Model.findAll()/findById() → MySQL |
| Update | PUT | Route → Validate → Controller → Model.update() → MySQL |
| Delete | DELETE | Route → Controller → Model.delete() → MySQL |

Deletes on `expenses` cascade to `expense_members` (balances recompute automatically since balances are derived, not stored).

---

## 9. API Flow

**Example: Adding an Expense**

```
1. Client (expenses.html) → submits form via expenses.js
2. fetch POST /api/expenses  { title, amount, category, paid_by, split_type, members[] }
3. Route → validateRequest middleware (checks required fields, amount > 0)
4. expenseController.createExpense()
   a. Insert into `expenses` table
   b. Calculate per-member share (equal or custom)
   c. Insert rows into `expense_members`
5. Response: 201 Created + expense object
6. Client updates DOM, refreshes balance widget
```

**Example: Settlement Calculation**

```
1. Client → GET /api/settlements?group_id=<group_id>
2. settlementController fetches all expenses, expense_members, payments, adjustments for group
3. utils/settlementEngine.js computes net balance per user
4. Greedy debt-netting (largest creditor repeatedly paired with largest debtor) simplifies the ledger to a small, near-minimal set of transactions
5. Response: [{ from, to, amount }, ...]
```

> **Fix (Moderate #10 — "minimum transactions" was an overstated claim):** the greedy approach used here (same technique Splitwise-style apps use) is optimal in practice for small groups (≤10 members, the target scale for this project) but is not formally proven to produce the mathematically minimal transaction count for every possible balance combination — that's a harder combinatorial problem. Wording changed from "minimum" to "near-minimal" to keep the docs accurate; this is also a good talking point if asked about algorithm complexity in an interview.

---

## 10. Frontend Component Structure

Reusable components (implemented as HTML partials + JS render functions, not a framework):

- **Navbar** (`navbar.js`) — shared across all pages, highlights active page
- **Card components** — Balance Card, Meal Status Card, Group Summary Card
- **Modal components** — Add Expense Modal, Add Grocery Modal, Add Payment Modal (Bootstrap Modals)
- **Table components** — Grocery Table, Expense Table, Payment History Table (rendered dynamically via JS)
- **Toast component** — success/error notifications (Bootstrap Toasts)
- **Chart components** — Chart.js canvases for analytics page

---

## 11. JavaScript Responsibilities

`public/js/api.js` — centralized `fetch()` wrapper (base URL, headers, error handling, JSON parsing).

Each page-specific JS file (`groceries.js`, `expenses.js`, etc.) is responsible for:
- Fetching data on page load (`DOMContentLoaded`)
- Rendering data into tables/cards (DOM manipulation, no templating engine)
- Handling form submission (client-side validation → API call)
- Handling edit/delete button clicks (event delegation)
- Updating UI without full page reload

**No business logic (splitting, settlement math) lives in the frontend** — only display/formatting logic. All calculations happen server-side to keep a single source of truth.

---

## 12. Validation Rules

| Field | Rule |
|---|---|
| Email | Valid format, unique |
| Password | Min 6 characters |
| Amount (expense/payment) | Numeric, > 0 |
| Split type | Must be `equal` or `custom` |
| Custom split sum | Must equal total expense amount |
| Meal type | Must be `lunch` or `dinner` |
| Payment mode | Must be `cash` or `upi` |
| Group code | Alphanumeric, 6-10 characters |
| Dates | Valid ISO date, not in the future (for logged purchases) |
| Phone | Optional; if provided, exactly 10 digits |
| UPI ID | Optional; if provided, must match `<handle>@<bank/psp>` pattern (e.g., `name@okhdfcbank`) |
| Meal cutoff time | Valid `HH:MM:SS`; defaults to `10:00:00` per group (see DATABASE.md `group_settings`) |

Validation is enforced **both client-side (UX)** and **server-side (security/integrity)** — server-side is authoritative.

> **Fix (Moderate #12 — phone/UPI ID had no validation rule despite being editable in Settings):** rows added above. These back the new `PUT /api/users/me` endpoint in API.md.

**Equal-split remainder rule:** when `amount / memberCount` doesn't divide evenly (e.g., ₹100 ÷ 3 = 33.33 repeating), the leftover paisa is added to the **first member in the `members[]` array as submitted by the client** (typically the payer, since UI pre-populates them first). This is a deliberate, documented tie-breaker so the behavior is deterministic and testable — not an accidental artifact of iteration order.

> **Fix (Moderate #9 — split-remainder handling was implied by a test case but never actually specified anywhere):** rule added here explicitly so it's implementable and demoable without guessing.

---

## 13. Error Handling

- Centralized `middleware/errorHandler.js` catches all thrown/passed errors
- Consistent JSON error shape:
```json
{ "success": false, "message": "Amount must be greater than 0", "field": "amount" }
```
- Controllers wrap DB calls in try/catch, pass errors to `next(err)`
- HTTP status codes used consistently (see API.md)
- Frontend `api.js` checks `response.ok` and displays Bootstrap Toast on error

---

## 14. Security Considerations

- Passwords hashed with **bcrypt** (never stored plain)
- **Parameterized queries** (`mysql2` placeholders `?`) — no string concatenation, prevents SQL injection
- **express-session** (cookie-based) for authentication; protected routes use `authMiddleware`. *(Locked in — JWT is not used in v1; see Fix note below.)*
- **CSRF mitigation:** session cookies are set with `SameSite=Strict` and `httpOnly`, and all state-changing routes only accept `Content-Type: application/json` (rejects classic `<form>` POST-based CSRF). Full CSRF-token middleware is out of scope for v1 — noted here as a known, deliberate limitation rather than an oversight.
- Input sanitization on all POST/PUT bodies
- `.env` file for secrets (DB credentials, session secret) — never committed
- CORS restricted to same-origin (app serves its own frontend)
- Rate-limiting login endpoint (optional, `express-rate-limit`) to reduce brute force risk

> **Fix (Critical #4 + Moderate #11):** this section previously hedged with "express-session (or JWT)" while PRD's tech stack table had already committed to session-based auth — that ambiguity is now resolved in favor of sessions everywhere (TRD, API.md, PRD all agree). The CSRF gap flagged in the review (state-changing routes behind session cookies with no CSRF mitigation mentioned) is now explicitly addressed rather than left silent.

---

## 15. Scalability Considerations

- Current design targets small groups (≤10 members) — no horizontal scaling needed
- Indexes on foreign key columns (`group_id`, `user_id`, `expense_id`) for query performance
- Connection pooling via `mysql2/promise` pool (not single connections)
- Analytics queries use SQL aggregation (`SUM`, `GROUP BY`) rather than in-app computation, keeping the app stateless
- Architecture can later evolve: split into API service + separate frontend hosting, add Redis caching, or migrate to a framework — but not required for this scope

---

## 16. Coding Standards

- `camelCase` for JS variables/functions, `snake_case` for SQL columns/tables
- One controller function per route action
- No inline SQL in routes — SQL lives only in `models/`
- Consistent file naming: `xController.js`, `xModel.js`, `xRoutes.js`
- Comments explain **why**, not just what
- No magic numbers — use named constants (e.g., `MEAL_CUTOFF_HOUR = 10`)
- Consistent 2-space indentation, semicolons required

---

## 17. Deployment Strategy

**Development:** Local MySQL + `nodemon` for hot reload, `.env` for config.

**College demo / hosting options:**
- Backend: Render / Railway / Cyclic (free tier Node hosting)
- Database: Railway MySQL / Clever Cloud / local XAMPP for offline demo
- Static assets served directly by Express (`express.static('public')`) — no separate frontend host needed

**Steps:**
1. Push code to GitHub
2. Provision MySQL instance, run `database/schema.sql`
3. Set environment variables (`DB_HOST`, `DB_USER`, `DB_PASS`, `SESSION_SECRET`)
4. Deploy Node app, point `PORT` to platform's assigned port
5. Verify `/api/health` endpoint

---

## 18. Future Improvements

- Migrate to TypeScript for type safety (post-college-scope)
- Add Redis caching for analytics queries
- Add automated CI/CD pipeline (GitHub Actions)
- Introduce a proper frontend framework if UI complexity grows
- Add WebSocket-based real-time balance updates
- Containerize with Docker for consistent environments