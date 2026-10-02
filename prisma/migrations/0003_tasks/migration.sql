-- Household task board: owners assign daily chores (cooking, cleaning,
-- laundry, grocery runs, maintenance, security rounds) to staff or members.
CREATE TABLE "tasks" (
    "task_id" SERIAL NOT NULL,
    "group_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'other',
    "assigned_to" INTEGER,
    "assigned_by" INTEGER NOT NULL,
    "schedule" TEXT NOT NULL DEFAULT 'once',
    "due_date" DATE,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("task_id")
);

-- CreateIndex
CREATE INDEX "tasks_group_id_status_idx" ON "tasks"("group_id", "status");

-- Allowed task categories, schedules, and statuses.
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_category_check" CHECK ("category" IN ('cooking', 'cleaning', 'utensils', 'laundry', 'grocery', 'maintenance', 'security', 'other'));
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_schedule_check" CHECK ("schedule" IN ('once', 'daily', 'weekly'));
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_status_check" CHECK ("status" IN ('pending', 'done'));

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("group_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
