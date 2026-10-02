# RoomSync Audit Notes

Full-codebase audit completed 2026-10-02 against `main`. Method: route-by-route
authorization review, money-math review, XSS sweep of all render paths,
validation/error-path review, dead-code and docs-accuracy checks, plus the
Jest (72 tests) and Playwright (3 specs) suites.

## Bugs found and fixed

| # | Finding | Severity | Fix |
|---|---------|----------|-----|
| 1 | Grocery costs split across **all** members, charging staff and owners shares they should never owe. | High — wrong money | `backend/utils/settlementCalculator.js` now divides grocery shares among roommates (admin/member) only; staff are still credited for what they pay. Covered by a settlement unit test (cook +200, roommates −100 each, owner 0). |
| 2 | Removed members could still edit/delete old groceries (purchaser check only, no membership check). | Medium — stale access | Membership gate added before the purchaser check in `updateGrocery`/`deleteGrocery`, with integration tests. |
| 3 | Google-only accounts crashed password change with a 500 (`bcrypt.compare` vs null hash) and could never set a password. | Medium — crash + dead end | `changePassword` accepts a first-time set without the current password; Settings hides the current-password field and offers “Set Password”. |
| 4 | Opening an invite link for a group you already belong to showed a raw `ALREADY_A_MEMBER` error. | Low — UX | `join.js` resolves the group and lands on the dashboard instead. |
| 5 | Staff joining via invite code became `member`, silently gaining financial access. | High — privilege escalation | Join and approval flows assign `staff` for staff accounts. Covered by integration test. |
| 6 | Unassigned chores could only be flipped by managers, so nobody could pick up unclaimed work. | Low — UX | Any member may complete an unassigned task; doing so auto-assigns them. Covered by integration test. |
| 7 | Group name rendered unescaped into a `<select>` (`settings.js`), an XSS hole for malicious group names. | High — XSS | Escaped. All other ~80 render sites were swept and are `esc()`-clean (names, titles, reasons, emails, QR URLs built from origin only). |

## Non-bug improvements shipped in the same pass

- Replaced ~45 blocking `alert()` calls with non-blocking toasts (successes green); `confirm()` kept where blocking is semantically required.
- Removed dead `backend/config/db.js` alias (nothing imported it).
- `docs/Database.md` now documents the peer-only grocery rule.

## Verified clean — no action needed

- Every router mounts `authMiddleware` except the intentionally public register/login/captcha/Google-start/invite-preview endpoints (rate-limited where brute-forceable).
- Owner MFA (TOTP), CAPTCHA (HMAC, expiring, single-use), OAuth `state` (CSRF + role, verified twice), 30-day sessions, `no-store` logout handling.
- Prisma `CHECK` constraints on roles, group types, task fields, account types; no N+1 (Prisma `include` batching); indexes on hot paths.
- README setup instructions match the actual env vars and scripts.
