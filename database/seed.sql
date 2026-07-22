-- 1. Seed Users (password for all is 'password123' -> hashed)
-- Hashed using bcryptjs (salt rounds = 10)
INSERT INTO users (name, email, password_hash, upi_id, phone) VALUES 
('Aditi', 'aditi@example.com', '$2a$10$7Z8b/0V6wN9/c1f5.J4o3.V1aC7jT6C8D/H8Q1R9r/l7xP4m1/3E6', 'aditi@upi', '9876543210'),
('Rohan', 'rohan@example.com', '$2a$10$7Z8b/0V6wN9/c1f5.J4o3.V1aC7jT6C8D/H8Q1R9r/l7xP4m1/3E6', 'rohan@ybl', '9876543211'),
('Meera', 'meera@example.com', '$2a$10$7Z8b/0V6wN9/c1f5.J4o3.V1aC7jT6C8D/H8Q1R9r/l7xP4m1/3E6', 'meera@okicici', '9876543212'),
('Karan', 'karan@example.com', '$2a$10$7Z8b/0V6wN9/c1f5.J4o3.V1aC7jT6C8D/H8Q1R9r/l7xP4m1/3E6', 'karan@okhdfc', '9876543213');

-- 2. Seed Group
INSERT INTO groups (group_name, group_code, created_by) VALUES 
('Flat 302', 'AB12CD', 1);

-- 3. Seed Group Members
INSERT INTO group_members (group_id, user_id, role, monthly_budget) VALUES 
(1, 1, 'admin', 5000.00),
(1, 2, 'member', 3000.00),
(1, 3, 'member', 4000.00),
(1, 4, 'member', 3500.00);

-- 4. Seed Group Settings
INSERT INTO group_settings (group_id, meal_cutoff_time) VALUES 
(1, '10:00:00');

-- 5. Seed Groceries
INSERT INTO groceries (group_id, item_name, quantity, amount, purchased_by, purchase_date) VALUES 
(1, 'Rice', '5 kg', 350.00, 1, date('now', '-5 days')),
(1, 'Milk', '2 L', 120.00, 2, date('now', '-2 days')),
(1, 'Vegetables', 'Mixed', 200.00, 3, date('now', '-1 days'));

-- 5.5 Seed Grocery Contributors
INSERT INTO grocery_contributors (grocery_id, user_id, amount_paid) VALUES 
(1, 1, 350.00),          -- Aditi paid 350 for Rice
(2, 2, 60.00),           -- Rohan paid 60 for Milk
(2, 3, 60.00),           -- Meera paid 60 for Milk
(3, 3, 200.00);          -- Meera paid 200 for Veggies

-- 6. Seed Shopping List
INSERT INTO shopping_list (group_id, item_name, assigned_to, status) VALUES 
(1, 'Eggs 1 dozen', 4, 'pending'),
(1, 'Bread', 2, 'pending'),
(1, 'Cooking Oil 1L', 1, 'purchased');

-- 7. Seed Meals (Assuming today)
INSERT INTO meals (group_id, user_id, meal_date, meal_type, is_attending, diet_preference, guest_count) VALUES 
(1, 1, date('now'), 'lunch', 1, 'veg', 0),
(1, 2, date('now'), 'lunch', 0, 'veg', 0),
(1, 3, date('now'), 'lunch', 1, 'non-veg', 1),
(1, 4, date('now'), 'lunch', 1, 'egg', 0),
(1, 1, date('now'), 'dinner', 1, 'veg', 0),
(1, 2, date('now'), 'dinner', 1, 'non-veg', 0),
(1, 3, date('now'), 'dinner', 1, 'non-veg', 2),
(1, 4, date('now'), 'dinner', 1, 'egg', 0);

-- 7.5 Seed Daily Menus
INSERT INTO daily_menus (group_id, menu_date, meal_type, veg_item, nonveg_item) VALUES
(1, date('now'), 'lunch', 'Rajma Chawal, Kachumber Salad', NULL),
(1, date('now'), 'dinner', 'Dal Tadka, Roti, Paneer Butter Masala', 'Chicken Curry');

-- 8. Seed Expenses
INSERT INTO expenses (group_id, title, description, amount, category, expense_type, split_type, expense_date) VALUES 
(1, 'Electricity Bill', 'July Month', 1200.00, 'utility', 'recurring', 'equal', date('now', '-3 days')),
(1, 'Weekend Snacks', 'Pizza and Coke', 800.00, 'other', 'ad_hoc', 'custom', date('now', '-1 days'));

-- 8.5 Seed Expense Payers
-- Electricity Bill was paid by Aditi (1) 
INSERT INTO expense_payers (expense_id, user_id, amount_paid) VALUES 
(1, 1, 1200.00);

-- Weekend Snacks was paid by Rohan (2) and Aditi (1)
INSERT INTO expense_payers (expense_id, user_id, amount_paid) VALUES 
(2, 2, 500.00),
(2, 1, 300.00);

-- 9. Seed Expense Members
-- Electricity Bill (Equal split: 1200 / 4 = 300)
INSERT INTO expense_members (expense_id, user_id, share_amount) VALUES 
(1, 1, 300.00),
(1, 2, 300.00),
(1, 3, 300.00),
(1, 4, 300.00);

-- Weekend Snacks (Custom split: Aditi and Rohan 400 each)
INSERT INTO expense_members (expense_id, user_id, share_amount) VALUES 
(2, 1, 400.00),
(2, 2, 400.00),
(2, 3, 0.00),
(2, 4, 0.00);

-- 10. Seed Payments
INSERT INTO payments (group_id, paid_by, paid_to, amount, payment_mode, note, payment_date) VALUES 
(1, 2, 1, 300.00, 'upi', 'For Electricity', date('now', '-2 days'));

-- 11. Seed Adjustments
INSERT INTO adjustments (group_id, from_user, to_user, amount, reason, created_by) VALUES 
(1, 3, 1, 50.00, 'Discount on last bill', 1);

-- 12. Seed Activity Logs
INSERT INTO activity_logs (group_id, user_id, action, description, created_at) VALUES
(1, 1, 'EXPENSE_ADDED', 'Aditi added "Electricity Bill" (₹ 1200)', date('now', '-3 days')),
(1, 2, 'PAYMENT_MADE', 'Rohan paid Aditi ₹ 300', date('now', '-2 days')),
(1, 3, 'GROCERY_LOGGED', 'Meera logged purchase of "Vegetables" (₹ 200)', date('now', '-1 days'));
