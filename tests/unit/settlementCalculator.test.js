const settlementCalculator = require('../../utils/settlementCalculator');
const ExpenseModel = require('../../models/expenseModel');
const GroceryModel = require('../../models/groceryModel');
const PaymentModel = require('../../models/paymentModel');
const GroupModel = require('../../models/groupModel');

jest.mock('../../models/expenseModel');
jest.mock('../../models/groceryModel');
jest.mock('../../models/paymentModel');
jest.mock('../../models/groupModel');

describe('Settlement Calculator (White-box)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should correctly calculate balances and debts for a group with a single expense', async () => {
        // Setup mock data
        GroupModel.getGroupMembers.mockResolvedValue([
            { user_id: 1, name: 'Alice' },
            { user_id: 2, name: 'Bob' },
            { user_id: 3, name: 'Charlie' }
        ]);

        ExpenseModel.getExpensesByGroup.mockResolvedValue([
            {
                payers: [{ user_id: 1, amount_paid: 90 }],
                splits: [
                    { user_id: 1, share_amount: 30 },
                    { user_id: 2, share_amount: 30 },
                    { user_id: 3, share_amount: 30 }
                ]
            }
        ]);

        GroceryModel.getGroceriesByGroup.mockResolvedValue([]);
        PaymentModel.getPaymentsByGroup.mockResolvedValue([]);

        const result = await settlementCalculator.calculateBalances(1);
        
        expect(result.balances['1']).toBe(60); // Alice paid 90, owes 30, so +60
        expect(result.balances['2']).toBe(-30); // Bob owes 30
        expect(result.balances['3']).toBe(-30); // Charlie owes 30
        
        expect(result.debts.length).toBe(2);
        
        // Ensure debts correctly map
        const debtToAlice1 = result.debts.find(d => d.from === 2 && d.to === 1);
        const debtToAlice2 = result.debts.find(d => d.from === 3 && d.to === 1);
        
        expect(debtToAlice1).toBeDefined();
        expect(debtToAlice1.amount).toBe(30);
        
        expect(debtToAlice2).toBeDefined();
        expect(debtToAlice2.amount).toBe(30);
    });

    it('should handle payments between users correctly', async () => {
        GroupModel.getGroupMembers.mockResolvedValue([
            { user_id: 1, name: 'Alice' },
            { user_id: 2, name: 'Bob' }
        ]);

        ExpenseModel.getExpensesByGroup.mockResolvedValue([
            {
                payers: [{ user_id: 1, amount_paid: 100 }],
                splits: [
                    { user_id: 1, share_amount: 50 },
                    { user_id: 2, share_amount: 50 }
                ]
            }
        ]);

        GroceryModel.getGroceriesByGroup.mockResolvedValue([]);
        
        // Bob paid Alice 20
        PaymentModel.getPaymentsByGroup.mockResolvedValue([
            { paid_by: 2, paid_to: 1, amount: 20, status: 'approved' }
        ]);

        const result = await settlementCalculator.calculateBalances(1);
        
        // Alice balance: +50 from expense, -20 from receiving payment = 30
        expect(result.balances['1']).toBe(30); 
        // Bob balance: -50 from expense, +20 from paying = -30
        expect(result.balances['2']).toBe(-30);
        
        expect(result.debts.length).toBe(1);
        expect(result.debts[0]).toEqual({ from: 2, to: 1, amount: 30 });
    });
});
