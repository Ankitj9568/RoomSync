-- Group types: pg (owner-run paying guest), flat (rented flat with an
-- owner but self-managed members), friends (equal roommate sharing).
-- PG billing (monthly rent + bill-generation day) lives on group_settings
-- and only the owner may change it. Room labels let PG owners allot beds
-- ("Room 101") to members sharing a room.
ALTER TABLE "groups" ADD COLUMN "group_type" TEXT NOT NULL DEFAULT 'friends';
ALTER TABLE "groups" ADD CONSTRAINT "groups_group_type_check" CHECK ("group_type" IN ('pg', 'flat', 'friends'));

ALTER TABLE "group_settings" ADD COLUMN "rent_amount" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "group_settings" ADD COLUMN "billing_day" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "group_settings" ADD CONSTRAINT "group_settings_rent_nonnegative" CHECK ("rent_amount" >= 0);
ALTER TABLE "group_settings" ADD CONSTRAINT "group_settings_billing_day_range" CHECK ("billing_day" BETWEEN 1 AND 28);

ALTER TABLE "group_members" ADD COLUMN "room_label" TEXT;
