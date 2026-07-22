# 📄 TESTING.md — Testing Document

## Unit Test Cases

| ID | Test | Expected Result |
|---|---|---|
| UT-01 | `calculateEqualSplit(amount, memberCount)` | Returns correct per-member share, handles remainder (e.g., ₹100/3 → 33.34, 33.33, 33.33) |
| UT-02 | `settlementEngine.simplifyDebts(balances)` | Returns a near-minimal transaction list via greedy debt-netting; net sum = 0. *(Not asserted as the formally-proven global minimum for all inputs — see TRD.md's accuracy note.)* |
| UT-03 | `validateEmail(email)` | Returns `true`/`false` correctly for valid/invalid formats |

## CRUD Test Cases

| ID | Module | Action | Expected Result |
|---|---|---|---|
| CR-01 | Groceries | Create | New row inserted; returned in next GET |
| CR-02 | Groceries | Update | Amount/item updated correctly |
| CR-03 | Groceries | Delete | Row removed; not present in GET response |
| CR-04 | Expenses | Create (equal split) | `expense_members` rows created with equal shares |
| CR-05 | Expenses | Delete | Cascades and removes associated `expense_members` |
| CR-06 | Payments | Create | Balance between two users updates accordingly |
| CR-07 | Users | Update profile (`PUT /api/users/me`) | Name/phone/UPI ID updated; other users' views of this member's name refresh correctly |
| CR-08 | Group Settings | Update (`PUT /api/groups/:id/settings`) | `meal_cutoff_time` updates; next meal submission attempt after the new cutoff is correctly rejected |
| CR-09 | Only administrator leaves group | Longest-standing member becomes administrator |
| CR-10 | Load dashboard | Dashboard summary matches aggregated DB values. |
| CR-11 | Monthly analytics | Correct SQL aggregates returned. |
| CR-12 | Member edits another member's shopping item | Allowed. |

## Validation Tests

| ID | Test | Expected Result |
|---|---|---|
| V-01 | Submit expense with amount = 0 | 400 error: "Amount must be greater than 0" |
| V-02 | Submit custom split not summing to total | 400 error: `SPLIT_MISMATCH` |
| V-03 | Register with invalid email | 400 error: "Invalid email format" |
| V-04 | Register with password < 6 chars | 400 error: "Password too short" |
| V-05 | Update profile with an 8-digit phone number | 400 error: `INVALID_PHONE_FORMAT` |
| V-06 | Update profile with UPI ID missing `@` | 400 error: `INVALID_UPI_FORMAT` |
| V-07 | Analytics summary request with `from` after `to` | 400 error: `INVALID_DATE_RANGE` |
|V-08 | Submit meal after cutoff | 403 CUTOFF_PASSED 

## Boundary Tests

| ID | Test | Expected Result |
|---|---|---|
| B-01 | Expense amount = ₹0.01 (minimum valid) | Accepted |
| B-02 | Expense amount with 2 decimal precision (₹999.99) | Stored and displayed accurately |
| B-03 | Group with exactly 1 member | Settlement returns empty list (no debts possible) |
| B-04 | Split ₹100 among 3 members | Sum of shares equals exactly ₹100 (rounding handled) |

## Negative Tests

| ID | Test | Expected Result |
|---|---|---|
| N-01 | Access `/api/groceries` without login | 401 Unauthorized |
| N-02 | Join group with invalid code | 404 "Group not found" |
| N-03 | Payment with `payer_id == receiver_id` | 400 error: `SAME_USER_PAYMENT` |
| N-04 | Delete a non-existent expense ID | 404 "Expense not found" |
| N-05 | User tries to join the same group twice | 409 error: `ALREADY_A_MEMBER` (duplicate membership rejected by the API and the `unique_membership (group_id, user_id)` database constraint) |

| N-06 | Sole remaining member calls `POST /api/groups/:id/leave` | 409 error: `CANNOT_LEAVE_LAST_MEMBER` — must delete the group instead |
| N-07 | Edit/delete a grocery entry logged on a previous day | 403 error: `CORRECTION_WINDOW_EXPIRED` |
| N-08 | A non-purchaser tries to edit/delete someone else's grocery entry (even same-day) | 403 error: `NOT_PURCHASER` |
| N-09 | Delete group with more than one member | 409 error: `GROUP_NOT_EMPTY` |

## UI Tests

| ID | Test | Expected Result |
|---|---|---|
| UI-01 | Load Dashboard on mobile width (375px) | Cards stack vertically, no horizontal scroll |
| UI-02 | Submit Add Expense modal with empty title | Inline validation message shown, form not submitted |
| UI-03 | Toggle meal switch | UI updates immediately without page reload |

## Database Tests

| ID | Test | Expected Result |
|---|---|---|
| DB-01 | Insert expense with non-existent `group_id` | Foreign key constraint error |
| DB-02 | Delete a group | All child rows (groceries, expenses, meals, etc.) cascade-deleted |
| DB-03 | Insert duplicate `group_code` | Unique constraint violation |

## Performance Tests

| ID | Test | Expected Result |
|---|---|---|
| P-01 | Load expense list with 200 rows | Page renders in < 2 seconds on local hosting |
| P-02 | Analytics summary query on 6 months of data | Query executes in < 1 second (indexed columns) |

## Acceptance Tests

| ID | Scenario | Expected Result |
|---|---|---|
| A-01 | User adds grocery, expense, and payment in sequence | Dashboard balance reflects all three correctly |
| A-02 | Full month cycle: multiple expenses + payments | Settlement calculator produces correct minimum-transaction payoff plan |
| A-03 | New user joins group via code and adds first expense | Expense appears for all group members |
| A-04 | User successfully joins two different groups | Membership is created in both groups, and the user can switch between them correctly |