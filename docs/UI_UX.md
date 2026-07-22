# 📄 UI_UX.md — UI/UX Specification

## Global Design System

**Color Palette:**
| Role | Color |
|---|---|
| Primary | `#4A6FA5` (calm blue) |
| Secondary | `#6FCF97` (soft green — positive balance) |
| Danger/Owed | `#EB5757` (soft red — negative balance) |
| Background | `#F7F8FA` |
| Text | `#2D2D2D` |
| Muted | `#8A8F98` |

**Typography:** `"Inter", "Segoe UI", sans-serif` — headings `font-weight: 600`, body `400`. Base size 16px, headings scale 1.25×–2×.

**Spacing:** Bootstrap default spacing scale (`.p-3`, `.mb-4`, `.gap-3`); consistent 24px page padding, 16px card padding.

**Accessibility:** All form inputs have `<label>` tags; color is never the sole indicator (icons/text accompany red/green balances); minimum contrast ratio 4.5:1; all interactive elements keyboard-navigable; `alt` text on icons/images.

---

## 1. Login Page
- **Purpose:** Authenticate existing users
- **Components:** Centered card, app logo, form
- **Forms:** Email, Password
- **Buttons:** "Login" (primary), "Create Account" (link)
- **Bootstrap:** `card`, `form-control`, `btn-primary`
- **Responsive:** Full-width card on mobile, fixed 400px on desktop
- **Icons:** Envelope, lock (Bootstrap Icons)

## 2. Register Page
- **Purpose:** New user sign-up
- **Components:** Form card
- **Forms:** Name, Email, Password, Confirm Password
- **Buttons:** "Register" (primary), "Back to Login" (link)
- **Bootstrap:** `card`, `form-control`, `alert` (for errors)

## 3. Dashboard
- **Purpose:** At-a-glance summary of household status
- **Components:** 3 summary cards (My Balance, Today's Meals, Pending Shopping Duty), recent activity list
- **Buttons:** "Add Expense", "Log Grocery" (quick-action buttons)
- **Cards:** Balance Card (green/red text), Meal Status Card, Duty Card
- **Navigation:** Top navbar with links to all modules
- **Bootstrap:** `card`, `row`/`col`, `badge`, `list-group`
- **Responsive:** Cards stack vertically on mobile (`col-12 col-md-4`)
- **Icons:** Wallet, cutlery, cart (Bootstrap Icons)

## 4. Groceries Page
- **Purpose:** Log and view grocery purchases
- **Components:** "Add Grocery" button (opens modal), data table
- **Table columns:** Item, Quantity, Amount, Purchased By, Date, Actions (edit/delete)
- **Forms (modal):** Item name, Quantity, Amount, Date
- **Bootstrap:** `table table-striped`, `modal`, `btn-outline-secondary` (edit), `btn-outline-danger` (delete)
- **Responsive:** Table scrolls horizontally on small screens (`table-responsive`)

## 5. Shopping List Page
- **Purpose:** Manage pending items and shopping duty
- **Components:** Add-item form (inline), list grouped by status
- **Table/List:** Checkbox or status badge (Pending/Purchased), Assigned To dropdown
- **Buttons:** "Mark Purchased", "Delete", "Reassign"
- **Bootstrap:** `list-group`, `badge bg-warning`/`bg-success`, `dropdown`

## 6. Meals Page
- **Purpose:** Daily lunch/dinner intimation
- **Components:** Today's toggle card (Lunch/Dinner switches), Group headcount table
- **Forms:** Toggle switches (Bootstrap `form-check form-switch`)
- **Table:** Member name, Lunch (✓/✗), Dinner (✓/✗)
- **Bootstrap:** `form-switch`, `table`, `alert-info` (cutoff time notice)

## 7. Expenses Page
- **Purpose:** Add/view shared expenses and splits
- **Components:** "Add Expense" button (modal), expense list/table with expandable row for split detail
- **Forms (modal):** Title, Amount, Category (select), Paid By (select), Split Type (radio: Equal/Custom), Member share inputs (shown conditionally)
- **Bootstrap:** `modal`, `form-select`, `form-check` (radio), `accordion` (for expandable member breakdown)
- **Responsive:** Modal is full-screen on mobile

## 8. Settlements Page
- **Purpose:** Show simplified "who owes whom"
- **Components:** Settlement list cards, "Mark as Settled" button per entry
- **Cards:** Each shows `From → To: ₹Amount` with avatar initials
- **Buttons:** "Settle via Cash", "Settle via UPI" (opens payment-record modal)
- **Bootstrap:** `card`, `btn-success`, `modal`

## 9. Analytics Page
- **Purpose:** Visualize spending trends
- **Components:** Date-range filter, 2–3 Chart.js charts (bar: category spend, pie: top spender, list: top items), monthly summary card
- **Bootstrap:** `form-select` (month filter), `card`, `row`/`col` grid for chart layout
- **Responsive:** Charts resize via Chart.js responsive option; stack vertically on mobile

## 10. Settings Page

- **Purpose:** Manage user profile and household groups

- **Components:**
  - Profile form (Name, Phone, UPI ID)
  - Active Group card
  - Group switcher (dropdown showing all joined groups)
  - Current group information (Group Code, Members List)
  - Leave Current Group button

- **Forms:**
  - Profile edit form

- **Buttons:**
  - "Save Changes"
  - "Leave Current Group"
  - "Logout"

- **Bootstrap:**
  `card`, `form-control`, `form-select`, `btn-outline-danger`