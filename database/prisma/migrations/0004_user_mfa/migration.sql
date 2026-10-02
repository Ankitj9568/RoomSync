-- TOTP multi-factor authentication for PG/flat owners. The secret is stored
-- until enrollment is confirmed; mfa_enabled gates the login challenge.
ALTER TABLE "users" ADD COLUMN "totp_secret" TEXT;
ALTER TABLE "users" ADD COLUMN "mfa_enabled" BOOLEAN NOT NULL DEFAULT false;
