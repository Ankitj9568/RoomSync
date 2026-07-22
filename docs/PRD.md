# Product Requirements Document (PRD)
## RoomSync — Shared Living Management Platform

**Document Version:** 1.0
**Prepared by:** Senior Product Manager
**Status:** Draft for Development

---

## 1. Product Vision

RoomSync aims to be the simplest, most reliable way for people who share a living space — roommates, hostel students, paying guests (PGs), or shared apartment tenants — to manage the everyday friction of communal living: who bought groceries, who owes whom, who's eating dinner tonight, and how much everyone spent this month.

The vision is a lightweight, web-based system of record for shared households that replaces scattered WhatsApp messages, notebooks, and mental math with a single source of truth for groceries, meals, expenses, and settlements — reducing arguments and improving transparency among people sharing a home.

---

## 1.1 Unique Value Proposition (UVP)

RoomSync is designed as an all-in-one shared living management platform that goes beyond traditional expense tracking applications.

Instead of focusing only on financial transactions, RoomSync integrates everyday household activities into a single platform by combining:

- Grocery Purchase Management
- Shared Shopping List
- Shopping Responsibility Assignment
- Daily Meal Intimation
- Shared Expense Tracking
- Expense Splitting
- Cash & UPI Payment Recording
- Manual Balance Adjustments
- Settlement Calculation
- SQL-based Spending Analytics

Unlike generic expense-splitting applications, RoomSync addresses both financial management and day-to-day household coordination, making it suitable for hostels, PG accommodations, shared apartments, and student flats.

The platform emphasizes:

- Transparency among members
- Reduced financial disputes
- Better shopping coordination
- Reduced food wastage
- Simplified monthly settlements
- Data-driven spending insights

## 2. Problem Statement

Shared living arrangements (hostels, PGs, flatshares) commonly suffer from:

- **Untracked grocery purchases** — no record of who bought what, when, or how much it cost.
- **Unclear shopping responsibility** — disputes over "whose turn" it is to buy groceries.
- **Meal count confusion** — cooks/mess staff don't know how many people are eating lunch/dinner on a given day, causing wastage or shortage.
- **Manual, error-prone expense splitting** — people use notebooks or mental math to split bills, leading to mistakes and mistrust.
- **No clear settlement process** — at month-end, nobody is sure who owes whom, or how much, across cash and UPI payments.
- **No visibility into spending patterns** — households have no way to see how much they collectively spend on groceries/utilities over time.

RoomSync solves these problems with a structured, transparent, digitally-tracked system accessible to all members of a shared household.

---

## 3. Objectives

| # | Objective |
|---|-----------|
| O1 | Provide a single platform to track shared groceries and shopping responsibilities |
| O2 | Enable daily meal intimation (Lunch/Dinner) to reduce food wastage |
| O3 | Automate expense splitting among roommates with minimal manual effort |
| O4 | Track payments (Cash/UPI) and allow manual balance adjustments |
| O5 | Provide a settlement calculator that tells each user exactly who owes whom |
| O6 | Offer monthly summaries and purchase analytics via SQL-based dashboards |
| O7 | Keep the system simple enough to be built and maintained as a college-level CRUD project |

---

## 3.1 Business Rules

The following business rules define the operational constraints of the RoomSync platform.

### User Rules

- A registered user can create or join multiple household groups.
- A user can have independent roles (admin/member) in different groups.
- A user can access only the data belonging to the currently selected group.
- Every household group must always have at least one administrator.
- Multiple administrators are permitted, but at least one administrator must always exist.
- The group creator automatically becomes the first administrator.
- Every member must belong to an existing group before accessing shared modules.

### Grocery Rules

- Grocery purchases must belong to a household group.
- Every grocery purchase must record the purchaser and purchase date.
- Grocery purchases are logged permanently for historical/audit purposes. A purchase can still be **edited or deleted, but only by the original purchaser and only within the same day it was logged** — after that window it becomes a read-only historical record. This preserves both correction-of-mistakes (delete/edit endpoints stay useful) and the "permanent purchase history" guarantee (no one can quietly rewrite last month's numbers).

### Shopping Rules

- Every shopping list item belongs to one household group.
- A shopping item can be assigned to only one member at a time.
- Purchased shopping items cannot be reassigned unless manually reverted.

### Meal Rules

- A member can submit only one response per meal per day.
- Meal responses are allowed only before the configured cutoff time.
- Historical meal records remain read-only after the cutoff.

### Expense Rules

- Every expense belongs to one household group.
- Every expense must have one payer.
- Expense amounts must always be greater than zero.
- Equal split divides expenses equally among selected members.
- Custom split must exactly match the total expense amount.

### Payment Rules

- Payments must occur between two different members.
- Payment amounts cannot be negative.
- Payment records cannot modify historical expense records.

### Adjustment Rules

- Manual adjustments require a mandatory reason.
- Adjustments modify balances only and do not represent actual money transfers.

### Settlement Rules

- Settlements are always calculated from expenses, payments, and adjustments.
- No balance should be stored permanently in the database.
- Balances are always computed dynamically.

### Analytics Rules

- Analytics are generated directly from transactional data.
- No manually maintained summary tables are allowed.

## 4. Target Users

- College hostel roommates sharing a room/mess
- Paying Guest (PG) residents sharing common expenses
- Shared flat/apartment tenants (working professionals or students)
- Small group households (3–6 people) with recurring shared costs

---

## 5. User Personas

**Persona 1: Aditi — The Organizer**
- 21, final-year engineering student living in a 4-person flatshare
- Tech-comfortable, tired of manually tracking group expenses in a notebook
- Wants: clear visibility into who owes what, quick expense entry, monthly reports

**Persona 2: Rohan — The Casual Roommate**
- 23, working professional, shares a PG room
- Doesn't want to deal with complex apps; just wants to log an expense in 10 seconds and check his balance
- Wants: simplicity, minimal clicks, clear "you owe / you are owed" numbers

**Persona 3: Meera — The Mess Coordinator**
- 20, hostel resident responsible for informing the cook about meal counts
- Needs a fast way to see how many roommates are eating lunch/dinner each day
- Wants: a simple meal intimation toggle, daily headcount view

**Persona 4: Karan — The Budget-Conscious Student**
- 19, shares groceries with 3 others, wants to know monthly spend per category
- Wants: purchase analytics, spending summaries, alerts on high spend

---

## 6. User Stories

**Grocery & Shopping**
- As a roommate, I want to add a grocery item to a shared shopping list so others know what's needed.
- As a roommate, I want to mark who is assigned to buy groceries this week/cycle so responsibility is clear.
- As a roommate, I want to log a completed grocery purchase with the amount spent so it's recorded for splitting.

**Meals**
- As a roommate, I want to mark whether I'm having lunch/dinner today so the cook/mess knows the headcount.
- As a mess coordinator, I want to see a daily summary of who is eating which meal.

**Expenses & Splitting**
- As a roommate, I want to add a shared expense and split it equally (or unequally) among selected members.
- As a roommate, I want to see my current balance (owed/owing) at any time.

**Payments & Settlement**
- As a roommate, I want to record that I paid someone via Cash or UPI so the ledger updates.
- As a roommate, I want a settlement calculator that tells me the minimum number of transactions needed to settle all balances in the group.
- As a roommate, I want to manually adjust a balance (e.g., for a discount or correction) with a note explaining why.

**Analytics**
- As a user, I want to see a monthly spending summary by category (groceries, utilities, other).
- As a user, I want to see purchase analytics (e.g., most frequently bought items, top spender) via dashboards.

**Admin/Group**
- As a user, I want to create or join a household group using a group code.
- As an admin (group creator), I want to add/remove members from my household group.

---

## 7. Functional Requirements

### 7.1 User & Group Management
- User registration/login (email + password, hashed with bcrypt)
- Create a household/group; generate a unique group code
- Join an existing group via group code
- Group admin role (creator) can remove members
- Basic profile (name, phone, UPI ID — optional)

### 7.2 Grocery & Shopping Management
- Add/edit/delete items on a shared shopping list
- Mark item status: Pending / Purchased
- Assign shopping duty to a member (manual assignment).
- Log a purchase: item(s), amount, buyer, date
- View purchase history per member

### 7.3 Meal Intimation
- Daily toggle: "I'm eating Lunch" / "I'm eating Dinner" (Yes/No) per user
- Cutoff time configuration, genuinely per-group and admin-editable (defaults to 10 AM; stored in `group_settings`, not hardcoded — see DATABASE.md and API.md `PUT /api/groups/:id/settings`)
- Group view: today's meal headcount (who's in/out)
- Historical meal log per user (for reference, not billing in v1)

### 7.4 Expense Management
- Add a shared expense: title, amount, category (grocery/utility/rent/other), paid-by, date
- Split type: Equal split / Custom split (enter amounts manually per member)
- Auto-calculate each member's share
- Edit/delete an expense (with recalculation of balances)

### 7.5 Payment Tracking
- Record a payment from User A to User B: amount, mode (Cash/UPI), date, optional note
- Payment updates the running balance between the two users
- View payment history (filter by member/date)

### 7.6 Manual Adjustments
- Add a manual balance adjustment between two members with a mandatory reason/note
- Adjustment reflected immediately in balance calculations
- Adjustment history log (who made it, when, why)

### 7.7 Settlement Calculator
- Calculate net balance per member across all expenses, payments, and adjustments
- Simplify debts algorithmically via greedy debt-netting, producing a near-minimal set of transactions (optimal in practice for the small group sizes this platform targets; see TRD.md for the accuracy note on why this isn't claimed as a formally-proven global minimum)
- Display "Who owes whom, how much" in a clear list
- Mark a settlement as "Settled" once payment is confirmed

### 7.8 Dashboards & Analytics (SQL-based)
- Monthly spending summary (total spend, per-category breakdown) using SQL `GROUP BY`/aggregate queries
- Purchase analytics: most-bought items, top spender, average monthly spend per person
- Simple charts (bar/pie) rendered via a JS charting library (e.g., Chart.js) fed by SQL query results
- Filter by date range and/or category

---

## 8. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Performance** | Pages should load within 2–3 seconds under normal college-lab/local hosting conditions |
| **Usability** | Simple, mobile-responsive UI using Bootstrap; minimal clicks for common actions (add expense, mark meal) |
| **Security** | Passwords hashed (bcrypt); session-based or JWT authentication; SQL injection prevention via parameterized queries |
| **Scalability** | Designed for small groups (up to ~10 members per household); not built for enterprise scale |
| **Maintainability** | Modular Express routes/controllers; clear MVC-style folder structure |
| **Reliability** | Balance calculations must be consistent and recompute correctly after edits/deletes |
| **Compatibility** | Should work on latest Chrome, Firefox, Edge; responsive down to mobile screen widths |
| **Data Integrity** | Foreign key constraints in MySQL between users, groups, expenses, and payments |

---

## 9. Feature Priorities (MoSCoW)

**Must Have**
- User registration/login
- Group creation/joining
- Add/track grocery items & purchases
- Add shared expenses with equal split
- Payment recording (Cash/UPI)
- Settlement calculator (basic net balance)
- Monthly spending summary

**Should Have**
- Meal intimation (Lunch/Dinner toggle)
- Custom (unequal) expense splitting
- Manual balance adjustments
- Purchase analytics dashboard (top items, top spender)
- Shopping duty assignment/rotation

**Could Have**
- In-app notifications/reminders
- Debt-simplification algorithm (minimum transactions)
- Filterable date-range analytics with charts
- Group admin controls (remove member, edit group)

**Won't Have (this version)**
- Native mobile app
- Push notifications (SMS/email)
- Grocery price prediction / market basket analysis
- Multi-currency support
- Payment gateway integration (actual UPI transaction processing)

---

## 10. User Flow

**Core Flow: New User to Settled Balance**

1. User registers → logs in
2. User creates a new group OR joins existing group via code
3. User lands on **Dashboard** showing: today's meal status, pending shopping duty, current balance summary
4. User adds a grocery item to the shared list → marks it purchased with amount → system logs expense
5. User (or another member) adds a shared expense manually → selects split type → system calculates shares
6. System updates each member's running balance
7. User records a payment made to another member (Cash/UPI) → balance updates
8. At month-end, user opens **Settlement Calculator** → sees simplified "who pays whom"
9. User marks settlement as complete
10. User views **Monthly Summary / Analytics Dashboard** for spending insights

**Daily Meal Flow**
1. User logs in → sees meal toggle for Lunch/Dinner
2. User marks Yes/No before cutoff time
3. Mess coordinator/any member views the day's headcount summary

---

## 11. Success Metrics

| Metric | Target (illustrative, for academic evaluation) |
|---|---|
| Number of active groups created | Demonstrates adoption within test users |
| % of expenses logged vs. manually tracked | Reduction in "off-app" tracking |
| Average time to settle a balance | Faster than manual/notebook method |
| Meal intimation response rate | >80% of members respond before cutoff |
| Dashboard usage | Users check analytics at least monthly |
| Data accuracy | Balances reconcile to zero sum across group at all times |

---

## 12. Future Enhancements(Not to be built for now)

- **Market Basket Analysis** — analyze grocery purchase data (SQL/association rule mining) to identify frequently co-purchased items, aiding smarter shopping lists
- **Smart Consumption Forecasting** — Use historical grocery purchase patterns to estimate future household consumption and recommend optimal replenishment schedules.
- **Push/Email/SMS Notifications** — real-time reminders for shopping duty, meal cutoff, and pending payments
- **Native Mobile App** — Android/iOS version (React Native/Flutter) for on-the-go access
- **UPI Payment Gateway Integration** — actual transaction initiation and confirmation instead of manual logging
- **Smart Meal Planning** — suggest meal plans based on available groceries
- **Multi-organization support** — Allow users to organize groups into organizations/workspaces with role inheritance.
- **Expense Receipt OCR** — scan grocery bills to auto-populate expense entries
- **Notifications (Basic, In-App only for v1)**
- In-app banner/alert for pending shopping duty
- In-app reminder for unpaid balances


---

### Suggested Tech Stack Mapping (for implementation reference)

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Bootstrap 5, Vanilla JavaScript (ES6) |
| Backend | Node.js, Express.js (minimal REST API) |
| Database | MySQL (relational schema: Users, Groups, GroceryItems, Expenses, ExpenseShares, Payments, Adjustments, Meals) |
| Charts | Chart.js (fed by SQL aggregate query results) |
| Authentication | Express Session + bcrypt Password Hashing |

---

## 13. Conclusion

This Product Requirements Document defines the functional vision, business requirements, operational scope, constraints, and success criteria for RoomSync Version 1.

It serves as the primary reference for the Technical Requirements Document (TRD), database design, REST API specification, implementation roadmap, testing strategy, and future product enhancements.

All subsequent technical documentation and implementation decisions should remain consistent with the requirements defined in this document.