// dashboard.js - Dashboard Logic

let dashboardLoading = false;
let dashboardLoadedGroup = null;

document.addEventListener('DOMContentLoaded', () => {
    window.addEventListener('groupReady', () => requestDashboardData());
    window.addEventListener('groupChanged', () => requestDashboardData(true));

    if (getActiveGroupId()) {
        requestDashboardData();
    }
});

function requestDashboardData(force = false) {
    const groupId = getActiveGroupId();
    if (!groupId) return;
    if (dashboardLoading || (!force && dashboardLoadedGroup === String(groupId))) return;
    dashboardLoading = true;
    loadDashboardData(groupId).finally(() => {
        dashboardLoading = false;
        dashboardLoadedGroup = String(groupId);
    });
}

async function loadDashboardData(groupId) {

    try {
        // Settled (not all-or-nothing) so staff members still see the group
        // header and activity feed even though financials are restricted.
        const [groupRes, dashRes, activityRes] = await Promise.allSettled([
            apiFetch(`/api/groups/${groupId}`),
            // Silent: a staff restriction renders as an inline notice below.
            apiFetch(`/api/dashboard?group_id=${groupId}`, {}, true),
            apiFetch(`/api/groups/${groupId}/activities`)
        ]);

        if (groupRes.status === 'fulfilled' && groupRes.value.success && groupRes.value.data) {
            document.getElementById('groupNameHeader').textContent = groupRes.value.data.name + ' Dashboard';
        }

        if (dashRes.status === 'fulfilled' && dashRes.value.success && dashRes.value.data) {
            renderDashboardOverview(dashRes.value.data);
        } else if (dashRes.status === 'rejected' && String(dashRes.reason && dashRes.reason.message).includes('FINANCIALS_RESTRICTED')) {
            renderStaffNotice();
        }

        if (activityRes.status === 'fulfilled' && activityRes.value.success && activityRes.value.data) {
            renderActivities(activityRes.value.data);
        }

    } catch (error) {
        console.error("Dashboard data load failed", error);
    }
}

function renderStaffNotice() {
    const balanceTextEl = document.getElementById('dashBalanceText');
    if (balanceTextEl) balanceTextEl.textContent = 'Staff accounts show household tasks, not financials. Use Meals and Shopping List from the menu.';
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
                    <small class="text-muted d-block">${esc(nextMeal.veg_item) || ''}${nextMeal.nonveg_item ? ', ' + esc(nextMeal.nonveg_item) : ''}</small>
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
                <div class="text-muted small">${esc(act.description) || ''}</div>
            </div>
            <div class="text-muted small text-end" style="font-size: 0.75rem;">
                ${dateStr.split(',')[0]}<br>${dateStr.split(',')[1] || ''}
            </div>
        `;
        container.appendChild(li);
    });
}
