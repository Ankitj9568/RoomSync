// groceries.js - Grocery Log Integration

let groupMembers = [];

document.addEventListener('DOMContentLoaded', () => {
    if (getActiveGroupId()) {
        loadGroceries();
        fetchGroupMembers();
    }
    
    window.addEventListener('groupChanged', () => {
        loadGroceries();
        fetchGroupMembers();
    });

    const addGroceryForm = document.getElementById('addGroceryForm');
    if (addGroceryForm) {
        addGroceryForm.addEventListener('submit', handleAddGrocery);
    }
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

async function loadGroceries() {
    const groupId = getActiveGroupId();
    const tbody = document.getElementById('groceriesTableBody');
    if (!groupId) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No active group selected.</td></tr>';
        return;
    }

    try {
        const res = await apiFetch(`/api/groceries?group_id=${groupId}`);
        renderGroceries(res.data);
    } catch (error) {
        console.error("Failed to load groceries", error);
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Failed to load groceries.</td></tr>';
    }
}

function renderGroceries(groceries) {
    const tbody = document.getElementById('groceriesTableBody');
    const totalEl = document.getElementById('totalSpentText');
    let total = 0;

    if (!groceries || groceries.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No groceries logged yet.</td></tr>';
        totalEl.textContent = '₹ 0.00';
        return;
    }

    const currentUserId = getUserId();
    let html = '';

    groceries.forEach(g => {
        total += parseFloat(g.amount);
        
        let purchaserHtml = '';
        if (g.contributors && g.contributors.length > 1) {
            // Find the main purchaser (either first in list or the one with max amount)
            const mainPurchaser = g.contributors[0].name;
            const extraCount = g.contributors.length - 1;
            
            // Build the popover HTML
            let popoverContent = `<div class='small text-dark'>`;
            g.contributors.forEach(c => {
                popoverContent += `<div class='d-flex justify-content-between mb-1 border-bottom pb-1'><span>${c.name}:</span> <span>₹ ${parseFloat(c.amount_paid).toFixed(2)}</span></div>`;
            });
            popoverContent += `</div>`;

            purchaserHtml = `
                ${mainPurchaser}
                <span class="badge bg-secondary ms-1 text-white" role="button" tabindex="0" 
                      data-bs-toggle="popover" data-bs-trigger="focus" title="Contributions" 
                      data-bs-html="true" data-bs-content="${popoverContent}">+${extraCount}</span>
            `;
        } else if (g.contributors && g.contributors.length === 1) {
            purchaserHtml = g.contributors[0].name;
        } else {
            purchaserHtml = g.purchaser_name;
        }

        const dateStr = new Date(g.purchase_date).toLocaleDateString();

        html += `
            <tr>
                <td class="fw-medium">${g.item_name}</td>
                <td>${g.quantity || '-'}</td>
                <td>₹ ${parseFloat(g.amount).toFixed(2)}</td>
                <td>${purchaserHtml}</td>
                <td>${dateStr}</td>
                <td>
                    ${g.purchased_by == currentUserId ? `
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteGrocery(${g.grocery_id})">
                            <i class="bi bi-trash"></i>
                        </button>
                    ` : '<span class="text-muted small">No access</span>'}
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
    totalEl.textContent = `₹ ${total.toFixed(2)}`;

    // Initialize Popovers
    const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.map(function (popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });
}

function prepareAddGroceryModal() {
    // Populate contributors list
    const container = document.getElementById('contributorsContainer');
    
    if (groupMembers.length === 0) {
        container.innerHTML = '<div class="text-muted small">Loading members...</div>';
        return;
    }

    let html = '';
    const currentUserId = getUserId();
    
    groupMembers.forEach(member => {
        const isYou = member.user_id == currentUserId;
        html += `
            <div class="d-flex align-items-center justify-content-between mb-2">
                <div class="form-check">
                    <input class="form-check-input contributor-checkbox" type="checkbox" value="${member.user_id}" id="contrib_${member.user_id}" ${isYou ? 'checked' : ''} onchange="updateContributorInputs()">
                    <label class="form-check-label" for="contrib_${member.user_id}">
                        ${member.name} ${isYou ? '(You)' : ''}
                    </label>
                </div>
                <div class="w-50">
                    <div class="input-group input-group-sm">
                        <span class="input-group-text">₹</span>
                        <input type="number" class="form-control contributor-amount" id="contrib_amount_${member.user_id}" data-userid="${member.user_id}" step="0.01" ${isYou ? '' : 'disabled'}>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    document.getElementById('groceryDate').valueAsDate = new Date();
    updateContributorInputs();
}

function updateContributorInputs() {
    const checkboxes = document.querySelectorAll('.contributor-checkbox');
    const totalAmount = parseFloat(document.getElementById('groceryAmount').value) || 0;
    
    let checkedCount = 0;
    checkboxes.forEach(cb => {
        const amountInput = document.getElementById(`contrib_amount_${cb.value}`);
        if (cb.checked) {
            amountInput.disabled = false;
            checkedCount++;
        } else {
            amountInput.disabled = true;
            amountInput.value = '';
        }
    });

    // Auto-split equally among checked if total is provided
    if (totalAmount > 0 && checkedCount > 0) {
        const splitAmount = (totalAmount / checkedCount).toFixed(2);
        
        let currentTotal = 0;
        let lastInput = null;

        checkboxes.forEach(cb => {
            if (cb.checked) {
                const amountInput = document.getElementById(`contrib_amount_${cb.value}`);
                amountInput.value = splitAmount;
                currentTotal += parseFloat(splitAmount);
                lastInput = amountInput;
            }
        });

        // Adjust rounding error on the last person
        if (lastInput && currentTotal !== totalAmount) {
            const diff = totalAmount - currentTotal;
            lastInput.value = (parseFloat(lastInput.value) + diff).toFixed(2);
        }
    }
}

async function handleAddGrocery(e) {
    e.preventDefault();
    const groupId = getActiveGroupId();
    if (!groupId) return;

    const itemName = document.getElementById('groceryItemName').value;
    const quantity = document.getElementById('groceryQuantity').value;
    const amount = parseFloat(document.getElementById('groceryAmount').value);
    const date = document.getElementById('groceryDate').value;
    
    // Gather contributors
    const contributors = [];
    let sum = 0;
    
    const checkboxes = document.querySelectorAll('.contributor-checkbox:checked');
    checkboxes.forEach(cb => {
        const amt = parseFloat(document.getElementById(`contrib_amount_${cb.value}`).value) || 0;
        if (amt > 0) {
            contributors.push({
                user_id: cb.value,
                amount_paid: amt
            });
            sum += amt;
        }
    });

    const errorEl = document.getElementById('contributorError');
    if (Math.abs(sum - amount) > 0.01) {
        errorEl.classList.remove('d-none');
        return;
    }
    errorEl.classList.add('d-none');

    try {
        await apiFetch('/api/groceries', {
            method: 'POST',
            body: {
                group_id: groupId,
                item_name: itemName,
                quantity: quantity,
                amount: amount,
                purchase_date: date,
                contributors: contributors
            }
        });

        const modal = bootstrap.Modal.getInstance(document.getElementById('addGroceryModal'));
        if (modal) modal.hide();
        document.getElementById('addGroceryForm').reset();
        
        loadGroceries();
    } catch (error) {
        alert(error.message || 'Failed to add grocery');
    }
}

async function deleteGrocery(id) {
    if (!confirm('Delete this grocery record?')) return;
    try {
        await apiFetch(`/api/groceries/${id}`, { method: 'DELETE' });
        loadGroceries();
    } catch (error) {
        alert(error.message || 'Failed to delete grocery');
    }
}
