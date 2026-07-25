// dashboard.js - Dashboard Logic

document.addEventListener('DOMContentLoaded', () => {
    window.addEventListener('groupReady', loadDashboardData);
    window.addEventListener('groupChanged', loadDashboardData);

    if (getActiveGroupId()) {
        loadDashboardData();
    }
});

async function loadDashboardData() {
    const groupId = getActiveGroupId();
    if (!groupId) return;

    try {
        const groupRes = await apiFetch(`/api/groups/${groupId}`);
        if (groupRes.success && groupRes.data) {
            document.getElementById('groupNameHeader').textContent = groupRes.data.name + ' Dashboard';
        }

        const dashRes = await apiFetch(`/api/dashboard?group_id=${groupId}`);
        if (dashRes.success && dashRes.data) {
            renderDashboardOverview(dashRes.data);
        }

        const activityRes = await apiFetch(`/api/groups/${groupId}/activities`);
        if (activityRes.success && activityRes.data) {
            renderActivities(activityRes.data);
        }
        
    } catch (error) {
        console.error("Dashboard data load failed", error);
    }
}

function renderDashboardOverview(data) {
    const { totalSpend, myBalance, nextMeal } = data;
    
    // Total Spend
    document.getElementById('dashTotalSpend').textContent = `₹ ${parseFloat(totalSpend).toFixed(0)}`;
    
    // Balance
    const balanceEl = document.getElementById('dashBalanceAmount');
    const balanceTextEl = document.getElementById('dashBalanceText');
    
    const bal = parseFloat(myBalance);
    if (bal > 0.01) {
        balanceEl.textContent = `₹ ${bal.toFixed(2)}`;
        balanceEl.className = 'display-6 mt-3 text-success';
        balanceTextEl.textContent = 'The group owes you.';
    } else if (bal < -0.01) {
        balanceEl.textContent = `₹ ${Math.abs(bal).toFixed(2)}`;
        balanceEl.className = 'display-6 mt-3 text-danger';
        balanceTextEl.textContent = 'You owe the group.';
    } else {
        balanceEl.textContent = `₹ 0.00`;
        balanceEl.className = 'display-6 mt-3 text-muted';
        balanceTextEl.textContent = 'You are settled up.';
    }
    
    // Next Meal
    const mealContainer = document.getElementById('dashMealContainer');
    if (nextMeal) {
        const icon = nextMeal.meal_type === 'lunch' ? 'bi-sun text-warning' : 'bi-moon text-primary';
        const capType = nextMeal.meal_type.charAt(0).toUpperCase() + nextMeal.meal_type.slice(1);
        mealContainer.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-2">
                <div>
                    <h6 class="mb-0"><i class="bi ${icon} me-2"></i>${capType}</h6>
                    <small class="text-muted d-block">${nextMeal.veg_item || ''}${nextMeal.nonveg_item ? ', ' + nextMeal.nonveg_item : ''}</small>
                </div>
            </div>
            <div class="text-end">
                <a href="meals.html" class="btn btn-sm btn-outline-primary mt-2">View Menu</a>
            </div>
        `;
    } else {
        mealContainer.innerHTML = '<div class="text-center text-muted py-3">No upcoming meals today.</div>';
    }
}

function renderActivities(activities) {
    const container = document.getElementById('activityLogContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (activities.length === 0) {
        container.innerHTML = '<div class="list-group-item text-center text-muted py-4">No recent activity</div>';
        return;
    }
    
    activities.slice(0, 10).forEach(act => {
        let icon = 'bi-activity text-primary';
        let actionFriendly = act.action;
        
        // Map raw action codes to friendly names and icons
        if (act.action === 'ADDED_EXPENSE') {
            actionFriendly = 'Expense Added';
            icon = 'bi-receipt text-danger';
        } else if (act.action === 'ADDED_GROCERY') {
            actionFriendly = 'Grocery Added';
            icon = 'bi-cart text-success';
        } else if (act.action === 'COMPLETED_GROCERY') {
            actionFriendly = 'Grocery Purchased';
            icon = 'bi-cart-check text-success';
        } else if (act.action === 'ADDED_MEAL') {
            actionFriendly = 'Meal Scheduled';
            icon = 'bi-cup-hot text-warning';
        } else if (act.action === 'RECORDED_PAYMENT') {
            actionFriendly = 'Payment Recorded';
            icon = 'bi-cash-stack text-success';
        } else if (act.action === 'DELETED_EXPENSE') {
            actionFriendly = 'Expense Deleted';
            icon = 'bi-trash text-muted';
        }
        
        // Fallbacks for older formats if they exist
        if (act.action.includes('Expense') && act.action !== 'ADDED_EXPENSE') icon = 'bi-receipt text-danger';
        if (act.action.includes('Grocery') && act.action !== 'ADDED_GROCERY') icon = 'bi-cart text-success';
        if (act.action.includes('Meal') && act.action !== 'ADDED_MEAL') icon = 'bi-cup-hot text-warning';
        if (act.action.includes('Payment') && act.action !== 'RECORDED_PAYMENT') icon = 'bi-cash-stack text-success';
        
        // Helper to format 'relative' time (e.g. "2 hours ago")
        const dateStr = new Date(act.created_at).toLocaleString();
        
        const li = document.createElement('div');
        li.className = 'activity-item d-flex align-items-center';
        li.innerHTML = `
            <div class="activity-icon bg-light me-3">
                <i class="bi ${icon} fs-5"></i>
            </div>
            <div class="flex-grow-1">
                <div class="fw-medium text-dark">${actionFriendly}</div>
                <div class="text-muted small">${act.description || ''}</div>
            </div>
            <div class="text-muted small text-end" style="font-size: 0.75rem;">
                ${dateStr.split(',')[0]}<br>${dateStr.split(',')[1] || ''}
            </div>
        `;
        container.appendChild(li);
    });
}
