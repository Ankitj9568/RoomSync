-- CreateTable
CREATE TABLE "users" (
    "user_id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "upi_id" TEXT,
    "phone" TEXT,
    "avatar_url" TEXT,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "groups" (
    "group_id" SERIAL NOT NULL,
    "group_name" TEXT NOT NULL,
    "group_code" TEXT NOT NULL,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("group_id")
);

-- CreateTable
CREATE TABLE "group_members" (
    "group_member_id" SERIAL NOT NULL,
    "group_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "monthly_budget" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_members_pkey" PRIMARY KEY ("group_member_id")
);

-- CreateTable
CREATE TABLE "groceries" (
    "grocery_id" SERIAL NOT NULL,
    "group_id" INTEGER NOT NULL,
    "item_name" TEXT NOT NULL,
    "quantity" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "purchased_by" INTEGER NOT NULL,
    "purchase_date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "groceries_pkey" PRIMARY KEY ("grocery_id")
);

-- CreateTable
CREATE TABLE "grocery_contributors" (
    "contributor_id" SERIAL NOT NULL,
    "grocery_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "amount_paid" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "grocery_contributors_pkey" PRIMARY KEY ("contributor_id")
);

-- CreateTable
CREATE TABLE "shopping_list" (
    "item_id" SERIAL NOT NULL,
    "group_id" INTEGER NOT NULL,
    "item_name" TEXT NOT NULL,
    "assigned_to" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shopping_list_pkey" PRIMARY KEY ("item_id")
);

-- CreateTable
CREATE TABLE "meals" (
    "meal_id" SERIAL NOT NULL,
    "group_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "meal_date" DATE NOT NULL,
    "meal_type" TEXT NOT NULL,
    "is_attending" BOOLEAN NOT NULL DEFAULT true,
    "diet_preference" TEXT NOT NULL DEFAULT 'veg',
    "guest_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "meals_pkey" PRIMARY KEY ("meal_id")
);

-- CreateTable
CREATE TABLE "daily_menus" (
    "menu_id" SERIAL NOT NULL,
    "group_id" INTEGER NOT NULL,
    "menu_date" DATE NOT NULL,
    "meal_type" TEXT NOT NULL,
    "veg_item" TEXT NOT NULL,
    "nonveg_item" TEXT,

    CONSTRAINT "daily_menus_pkey" PRIMARY KEY ("menu_id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "expense_id" SERIAL NOT NULL,
    "group_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'other',
    "expense_type" TEXT NOT NULL DEFAULT 'ad_hoc',
    "split_type" TEXT NOT NULL DEFAULT 'equal',
    "expense_date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("expense_id")
);

-- CreateTable
CREATE TABLE "expense_payers" (
    "expense_payer_id" SERIAL NOT NULL,
    "expense_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "amount_paid" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "expense_payers_pkey" PRIMARY KEY ("expense_payer_id")
);

-- CreateTable
CREATE TABLE "expense_members" (
    "expense_member_id" SERIAL NOT NULL,
    "expense_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "share_amount" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "expense_members_pkey" PRIMARY KEY ("expense_member_id")
);

-- CreateTable
CREATE TABLE "payments" (
    "payment_id" SERIAL NOT NULL,
    "group_id" INTEGER NOT NULL,
    "paid_by" INTEGER NOT NULL,
    "paid_to" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "payment_mode" TEXT NOT NULL,
    "note" TEXT,
    "payment_date" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("payment_id")
);

-- CreateTable
CREATE TABLE "adjustments" (
    "adjustment_id" SERIAL NOT NULL,
    "group_id" INTEGER NOT NULL,
    "from_user" INTEGER NOT NULL,
    "to_user" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "adjustments_pkey" PRIMARY KEY ("adjustment_id")
);

-- CreateTable
CREATE TABLE "group_settings" (
    "group_id" INTEGER NOT NULL,
    "meal_cutoff_time" TEXT NOT NULL DEFAULT '10:00:00',
    "allow_direct_join" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "group_settings_pkey" PRIMARY KEY ("group_id")
);

-- CreateTable
CREATE TABLE "join_requests" (
    "request_id" SERIAL NOT NULL,
    "group_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "join_requests_pkey" PRIMARY KEY ("request_id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "log_id" SERIAL NOT NULL,
    "group_id" INTEGER NOT NULL,
    "user_id" INTEGER,
    "action" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("log_id")
);

-- CreateTable
CREATE TABLE "oauth_accounts" (
    "oauth_account_id" SERIAL NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_accounts_pkey" PRIMARY KEY ("oauth_account_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "groups_group_code_key" ON "groups"("group_code");

-- CreateIndex
CREATE INDEX "group_members_user_id_idx" ON "group_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "group_members_group_id_user_id_key" ON "group_members"("group_id", "user_id");

-- CreateIndex
CREATE INDEX "groceries_group_id_idx" ON "groceries"("group_id");

-- CreateIndex
CREATE INDEX "grocery_contributors_grocery_id_idx" ON "grocery_contributors"("grocery_id");

-- CreateIndex
CREATE INDEX "shopping_list_status_idx" ON "shopping_list"("status");

-- CreateIndex
CREATE INDEX "meals_meal_date_idx" ON "meals"("meal_date");

-- CreateIndex
CREATE UNIQUE INDEX "meals_group_id_user_id_meal_date_meal_type_key" ON "meals"("group_id", "user_id", "meal_date", "meal_type");

-- CreateIndex
CREATE UNIQUE INDEX "daily_menus_group_id_menu_date_meal_type_key" ON "daily_menus"("group_id", "menu_date", "meal_type");

-- CreateIndex
CREATE INDEX "expenses_group_id_idx" ON "expenses"("group_id");

-- CreateIndex
CREATE UNIQUE INDEX "expense_payers_expense_id_user_id_key" ON "expense_payers"("expense_id", "user_id");

-- CreateIndex
CREATE INDEX "expense_members_expense_id_idx" ON "expense_members"("expense_id");

-- CreateIndex
CREATE UNIQUE INDEX "expense_members_expense_id_user_id_key" ON "expense_members"("expense_id", "user_id");

-- CreateIndex
CREATE INDEX "payments_group_id_idx" ON "payments"("group_id");

-- CreateIndex
CREATE INDEX "join_requests_group_id_status_idx" ON "join_requests"("group_id", "status");

-- CreateIndex
CREATE INDEX "activity_logs_group_id_created_at_idx" ON "activity_logs"("group_id", "created_at");

-- CreateIndex
CREATE INDEX "oauth_accounts_user_id_idx" ON "oauth_accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_accounts_provider_provider_account_id_key" ON "oauth_accounts"("provider", "provider_account_id");

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("group_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groceries" ADD CONSTRAINT "groceries_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("group_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groceries" ADD CONSTRAINT "groceries_purchased_by_fkey" FOREIGN KEY ("purchased_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grocery_contributors" ADD CONSTRAINT "grocery_contributors_grocery_id_fkey" FOREIGN KEY ("grocery_id") REFERENCES "groceries"("grocery_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grocery_contributors" ADD CONSTRAINT "grocery_contributors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_list" ADD CONSTRAINT "shopping_list_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("group_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_list" ADD CONSTRAINT "shopping_list_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meals" ADD CONSTRAINT "meals_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("group_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meals" ADD CONSTRAINT "meals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_menus" ADD CONSTRAINT "daily_menus_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("group_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("group_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_payers" ADD CONSTRAINT "expense_payers_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "expenses"("expense_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_payers" ADD CONSTRAINT "expense_payers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_members" ADD CONSTRAINT "expense_members_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "expenses"("expense_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_members" ADD CONSTRAINT "expense_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("group_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_paid_by_fkey" FOREIGN KEY ("paid_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_paid_to_fkey" FOREIGN KEY ("paid_to") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adjustments" ADD CONSTRAINT "adjustments_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("group_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adjustments" ADD CONSTRAINT "adjustments_from_user_fkey" FOREIGN KEY ("from_user") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adjustments" ADD CONSTRAINT "adjustments_to_user_fkey" FOREIGN KEY ("to_user") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adjustments" ADD CONSTRAINT "adjustments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_settings" ADD CONSTRAINT "group_settings_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("group_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "join_requests" ADD CONSTRAINT "join_requests_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("group_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "join_requests" ADD CONSTRAINT "join_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("group_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauth_accounts" ADD CONSTRAINT "oauth_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserve the financial integrity checks from the legacy schema.
ALTER TABLE "groceries" ADD CONSTRAINT "groceries_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "grocery_contributors" ADD CONSTRAINT "grocery_contributors_amount_positive" CHECK ("amount_paid" > 0);
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "expense_payers" ADD CONSTRAINT "expense_payers_amount_positive" CHECK ("amount_paid" > 0);
ALTER TABLE "expense_members" ADD CONSTRAINT "expense_members_share_nonnegative" CHECK ("share_amount" >= 0);
ALTER TABLE "payments" ADD CONSTRAINT "payments_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "payments" ADD CONSTRAINT "payments_distinct_users" CHECK ("paid_by" <> "paid_to");
ALTER TABLE "adjustments" ADD CONSTRAINT "adjustments_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "adjustments" ADD CONSTRAINT "adjustments_distinct_users" CHECK ("from_user" <> "to_user");
