CREATE DATABASE IF NOT EXISTS roomsync;
USE roomsync;

CREATE TABLE users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  upi_id VARCHAR(100),
  phone VARCHAR(15),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE groups (
  group_id INT AUTO_INCREMENT PRIMARY KEY,
  group_name VARCHAR(100) NOT NULL,
  group_code VARCHAR(10) NOT NULL UNIQUE,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE RESTRICT
);

CREATE TABLE group_members (
  group_member_id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  user_id INT NOT NULL,
  role ENUM('admin','member') DEFAULT 'member',
  monthly_budget DECIMAL(10,2) DEFAULT 0,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_membership (group_id, user_id),
  FOREIGN KEY (group_id) REFERENCES groups(group_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

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

CREATE TABLE meals (
  meal_id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  user_id INT NOT NULL,
  meal_date DATE NOT NULL,
  meal_type ENUM('lunch','dinner') NOT NULL,
  is_attending BOOLEAN NOT NULL DEFAULT TRUE,
  diet_preference ENUM('veg', 'non-veg', 'egg') DEFAULT 'veg',
  guest_count INT DEFAULT 0,
  UNIQUE KEY unique_meal_entry (user_id, meal_date, meal_type),
  FOREIGN KEY (group_id) REFERENCES groups(group_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE daily_menus (
  menu_id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  menu_date DATE NOT NULL,
  meal_type ENUM('lunch','dinner') NOT NULL,
  description VARCHAR(500) NOT NULL,
  UNIQUE KEY unique_menu (group_id, menu_date, meal_type),
  FOREIGN KEY (group_id) REFERENCES groups(group_id) ON DELETE CASCADE
);

CREATE TABLE expenses (
  expense_id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  title VARCHAR(150) NOT NULL,
  description VARCHAR(255),
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  category ENUM('grocery','utility','rent','loan','other') DEFAULT 'other',
  expense_type ENUM('recurring', 'ad_hoc', 'transfer') DEFAULT 'ad_hoc',
  split_type ENUM('equal','custom') NOT NULL DEFAULT 'equal',
  expense_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES groups(group_id) ON DELETE CASCADE
);

CREATE TABLE expense_payers (
  expense_payer_id INT AUTO_INCREMENT PRIMARY KEY,
  expense_id INT NOT NULL,
  user_id INT NOT NULL,
  amount_paid DECIMAL(10,2) NOT NULL CHECK (amount_paid > 0),
  UNIQUE KEY unique_expense_payer (expense_id, user_id),
  FOREIGN KEY (expense_id) REFERENCES expenses(expense_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE expense_members (
  expense_member_id INT AUTO_INCREMENT PRIMARY KEY,
  expense_id INT NOT NULL,
  user_id INT NOT NULL,
  share_amount DECIMAL(10,2) NOT NULL CHECK (share_amount >= 0),
  UNIQUE KEY unique_expense_member (expense_id, user_id),
  FOREIGN KEY (expense_id) REFERENCES expenses(expense_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

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

CREATE TABLE group_settings (
  group_id INT PRIMARY KEY,
  meal_cutoff_time TIME NOT NULL DEFAULT '10:00:00',
  FOREIGN KEY (group_id) REFERENCES groups(group_id) ON DELETE CASCADE
);

CREATE TABLE activity_logs (
  log_id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  user_id INT,
  action VARCHAR(50) NOT NULL,
  description VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES groups(group_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE INDEX idx_groceries_group ON groceries(group_id);
CREATE INDEX idx_expenses_group ON expenses(group_id);
CREATE INDEX idx_expense_members_expense ON expense_members(expense_id);
CREATE INDEX idx_payments_group ON payments(group_id);
CREATE INDEX idx_meals_date ON meals(meal_date);
CREATE INDEX idx_shopping_status ON shopping_list(status);
