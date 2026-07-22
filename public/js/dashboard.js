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
                    <small class="text-muted d-block">${nextMeal.description}</small>
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
        if (act.action.includes('Expense')) icon = 'bi-receipt text-danger';
        if (act.action.includes('Grocery')) icon = 'bi-cart text-success';
        if (act.action.includes('Meal')) icon = 'bi-cup-hot text-warning';
        if (act.action.includes('Payment')) icon = 'bi-cash-stack text-success';
        
        const dateStr = new Date(act.created_at).toLocaleString();
        
        const li = document.createElement('div');
        li.className = 'list-group-item p-3 d-flex align-items-center';
        li.innerHTML = `
            <div class="bg-light rounded-circle p-2 me-3 fs-5">
                <i class="bi ${icon}"></i>
            </div>
            <div>
                <strong>${act.action}</strong>
                <div class="text-muted small">${act.details || ''}</div>
                <div class="text-muted small" style="font-size: 0.75rem;">${dateStr}</div>
            </div>
        `;
        container.appendChild(li);
    });
}
