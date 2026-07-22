// expenses.js - Expenses Logic

let groupMembers = [];

document.addEventListener('DOMContentLoaded', () => {
    if (getActiveGroupId()) {
        fetchGroupMembers().then(() => loadExpenses());
    }
    
    window.addEventListener('groupChanged', () => {
        fetchGroupMembers().then(() => loadExpenses());
    });
});

async function fetchGroupMembers() {
    const groupId = getActiveGroupId();
    if (!groupId) return;
    try {
        const res = await apiFetch(`/api/groups/members?group_id=${groupId}`);
        groupMembers = res.data;
    } catch (error) {
        console.error("Failed to load group members", error);
    }
}

function togglePayersSection() {
    const isMultiple = document.getElementById('paidByMultiple').checked;
    const section = document.getElementById('multiplePayersSection');
    
    if (isMultiple) {
        section.classList.remove('d-none');
        renderPayerInputs();
    } else {
        section.classList.add('d-none');
    }
}

function toggleSplitsSection() {
    const isCustom = document.getElementById('splitCustom').checked;
    const section = document.getElementById('customSplitsSection');
    
    if (isCustom) {
        section.classList.remove('d-none');
        renderSplitInputs();
    } else {
        section.classList.add('d-none');
    }
}

function renderPayerInputs() {
    const container = document.getElementById('payersContainer');
    let html = '';
    const currentUserId = getUserId();
    
    groupMembers.forEach(m => {
        const isMe = m.user_id == currentUserId;
        html += `
            <div class="row align-items-center mb-2">
                <div class="col-7">${m.name} ${isMe ? '(You)' : ''}</div>
                <div class="col-5">
                    <input type="number" step="0.01" class="form-control form-control-sm payer-input" data-userid="${m.user_id}" placeholder="₹">
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function renderSplitInputs() {
    const container = document.getElementById('splitsContainer');
    let html = '';
    const currentUserId = getUserId();
    
    groupMembers.forEach(m => {
        const isMe = m.user_id == currentUserId;
        html += `
            <div class="row align-items-center mb-2">
                <div class="col-7">${m.name} ${isMe ? '(You)' : ''}</div>
                <div class="col-5">
                    <input type="number" step="0.01" class="form-control form-control-sm split-input" data-userid="${m.user_id}" placeholder="₹">
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function updateSplitInputs() {
    // We could auto-distribute amounts here if we wanted
}

function prepareAddExpenseModal() {
    document.getElementById('addExpenseForm').reset();
    document.getElementById('paidByMe').checked = true;
    document.getElementById('splitEqual').checked = true;
    togglePayersSection();
    toggleSplitsSection();
}

function prepareLoanModal() {
    document.getElementById('recordLoanForm').reset();
    const select = document.getElementById('loanUserId');
    const currentUserId = getUserId();
    
    let html = '<option value="" disabled selected>Select roommate</option>';
    groupMembers.forEach(m => {
        if (m.user_id != currentUserId) {
            html += `<option value="${m.user_id}">${m.name}</option>`;
        }
    });
    select.innerHTML = html;
}

async function loadExpenses() {
    const groupId = getActiveGroupId();
    if (!groupId) return;

    try {
        const res = await apiFetch(`/api/expenses?group_id=${groupId}`);
        renderExpenses(res.data);
    } catch (error) {
        console.error("Expenses load failed", error);
    }
}

function renderExpenses(expenses) {
    const dailyContainer = document.getElementById('expensesAccordionDaily');
    const fixedContainer = document.getElementById('expensesAccordionFixed');
    
    let dailyHtml = '';
    let fixedHtml = '';
    
    if (expenses.length === 0) {
        dailyContainer.innerHTML = '<div class="text-center text-muted py-4">No expenses found.</div>';
        fixedContainer.innerHTML = '<div class="text-center text-muted py-4">No expenses found.</div>';
        return;
    }
    
    expenses.forEach(exp => {
        const isFixed = exp.expense_type === 'recurring';
        const dateStr = new Date(exp.expense_date).toLocaleDateString();
        
        let payerNames = exp.payers.map(p => p.name).join(', ');
        
        let splitsHtml = '';
        exp.splits.forEach(s => {
            splitsHtml += `
                <li class="list-group-item bg-transparent d-flex justify-content-between align-items-center">
                    ${s.name} <span>₹ ${parseFloat(s.share_amount).toFixed(2)}</span>
                </li>
            `;
        });
        
        const html = `
            <div class="accordion-item mb-3 border rounded shadow-sm">
                <h2 class="accordion-header" id="headingExp${exp.expense_id}">
                    <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseExp${exp.expense_id}">
                        <div class="d-flex justify-content-between w-100 me-3">
                            <div>
                                <strong>${exp.title}</strong>
                                <br>
                                <span class="badge bg-secondary">${exp.category}</span>
                                <span class="text-muted small ms-2">Paid by: ${payerNames}</span>
                            </div>
                            <div class="text-end">
                                <strong>₹ ${parseFloat(exp.amount).toFixed(2)}</strong>
                                <br>
                                <span class="text-muted small">${dateStr}</span>
                            </div>
                        </div>
                    </button>
                </h2>
                <div id="collapseExp${exp.expense_id}" class="accordion-collapse collapse" data-bs-parent="${isFixed ? '#expensesAccordionFixed' : '#expensesAccordionDaily'}">
                    <div class="accordion-body bg-light">
                        <div class="d-flex justify-content-between mb-2">
                            <h6 class="text-muted-custom mb-0">Split Details (${exp.split_type})</h6>
                            <button class="btn btn-sm btn-outline-danger py-0 px-2" onclick="deleteExpense(${exp.expense_id})"><i class="bi bi-trash"></i></button>
                        </div>
                        <ul class="list-group list-group-flush bg-transparent">
                            ${splitsHtml}
                        </ul>
                    </div>
                </div>
            </div>
        `;
        
        if (isFixed) {
            fixedHtml += html;
        } else {
            dailyHtml += html;
        }
    });
    
    dailyContainer.innerHTML = dailyHtml || '<div class="text-center text-muted py-4">No daily expenses.</div>';
    fixedContainer.innerHTML = fixedHtml || '<div class="text-center text-muted py-4">No fixed expenses.</div>';
}

async function saveExpense() {
    const groupId = getActiveGroupId();
    if (!groupId) return;
    
    const title = document.getElementById('expenseTitle').value;
    const amount = parseFloat(document.getElementById('expenseAmount').value);
    const category = document.getElementById('expenseCategory').value;
    const type = document.getElementById('expenseType').value;
    
    const isMultiple = document.getElementById('paidByMultiple').checked;
    const isCustom = document.getElementById('splitCustom').checked;
    
    if (!title || !amount) {
        alert("Please provide a title and amount.");
        return;
    }
    
    let payers = [];
    if (isMultiple) {
        document.querySelectorAll('.payer-input').forEach(input => {
            const val = parseFloat(input.value);
            if (val > 0) {
                payers.push({ user_id: input.dataset.userid, amount_paid: val });
            }
        });
    } // If not multiple, backend handles it as paid by current user.
    
    let splits = [];
    if (isCustom) {
        document.querySelectorAll('.split-input').forEach(input => {
            const val = parseFloat(input.value);
            if (val > 0) {
                splits.push({ user_id: input.dataset.userid, share_amount: val });
            }
        });
    }
    
    try {
        await apiFetch('/api/expenses', {
            method: 'POST',
            body: { 
                group_id: groupId, 
                title: title, 
                description: '', 
                amount: amount, 
                category: category,
                expense_type: type,
                split_type: isCustom ? 'custom' : 'equal',
                expense_date: new Date().toISOString().split('T')[0],
                payers: payers,
                splits: splits
            }
        });
        
        const modalEl = document.getElementById('addExpenseModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
        
        loadExpenses();
    } catch (error) {
        console.error("Failed to save expense", error);
        alert(error.message || "Failed to save expense");
    }
}

async function saveLoan() {
    const groupId = getActiveGroupId();
    const currentUserId = getUserId();
    if (!groupId) return;
    
    const targetUserId = document.getElementById('loanUserId').value;
    const loanType = document.getElementById('loanType').value; // gave or received
    const amount = parseFloat(document.getElementById('loanAmount').value);
    const note = document.getElementById('loanNote').value;
    
    if (!targetUserId || !amount) {
        alert("Please select a roommate and amount.");
        return;
    }
    
    // Model a Loan as an Expense
    const payerId = loanType === 'gave' ? currentUserId : targetUserId;
    const borrowerId = loanType === 'gave' ? targetUserId : currentUserId;
    
    try {
        await apiFetch('/api/expenses', {
            method: 'POST',
            body: { 
                group_id: groupId, 
                title: note || 'Cash Transfer', 
                description: '', 
                amount: amount, 
                category: 'other',
                expense_type: 'transfer',
                split_type: 'custom',
                expense_date: new Date().toISOString().split('T')[0],
                payers: [{ user_id: payerId, amount_paid: amount }],
                splits: [{ user_id: borrowerId, share_amount: amount }]
            }
        });
        
        const modalEl = document.getElementById('recordLoanModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
        
        loadExpenses();
    } catch (error) {
        console.error("Failed to save loan", error);
        alert(error.message || "Failed to save loan");
    }
}
async function deleteExpense(id) {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    try {
        await apiFetch(`/api/expenses/${id}`, { method: 'DELETE' });
        loadExpenses();
    } catch(e) {
        alert(e.message || "Failed to delete");
    }
}
