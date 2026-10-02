-- Allowed group membership roles: admin (manager), owner (PG/flat owner,
-- manager-equivalent), member (standard roommate), staff (household worker
-- such as chef or maid, excluded from financials).
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_role_check" CHECK ("role" IN ('admin', 'owner', 'member', 'staff'));
