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
    
    // Render History
    renderPaymentHistory(recent_payments);
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

async function deletePayment(paymentId) {
    if (!confirm('Are you sure you want to delete this payment? This action cannot be undone.')) return;
    try {
        await apiFetch(`/api/payments/${paymentId}`, {
            method: 'DELETE'
        });
        // Reload data
        loadSettlements();
    } catch (error) {
        console.error("Failed to delete payment", error);
        alert(error.message || 'Failed to delete payment');
    }
}

function renderPaymentHistory(payments) {
    const tbody = document.getElementById('paymentHistoryTable');
    if (!payments || payments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No payment history yet.</td></tr>';
        return;
    }
    
    const currentUserId = parseInt(getUserId());
    let html = '';
    
    payments.forEach(pay => {
        const isPayee = pay.paid_to === currentUserId;
        const isPayer = pay.paid_by === currentUserId;
        
        let statusBadge = '';
        if (pay.status === 'approved') {
            statusBadge = '<span class="badge bg-success">Settled</span>';
        } else if (pay.status === 'rejected') {
            statusBadge = '<span class="badge bg-danger">Rejected</span>';
        } else {
            statusBadge = '<span class="badge bg-warning">Pending</span>';
        }
        
        let actionBtn = '';
        if (pay.status === 'pending' && isPayee) {
            actionBtn = `
                <button class="btn btn-sm btn-success me-1" onclick="verifyPayment(${pay.payment_id}, 'approved')" title="Approve">
                    <i class="bi bi-check-lg"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="verifyPayment(${pay.payment_id}, 'rejected')" title="Reject">
                    <i class="bi bi-x-lg"></i>
                </button>
            `;
        } else if (pay.status === 'pending' && isPayer) {
            actionBtn = '<span class="text-muted small me-2">Waiting...</span>';
        } else if (pay.status === 'approved') {
            let timeStr = '';
            if (pay.created_at) {
                const dateObj = new Date(pay.created_at);
                timeStr = dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            }
            actionBtn = `<span class="text-success small me-2"><i class="bi bi-check-all"></i> ${timeStr}</span>`;
        } else if (pay.status === 'rejected') {
            actionBtn = '<span class="text-danger small me-2"><i class="bi bi-x-circle"></i></span>';
        }

        if (isPayer) {
            actionBtn += `
                <button class="btn btn-sm btn-outline-danger" onclick="deletePayment(${pay.payment_id})" title="Delete Payment">
                    <i class="bi bi-trash"></i>
                </button>
            `;
        }

        const dateStr = new Date(pay.payment_date).toLocaleDateString();
        
        html += `
            <tr>
                <td class="ps-4">
                    <div class="fw-medium">${dateStr}</div>
                    <div class="small text-muted">${pay.payment_mode}</div>
                </td>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-2" style="width: 24px; height: 24px; font-size: 0.75rem;">
                            ${pay.paid_by_name.charAt(0).toUpperCase()}
                        </div>
                        ${pay.paid_by_name}
                    </div>
                </td>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="bg-secondary text-white rounded-circle d-flex align-items-center justify-content-center me-2" style="width: 24px; height: 24px; font-size: 0.75rem;">
                            ${pay.paid_to_name.charAt(0).toUpperCase()}
                        </div>
                        ${pay.paid_to_name}
                    </div>
                </td>
                <td class="fw-bold">₹ ${parseFloat(pay.amount).toFixed(0)}</td>
                <td>${statusBadge}</td>
                <td class="text-end pe-4">${actionBtn}</td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

async function verifyPayment(paymentId, status) {
    try {
        await apiFetch(`/api/payments/${paymentId}/verify`, {
            method: 'PATCH',
            body: { status }
        });
        loadSettlements(); // Refresh both debts and history
    } catch (error) {
        console.error("Verification failed", error);
        alert(error.message || "Failed to verify payment");
    }
}
