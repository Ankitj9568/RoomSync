# 📄 DATABASE.md — Database Design Document

## ER Diagram (Textual)

```
USERS ||--o{ GROUP_MEMBERS }o--|| GROUPS
GROUPS ||--o{ GROCERIES
GROUPS ||--o{ SHOPPING_LIST
GROUPS ||--o{ MEALS
GROUPS ||--o{ EXPENSES
GROUPS ||--o{ PAYMENTS
GROUPS ||--o{ ADJUSTMENTS

USERS ||--o{ GROCERIES        (purchased_by)
USERS ||--o{ SHOPPING_LIST    (assigned_to)
USERS ||--o{ MEALS            (user_id)
USERS ||--o{ EXPENSES         (paid_by)
EXPENSES ||--o{ EXPENSE_MEMBERS
USERS ||--o{ EXPENSE_MEMBERS  (user_id)
USERS ||--o{ PAYMENTS         (paid_by / paid_to)
USERS ||--o{ ADJUSTMENTS      (from_user / to_user)
```

## Database Naming Standards

The following conventions are used throughout the RoomSync database schema:

- Table names use lowercase snake_case.
- Primary keys follow the format `<table>_id`.
- Foreign keys reuse the referenced primary key names.
- Monetary values use `DECIMAL(10,2)`.
- Timestamp columns use `created_at`.
- Enumerated values are implemented using `ENUM`.
- Nullable columns are used only where the business rules permit optional values.

## Tables

### 1. `users`
```sql
CREATE TABLE users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  upi_id VARCHAR(100),
  phone VARCHAR(15),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. `groups`
```sql
CREATE TABLE groups (
  group_id INT AUTO_INCREMENT PRIMARY KEY,
  group_name VARCHAR(100) NOT NULL,
  group_code VARCHAR(10) NOT NULL UNIQUE,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE RESTRICT
);
```

### 3. `group_members`
```sql
CREATE TABLE group_members (
  group_member_id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  user_id INT NOT NULL,
  role ENUM('admin','member') DEFAULT 'member',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_membership (group_id, user_id),
  FOREIGN KEY (group_id) REFERENCES groups(group_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
```

### 4. `groceries`
```sql
CREATE TABLE groceries (
  grocery_id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  item_name VARCHAR(100) NOT NULL,
  quantity VARCHAR(50),
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  purchased_by INT NOT NULL,
  purchase_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES groups(group_id) ON DELETE CASCADE,
  FOREIGN KEY (purchased_by) REFERENCES users(user_id) ON DELETE RESTRICT
);
```

### 5. `shopping_list`
```sql
CREATE TABLE shopping_list (
  item_id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  item_name VARCHAR(100) NOT NULL,
  assigned_to INT,
  status ENUM('pending','purchased') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES groups(group_id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_to) REFERENCES users(user_id) ON DELETE SET NULL
);
```

### 6. `meals`
```sql
CREATE TABLE meals (
  meal_id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  user_id INT NOT NULL,
  meal_date DATE NOT NULL,
  meal_type ENUM('lunch','dinner') NOT NULL,
  is_attending BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE KEY unique_meal_entry (user_id, meal_date, meal_type),
  FOREIGN KEY (group_id) REFERENCES groups(group_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
```

### 7. `expenses`
```sql
CREATE TABLE expenses (
  expense_id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  title VARCHAR(150) NOT NULL,
  description VARCHAR(255),
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  category ENUM('grocery','utility','rent','other') DEFAULT 'other',
  paid_by INT NOT NULL,
  split_type ENUM('equal','custom') NOT NULL DEFAULT 'equal',
  expense_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES groups(group_id) ON DELETE CASCADE,
  FOREIGN KEY (paid_by) REFERENCES users(user_id) ON DELETE RESTRICT
);
```

### 8. `expense_members`
```sql
CREATE TABLE expense_members (
  expense_member_id INT AUTO_INCREMENT PRIMARY KEY,
  expense_id INT NOT NULL,
  user_id INT NOT NULL,
  share_amount DECIMAL(10,2) NOT NULL CHECK (share_amount >= 0),
  UNIQUE KEY unique_expense_member (expense_id, user_id),
  FOREIGN KEY (expense_id) REFERENCES expenses(expense_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
```

### 9. `payments`
```sql
CREATE TABLE payments (
  payment_id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  paid_by INT NOT NULL,
  paid_to INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  payment_mode ENUM('cash','upi') NOT NULL,
  note VARCHAR(255),
  payment_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES groups(group_id) ON DELETE CASCADE,
  FOREIGN KEY (paid_by) REFERENCES users(user_id) ON DELETE RESTRICT,
  FOREIGN KEY (paid_to) REFERENCES users(user_id) ON DELETE RESTRICT,
  CHECK (paid_by <> paid_to)
);
```

### 10. `adjustments`
```sql
CREATE TABLE adjustments (
  adjustment_id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  from_user INT NOT NULL,
  to_user INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  reason VARCHAR(255) NOT NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES groups(group_id) ON DELETE CASCADE,
  FOREIGN KEY (from_user) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (to_user) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE RESTRICT,
  CHECK (from_user <> to_user)
);
```
### 11. `group_settings`
```sql
CREATE TABLE group_settings (
  group_id INT PRIMARY KEY,
  meal_cutoff_time TIME NOT NULL DEFAULT '10:00:00',
  FOREIGN KEY (group_id) REFERENCES groups(group_id) ON DELETE CASCADE
);
```

## Indexes
```sql
CREATE INDEX idx_groceries_group ON groceries(group_id);
CREATE INDEX idx_expenses_group ON expenses(group_id);
CREATE INDEX idx_expense_members_expense ON expense_members(expense_id);
CREATE INDEX idx_payments_group ON payments(group_id);
CREATE INDEX idx_meals_date ON meals(meal_date);
CREATE INDEX idx_shopping_status ON shopping_list(status);
```
## Database Transactions

To maintain data consistency, the following operations must execute within database transactions:

- Creating an expense together with all associated `expense_members` records.
- Updating an expense and recalculating participant shares.
- Deleting an expense along with its related participant records.
- Recording financial operations that modify multiple tables.

If any step within a transaction fails, all preceding operations are rolled back to preserve database integrity.

## Derived Data

RoomSync does not permanently store running balances for any user.

Instead, balances are calculated dynamically using transactional records from:

- Expenses
- Expense Members
- Payments
- Adjustments

This approach eliminates redundant data, prevents synchronization issues, and ensures that every displayed balance always reflects the latest transactional state.

## Relationship Rationale

- **`group_members` join table** exists because Users↔Groups is many-to-many (a user can belong to multiple households; a group has multiple users) — this can't be modeled as a simple foreign key.
- **`expense_members`** exists to record each participant's individual share per expense — a one-to-many relationship needed to support both equal and custom splits without repeating columns.
- **`payments`** references two users (`paid_by`, `paid_to`) because a payment is inherently directional — modeling it as two foreign keys avoids needing a separate "direction" table.
- **`adjustments`** is kept separate from `payments` because adjustments represent corrections (not real money movement) and need a mandatory `reason` field for audit purposes.
- **Cascading deletes** on `group_members`, `expense_members` ensure no orphaned child rows when a group/expense is removed, while **RESTRICT** on `users` referenced by `expenses`/`payments` prevents deleting a user who has financial history (preserves data integrity).
- A user may belong to multiple groups through the `group_members` junction table. Every business entity (expenses, groceries, meals, shopping lists, payments, and adjustments) references a specific `group_id`, ensuring complete isolation of data between groups.

## Normalization (up to 3NF)

**1NF:** Every table has atomic column values (e.g., no comma-separated lists of items or members inside a single row); each row is uniquely identifiable by its primary key.

**2NF:** All non-key attributes are fully functionally dependent on the whole primary key — this is why `expense_members` exists as a separate table rather than storing multiple member/share pairs as columns in `expenses` (which would create partial dependency issues).

**3NF:** No transitive dependencies — e.g., `groups.created_by` stores only the user's ID, not the user's name/email (which live only in `users`); `expenses.paid_by` similarly stores only a foreign key, avoiding duplication of user attributes across tables. This ensures each fact is stored in exactly one place, preventing update anomalies.