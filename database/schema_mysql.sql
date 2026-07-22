CREATE TABLE IF NOT EXISTS users (
  user_id INT PRIMARY KEY AUTO_INCREMENT,
  name TEXT NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  upi_id TEXT,
  phone TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `groups` (
  group_id INT PRIMARY KEY AUTO_INCREMENT,
  group_name TEXT NOT NULL,
  group_code VARCHAR(50) NOT NULL UNIQUE,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS group_members (
  group_member_id INT PRIMARY KEY AUTO_INCREMENT,
  group_id INT NOT NULL,
  user_id INT NOT NULL,
  role TEXT DEFAULT 'member', -- admin, member
  monthly_budget DECIMAL(10,2) DEFAULT 0,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (group_id, user_id),
  FOREIGN KEY (group_id) REFERENCES `groups`(group_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS groceries (
  grocery_id INT PRIMARY KEY AUTO_INCREMENT,
  group_id INT NOT NULL,
  item_name TEXT NOT NULL,
  quantity TEXT,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  purchased_by INT NOT NULL,
  purchase_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES `groups`(group_id) ON DELETE CASCADE,
  FOREIGN KEY (purchased_by) REFERENCES users(user_id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS grocery_contributors (
  contributor_id INT PRIMARY KEY AUTO_INCREMENT,
  grocery_id INT NOT NULL,
  user_id INT NOT NULL,
  amount_paid DECIMAL(10,2) NOT NULL CHECK (amount_paid > 0),
  FOREIGN KEY (grocery_id) REFERENCES groceries(grocery_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS shopping_list (
  item_id INT PRIMARY KEY AUTO_INCREMENT,
  group_id INT NOT NULL,
  item_name TEXT NOT NULL,
  assigned_to INT,
  status TEXT DEFAULT 'pending', -- pending, purchased
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES `groups`(group_id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_to) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS meals (
  meal_id INT PRIMARY KEY AUTO_INCREMENT,
  group_id INT NOT NULL,
  user_id INT NOT NULL,
  meal_date DATE NOT NULL,
  meal_type VARCHAR(50) NOT NULL, -- lunch, dinner
  is_attending INT NOT NULL DEFAULT 1,
  diet_preference TEXT DEFAULT 'veg', -- veg, non-veg, egg
  guest_count INT DEFAULT 0,
  UNIQUE (user_id, meal_date, meal_type),
  FOREIGN KEY (group_id) REFERENCES `groups`(group_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS daily_menus (
  menu_id INT PRIMARY KEY AUTO_INCREMENT,
  group_id INT NOT NULL,
  menu_date DATE NOT NULL,
  meal_type VARCHAR(50) NOT NULL, -- lunch, dinner
  veg_item TEXT NOT NULL,
  nonveg_item TEXT,
  UNIQUE (group_id, menu_date, meal_type),
  FOREIGN KEY (group_id) REFERENCES `groups`(group_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS expenses (
  expense_id INT PRIMARY KEY AUTO_INCREMENT,
  group_id INT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  category TEXT DEFAULT 'other', -- grocery, utility, rent, loan, other
  expense_type TEXT DEFAULT 'ad_hoc', -- recurring, ad_hoc, transfer
  split_type TEXT NOT NULL DEFAULT 'equal', -- equal, custom
  expense_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES `groups`(group_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS expense_payers (
  expense_payer_id INT PRIMARY KEY AUTO_INCREMENT,
  expense_id INT NOT NULL,
  user_id INT NOT NULL,
  amount_paid DECIMAL(10,2) NOT NULL CHECK (amount_paid > 0),
  UNIQUE (expense_id, user_id),
  FOREIGN KEY (expense_id) REFERENCES expenses(expense_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS expense_members (
  expense_member_id INT PRIMARY KEY AUTO_INCREMENT,
  expense_id INT NOT NULL,
  user_id INT NOT NULL,
  share_amount DECIMAL(10,2) NOT NULL CHECK (share_amount >= 0),
  UNIQUE (expense_id, user_id),
  FOREIGN KEY (expense_id) REFERENCES expenses(expense_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payments (
  payment_id INT PRIMARY KEY AUTO_INCREMENT,
  group_id INT NOT NULL,
  paid_by INT NOT NULL,
  paid_to INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  payment_mode TEXT NOT NULL, -- cash, upi
  note TEXT,
  payment_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES `groups`(group_id) ON DELETE CASCADE,
  FOREIGN KEY (paid_by) REFERENCES users(user_id) ON DELETE RESTRICT,
  FOREIGN KEY (paid_to) REFERENCES users(user_id) ON DELETE RESTRICT,
  CHECK (paid_by <> paid_to)
);

CREATE TABLE IF NOT EXISTS adjustments (
  adjustment_id INT PRIMARY KEY AUTO_INCREMENT,
  group_id INT NOT NULL,
  from_user INT NOT NULL,
  to_user INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  reason TEXT NOT NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES `groups`(group_id) ON DELETE CASCADE,
  FOREIGN KEY (from_user) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (to_user) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE RESTRICT,
  CHECK (from_user <> to_user)
);

CREATE TABLE IF NOT EXISTS group_settings (
  group_id INT PRIMARY KEY,
  meal_cutoff_time TEXT NOT NULL DEFAULT '10:00:00',
  FOREIGN KEY (group_id) REFERENCES `groups`(group_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS activity_logs (
  log_id INT PRIMARY KEY AUTO_INCREMENT,
  group_id INT NOT NULL,
  user_id INT,
  action TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES `groups`(group_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_groceries_group ON groceries(group_id);
CREATE INDEX IF NOT EXISTS idx_expenses_group ON expenses(group_id);
CREATE INDEX IF NOT EXISTS idx_expense_members_expense ON expense_members(expense_id);
CREATE INDEX IF NOT EXISTS idx_payments_group ON payments(group_id);
CREATE INDEX IF NOT EXISTS idx_meals_date ON meals(meal_date);
CREATE INDEX IF NOT EXISTS idx_shopping_status ON shopping_list(status);
