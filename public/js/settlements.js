// settlements.js - Settlements Logic

document.addEventListener('DOMContentLoaded', () => {
    if (getActiveGroupId()) {
        loadSettlements();
    }
    
    window.addEventListener('groupChanged', () => {
        loadSettlements();
    });
});

async function loadSettlements() {
    const groupId = getActiveGroupId();
    if (!groupId) return;

    try {
        const res = await apiFetch(`/api/payments/settlements?group_id=${groupId}`);
        const data = res.data;
        renderSettlements(data);
    } catch (error) {
        console.error("Settlements load failed", error);
    }
}

function renderSettlements(data) {
    const { debts, total_debt, total_settled, recent_payments } = data;
    
    // Render Stats
    const total = total_debt + total_settled;
    const percent = total > 0 ? Math.round((total_settled / total) * 100) : 0;
    
    document.getElementById('clearedPercentText').textContent = `${percent}%`;
    document.getElementById('clearedProgressBar').style.width = `${percent}%`;
    document.getElementById('clearedProgressBar').setAttribute('aria-valuenow', percent);
    document.getElementById('clearedAmountText').textContent = `₹ ${total_settled.toFixed(0)} Settled`;
    document.getElementById('pendingAmountText').textContent = `₹ ${total_debt.toFixed(0)} Pending`;
    
    if (recent_payments && recent_payments.length > 0) {
        const latest = recent_payments[0];
        document.getElementById('lastSettlementAmount').textContent = `₹ ${latest.amount}`;
        const dateStr = new Date(latest.payment_date).toLocaleDateString();
        // Since we don't have the names easily without another fetch, we might just show "Recent Payment"
        // In a real app we'd join with users. For now, it's fine.
        document.getElementById('lastSettlementText').innerHTML = `Recent payment on <span class="text-muted small float-end">${dateStr}</span>`;
    } else {
        document.getElementById('lastSettlementAmount').textContent = '-';
        document.getElementById('lastSettlementText').textContent = 'No recent settlements';
    }
    
    // Render Debts
    const container = document.getElementById('debtsContainer');
    let html = '';
    
    if (debts.length === 0) {
        html = '<div class="col-12 text-center text-muted py-4">All settled up! No pending debts.</div>';
    } else {
        const currentUserId = parseInt(getUserId());
        
        debts.forEach(debt => {
            const isPayer = debt.from_id === currentUserId;
            const isPayee = debt.to_id === currentUserId;
            const amountStr = parseFloat(debt.amount).toFixed(2);
            
            const fromInitial = debt.from_name.charAt(0).toUpperCase();
            const toInitial = debt.to_name.charAt(0).toUpperCase();
            
            let actionHtml = '';
            if (isPayer) {
                actionHtml = `<button class="btn btn-success" type="button" onclick="preparePaymentModal(${debt.to_id}, '${debt.to_name}', ${debt.amount})"><i class="bi bi-check2-circle me-1"></i> Log Payment</button>`;
            } else if (isPayee) {
                actionHtml = `<button class="btn btn-outline-secondary" disabled>Waiting for Payment</button>`;
            } else {
                actionHtml = `<button class="btn btn-outline-secondary" disabled>Not involved</button>`;
            }
            
            html += `
                <div class="col-md-6 mb-4">
                    <div class="card h-100 border-0 shadow-sm">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center mb-4">
                                <div class="d-flex align-items-center">
                                    <div class="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" style="width: 48px; height: 48px; font-weight: bold;">
                                        ${fromInitial}
                                    </div>
                                    <i class="bi bi-arrow-right mx-3 text-muted"></i>
                                    <div class="bg-secondary text-white rounded-circle d-flex align-items-center justify-content-center" style="width: 48px; height: 48px; font-weight: bold;">
                                        ${toInitial}
                                    </div>
                                </div>
                                <div class="text-end">
                                    <h4 class="${isPayer ? 'text-danger' : isPayee ? 'text-success' : 'text-dark'} mb-0">₹ ${amountStr}</h4>
                                </div>
                            </div>
                            <p class="mb-4"><strong>${debt.from_name}</strong> owes <strong>${debt.to_name}</strong></p>
                            <div class="d-grid gap-2 d-md-flex justify-content-md-end">
                                ${actionHtml}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
    }
    
    container.innerHTML = html;
}

function preparePaymentModal(toId, toName, amount) {
    document.getElementById('recordPaymentForm').reset();
    document.getElementById('modalPayeeName').textContent = toName;
    document.getElementById('modalPaymentAmount').value = amount;
    
    const modalEl = document.getElementById('recordPaymentModal');
    modalEl.dataset.targetUserId = toId;
    
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
}

async function recordPayment() {
    const groupId = getActiveGroupId();
    if (!groupId) return;
    
    const amount = document.getElementById('modalPaymentAmount').value;
    const mode = document.getElementById('modalPaymentMode').value;
    const note = document.getElementById('modalPaymentNote').value;
    const comboDetails = document.getElementById('modalPaymentCombo').value;
    
    let finalNote = note;
    if (mode === 'Combination' && comboDetails) {
        finalNote += ` (Combo: ${comboDetails})`;
    }
    
    if (!amount) {
        alert("Please enter an amount.");
        return;
    }
    
    const modalEl = document.getElementById('recordPaymentModal');
    const toUserId = modalEl.dataset.targetUserId;
    
    try {
        await apiFetch('/api/payments', {
            method: 'POST',
            body: { 
                group_id: groupId, 
                paid_to: parseInt(toUserId),
                amount: parseFloat(amount),
                payment_mode: mode,
                note: finalNote,
                payment_date: new Date().toISOString().split('T')[0]
            }
        });
        
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
        
        loadSettlements();
        
    } catch (error) {
        console.error("Failed to record payment", error);
        alert(error.message || "Failed to log payment");
    }
}
