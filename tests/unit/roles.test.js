const {
    GROUP_ROLES,
    isValidRole,
    normalizeRole,
    canManage,
    isAdmin,
    canAccessFinancials,
    canAccessPeerFinancials,
    hasRemainingManager
} = require('../../utils/roles');

describe('group roles', () => {
    test('accepts exactly the four documented roles', () => {
        expect(GROUP_ROLES).toEqual(['admin', 'owner', 'member', 'staff']);
        for (const role of GROUP_ROLES) expect(isValidRole(role)).toBe(true);
        expect(isValidRole('superadmin')).toBe(false);
        expect(isValidRole('')).toBe(false);
        expect(isValidRole(null)).toBe(false);
    });

    test('normalizeRole trims and lowercases input', () => {
        expect(normalizeRole(' Owner ')).toBe('owner');
        expect(normalizeRole('ADMIN')).toBe('admin');
        expect(normalizeRole(null)).toBe('');
    });

    test('owners manage groups just like admins', () => {
        expect(canManage('admin')).toBe(true);
        expect(canManage('owner')).toBe(true);
        expect(canManage('member')).toBe(false);
        expect(canManage('staff')).toBe(false);
        expect(canManage('unknown')).toBe(false);
        expect(isAdmin('admin')).toBe(true);
        expect(isAdmin('owner')).toBe(false);
    });

    test('staff cannot access financials, owners cannot access peer financials', () => {
        expect(canAccessFinancials('admin')).toBe(true);
        expect(canAccessFinancials('owner')).toBe(true);
        expect(canAccessFinancials('member')).toBe(true);
        expect(canAccessFinancials('staff')).toBe(false);
        expect(canAccessFinancials('unknown')).toBe(false);
        expect(canAccessPeerFinancials('admin')).toBe(true);
        expect(canAccessPeerFinancials('member')).toBe(true);
        expect(canAccessPeerFinancials('owner')).toBe(false);
        expect(canAccessPeerFinancials('staff')).toBe(false);
    });

    test('hasRemainingManager guards the last manager', () => {
        const members = [
            { user_id: 1, role: 'admin' },
            { user_id: 2, role: 'member' }
        ];
        expect(hasRemainingManager(members)).toBe(true);
        expect(hasRemainingManager(members, 1)).toBe(false);
        expect(hasRemainingManager(members, 2)).toBe(true);
        expect(hasRemainingManager([{ user_id: 1, role: 'staff' }])).toBe(false);
        expect(hasRemainingManager([])).toBe(false);
    });

    test('an owner counts as a remaining manager', () => {
        const members = [
            { user_id: 1, role: 'owner' },
            { user_id: 2, role: 'staff' }
        ];
        expect(hasRemainingManager(members, 2)).toBe(true);
        expect(hasRemainingManager(members, 1)).toBe(false);
    });
});
