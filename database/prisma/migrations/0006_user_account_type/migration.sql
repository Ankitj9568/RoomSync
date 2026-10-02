-- Signup intent: roommate, owner (PG/flat owner), or staff (cook, maid,
-- watchman). Drives onboarding and the owner MFA requirement.
ALTER TABLE "users" ADD COLUMN "account_type" TEXT NOT NULL DEFAULT 'roommate';
ALTER TABLE "users" ADD CONSTRAINT "users_account_type_check" CHECK ("account_type" IN ('roommate', 'owner', 'staff'));
