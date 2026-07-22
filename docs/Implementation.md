# 📄 IMPLEMENTATION.md — Development Roadmap

**Scope:** 1–2 week college project (10 phases, ~1–2 days each)

---

## Phase 1 — Project Setup

**Objectives:** Initialize repo, Node project, folder structure, base server.

**Deliverables:** Running Express server returning "RoomSync API running" on `/`.

**Files to create:**
`server.js`, `package.json`, `.env.example`, `.gitignore`, `config/db.js`, base folder skeleton

**Estimated complexity:** Low (2–3 hrs)

**Dependencies:** Node.js, npm, MySQL installed locally

**Acceptance criteria:**
- `npm install && npm start` runs without error
- Server responds on configured `PORT`
- `.env` correctly loaded via `dotenv`

---

## Phase 2 — Database

**Objectives:** Design and implement normalized schema.

**Deliverables:** `database/schema.sql` with all tables, keys, constraints (including the `group_settings` table); `database/seed.sql` with sample data.

**Files to create:** `database/schema.sql`, `database/seed.sql`, `config/db.js` (connection pool)

**Estimated complexity:** Medium (1 day)

**Dependencies:** Phase 1 complete; MySQL server running

**Acceptance criteria:**
- All 11 tables created without error *(Fix — Critical #2: this previously said "8 tables," which never matched DATABASE.md's actual table count; now 11 after adding `group_settings`)*
- Attempting to insert the same (group_id, user_id) pair twice is rejected by the unique_membership constraint.
- Foreign key constraints enforced (test with invalid insert)
- Seed data loads and is queryable

---

## Phase 3 — Backend APIs

**Objectives:** Build Express routes/controllers/models for all modules (auth, users, groups, group settings, groceries, shopping list, meals, expenses, payments, adjustments).

**Deliverables:** Fully functional REST API tested via Postman/Thunder Client, including the profile (`/api/users/me`), leave-group (`/api/groups/:id/leave`), and group-settings (`/api/groups/:id/settings`) routes added during the documentation review.

**Files to create:** All files under `routes/`, `controllers/`, `models/`, `middleware/`

**Estimated complexity:** High (3–4 days)

**Dependencies:** Phase 2 complete

**Acceptance criteria:**
- Every endpoint in API.md returns correct status codes and JSON
- Invalid input returns 400 with descriptive message
- Auth-protected routes reject unauthenticated requests (401)

---

## Phase 4 — Frontend Layout

**Objectives:** Build static HTML pages with Bootstrap layout, navbar, and page shells (no dynamic data yet).

**Deliverables:** All 10 pages (login, register, dashboard, groceries, shopping-list, meals, expenses, settlements, analytics, settings) with responsive layout.

**Files to create:** `public/pages/*.html`, `public/css/style.css`, `public/js/navbar.js`

**Estimated complexity:** Medium (1–2 days)

**Dependencies:** Phase 1 complete (can run parallel to Phase 3)

**Acceptance criteria:**
- All pages render correctly on desktop and mobile widths
- Navbar links to all pages
- Bootstrap components (cards, tables, modals) visible with placeholder data

---

## Phase 5 — CRUD Features

**Objectives:** Wire frontend pages to backend APIs for Groceries, Shopping List, and Meals modules.

**Deliverables:** Working Add/Edit/Delete for groceries and shopping list; working meal toggle with headcount view.

**Files to create:** `public/js/groceries.js`, `public/js/shoppingList.js`, `public/js/meals.js`, `public/js/api.js`

**Estimated complexity:** Medium (1–2 days)

**Dependencies:** Phase 3 + Phase 4 complete

**Acceptance criteria:**
- Adding a grocery item persists to DB and reflects in UI without page reload
- Deleting/editing works and updates table immediately
- Meal toggle updates DB and today's headcount view

---

## Phase 6 — Expense Splitting

**Objectives:** Implement expense creation with equal and custom split logic.

**Deliverables:** Working "Add Expense" flow with split-type selector and per-member share calculation.

**Files to create:** `public/js/expenses.js`, `controllers/expenseController.js` (split logic), `models/expenseMemberModel.js`

**Estimated complexity:** High (1–2 days)

**Dependencies:** Phase 5 complete

**Acceptance criteria:**
- Equal split divides amount correctly (handles rounding remainders)
- Custom split validates that entered shares sum to total amount
- Expense list shows paid-by and per-member share

---

## Phase 7 — Settlement Logic

**Objectives:** Build settlement engine to compute net balances and simplify debts.

**Deliverables:** `GET /api/settlements/`, `GET /api/settlements/simplified` showing "who owes whom."

**Files to create:** `utils/settlementEngine.js`, `controllers/settlementController.js`, `public/js/settlements.js`

**Estimated complexity:** High (1–2 days)

**Dependencies:** Phase 6 complete (expenses), Phase 3 (payments/adjustments APIs)

**Acceptance criteria:**
- Net balance per user sums to zero across the group
- Debt-simplification produces minimum transaction count
- UI clearly displays "A owes B ₹X"
- Marking a settlement complete is reflected via a payment record

---

## Phase 8 — Dashboard

**Objectives:** Build the home dashboard aggregating meal status, pending shopping duty, and balance summary.

**Deliverables:** Fully functional dashboard page, backed by the single `GET /api/dashboard?group_id=` now specified in API.md.

**Files to create:** `public/js/dashboard.js`, `controllers/dashboardController.js`, `routes/dashboardRoutes.js`

*(Fix — Critical #3: previously this phase referenced "controllers/groupController.js (dashboard aggregation endpoint)" but API.md never actually defined that endpoint. It's now its own documented route/controller pair, matching the API spec exactly instead of being an implied, undocumented addition to `groupController.js`.)*

**Estimated complexity:** Medium (1 day)

**Dependencies:** Phases 5, 6, 7 complete

**Acceptance criteria:**
- Dashboard loads current user's balance, today's meal status, and pending duties in a single view
- Data refreshes correctly on revisit

---

## Phase 9 — Analytics

**Objectives:** Implement SQL-based analytics queries and Chart.js visualizations.

**Deliverables:** Analytics page with monthly spend summary, category breakdown, top spender, most-bought items.

**Files to create:** `controllers/analyticsController.js`, `public/js/analytics.js`

**Estimated complexity:** Medium-High (1–2 days)

**Dependencies:** Phase 3 (expenses/groceries APIs), Chart.js CDN

**Acceptance criteria:**
- SQL aggregate queries return correct grouped totals
- Charts render correctly with real data
- Date-range filter updates charts dynamically

---

## Phase 10 — Testing

**Objectives:** Execute full test pass per TESTING.md (unit, CRUD, validation, boundary, negative, UI, DB, performance, acceptance).

**Deliverables:** Completed test log, bug fixes, final polish.

**Files to create:** `TESTING.md` (results filled in), minor bug-fix commits

**Estimated complexity:** Medium (1 day)

**Dependencies:** All previous phases complete

**Acceptance criteria:**
- All acceptance criteria from Phases 1–9 verified
- No console errors on any page
- All API endpoints return expected status codes for valid/invalid input