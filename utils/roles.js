// utils/roles.js - Group membership roles and permission helpers.
//
// Roles are scoped to a single group: the same person can be an owner of one
// flat, a member of another, and staff of a third.
//
//   admin  - Manages the group: members, roles, settings, join requests,
//            adjustments, and every financial record.
//   owner  - PG/flat owner. Same management permissions as an admin, shown
//            distinctly in the UI. Owners count as managers for safeguards
//            such as "cannot remove the last manager".
//   member - Standard roommate. Full access to household features and financials.
//   staff  - Household worker (chef, maid, caretaker). Can use day-to-day
//            features (meals, menus, groceries, shopping list) but is excluded
//            from financials (expenses, payments, settlements, adjustments,
//            spending analytics) and from group management.

const GROUP_ROLES = ['admin', 'owner', 'member', 'staff'];

// Roles allowed to manage a group (members, roles, settings, adjustments).
const MANAGER_ROLES = ['admin', 'owner'];

// Roles allowed to see and touch financial data. Staff are excluded.
const FINANCIAL_ROLES = ['admin', 'owner', 'member'];

// Roles allowed into roommate-to-roommate financials (expense splits, peer
// settlements, spending analytics, adjustments). Owners are intentionally
// excluded: they oversee PG-level matters (rent collection, occupancy,
// tasks) while roommate-shared money stays between roommates.
const PEER_FINANCIAL_ROLES = ['admin', 'member'];

function normalizeRole(role) {
    return String(role || '').trim().toLowerCase();
}

function isValidRole(role) {
    return GROUP_ROLES.includes(normalizeRole(role));
}

// True for admin and owner. Replaces direct `role === 'admin'` comparisons so
// owners keep every management permission admins have.
function canManage(role) {
    return MANAGER_ROLES.includes(normalizeRole(role));
}

// True only for roommate-admins. Balance adjustments are roommate-shared
// money, so owners (PG oversight) cannot create them.
function isAdmin(role) {
    return normalizeRole(role) === 'admin';
}

// False for staff. Used to keep household workers out of financial endpoints.
function canAccessFinancials(role) {
    return FINANCIAL_ROLES.includes(normalizeRole(role));
}

// False for staff AND owners. Roommate-shared money stays between roommates.
function canAccessPeerFinancials(role) {
    return PEER_FINANCIAL_ROLES.includes(normalizeRole(role));
}

// True when at least one manager remains, used before demotions and removals.
function hasRemainingManager(members, excludeUserId = null) {
    return members.some(member =>
        canManage(member.role) && (excludeUserId === null || Number(member.user_id) !== Number(excludeUserId))
    );
}

module.exports = {
    GROUP_ROLES,
    MANAGER_ROLES,
    FINANCIAL_ROLES,
    PEER_FINANCIAL_ROLES,
    normalizeRole,
    isValidRole,
    canManage,
    isAdmin,
    canAccessFinancials,
    canAccessPeerFinancials,
    hasRemainingManager
};
