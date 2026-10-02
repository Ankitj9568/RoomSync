const { validateTaskInput, TASK_CATEGORIES, TASK_SCHEDULES } = require('../../controllers/taskController');

describe('task validation', () => {
    test('accepts a complete valid task', () => {
        expect(validateTaskInput({
            title: 'Cook dinner',
            category: 'cooking',
            schedule: 'daily',
            due_date: '2026-10-05'
        })).toEqual({ title: 'Cook dinner', category: 'cooking', schedule: 'daily', dueDate: '2026-10-05' });
    });

    test('defaults category, schedule, and due date', () => {
        expect(validateTaskInput({ title: 'Mop floor' })).toEqual({
            title: 'Mop floor', category: 'other', schedule: 'once', dueDate: null
        });
    });

    test('rejects blank or oversized titles', () => {
        expect(() => validateTaskInput({ title: '  ' })).toThrow();
        expect(() => validateTaskInput({ title: 'x'.repeat(201) })).toThrow();
    });

    test('rejects unknown categories and schedules', () => {
        expect(() => validateTaskInput({ title: 'T', category: 'pilot' })).toThrow();
        expect(() => validateTaskInput({ title: 'T', schedule: 'monthly' })).toThrow();
    });

    test('covers Indian PG chore categories', () => {
        for (const category of ['cooking', 'cleaning', 'utensils', 'laundry', 'grocery', 'maintenance', 'security', 'other']) {
            expect(TASK_CATEGORIES).toContain(category);
        }
        expect(TASK_SCHEDULES).toEqual(['once', 'daily', 'weekly']);
    });

    test('rejects malformed due dates', () => {
        expect(() => validateTaskInput({ title: 'T', due_date: 'not-a-date' })).toThrow();
    });
});
