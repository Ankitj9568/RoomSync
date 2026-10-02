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
    // Role-specific homes: owners see PG oversight, staff see today's work,
    // roommates see the shared financial dashboard.
    const role = typeof getActiveGroupRole === 'function' ? getActiveGroupRole() : null;
    const isOwner = role === 'owner';
    const isStaff = role === 'staff';
    document.getElementById('ownerHome').classList.toggle('d-none', !isOwner);
    document.getElementById('staffHome').classList.toggle('d-none', !isStaff);
    document.getElementById('memberHome').classList.toggle('d-none', isOwner || isStaff);
    document.getElementById('memberQuickLinks').classList.toggle('d-none', isOwner || isStaff);

    try {
        const groupRes = await apiFetch(`/api/groups/${groupId}`);
        if (groupRes.success && groupRes.data) {
            document.getElementById('groupNameHeader').textContent = groupRes.data.name + ' Dashboard';
        }
    } catch (error) {
        console.error('Dashboard group load failed', error);
    }

    if (isOwner) return loadOwnerHome(groupId);
    if (isStaff) return loadStaffHome(groupId);
    return loadMemberDashboard(groupId);
}

async function loadMemberDashboard(groupId) {
    try {
        const [dashRes, activityRes] = await Promise.allSettled([
            apiFetch(`/api/dashboard?group_id=${groupId}`),
            apiFetch(`/api/groups/${groupId}/activities`)
        ]);

        if (dashRes.status === 'fulfilled' && dashRes.value.success && dashRes.value.data) {
            renderDashboardOverview(dashRes.value.data);
        }

        if (activityRes.status === 'fulfilled' && activityRes.value.success && activityRes.value.data) {
            renderActivities(activityRes.value.data);
        }

    } catch (error) {
        console.error("Dashboard data load failed", error);
    }
}

async function loadOwnerHome(groupId) {
    try {
        const res = await apiFetch(`/api/dashboard/owner?group_id=${groupId}`);
        if (!res.success || !res.data) return;
        const data = res.data;

        document.getElementById('ownerOccupancy').textContent = data.occupancy.total;
        const roles = Object.entries(data.occupancy.by_role || {}).map(([role, count]) => `${count} ${role}`).join(' · ');
        document.getElementById('ownerOccupancySub').textContent = roles || 'members';

        document.getElementById('ownerDues').textContent = `₹ ${Number(data.total_dues_to_owner || 0).toFixed(0)}`;
        document.getElementById('ownerDuesSub').textContent = data.dues_to_owner.length
            ? data.dues_to_owner.map(d => `${esc(d.from_name)}: ₹ ${Number(d.amount).toFixed(0)}`).join(', ')
            : 'no pending dues';

        document.getElementById('ownerRent').textContent = `₹ ${Number(data.rent_collected_month || 0).toFixed(0)}`;
        document.getElementById('ownerRentSub').textContent = `₹ ${Number(data.rent_pending_month || 0).toFixed(0)} awaiting approval`;

        document.getElementById('ownerTasks').innerHTML =
            `<span class="fw-bold text-warning">${data.tasks.pending}</span> pending · <span class="fw-bold text-success">${data.tasks.done}</span> done`;

        const paymentsEl = document.getElementById('ownerPayments');
        if (!data.recent_payments.length) {
            paymentsEl.innerHTML = '<div class="text-muted small">No payments yet.</div>';
        } else {
            paymentsEl.innerHTML = data.recent_payments.map(p =>
                `<div class="d-flex justify-content-between small border-bottom py-1">
                    <span>${esc(p.paid_by_name)} → ${esc(p.paid_to_name)}</span>
                    <span class="fw-medium">₹ ${Number(p.amount).toFixed(0)} <span class="badge bg-secondary ms-1">${esc(p.status)}</span></span>
                </div>`
            ).join('');
        }
    } catch (error) {
        console.error('Owner home load failed', error);
    }
}

async function loadStaffHome(groupId) {
    try {
        const dateStr = new Date().toISOString().split('T')[0];
        const [tasksRes, mealsRes] = await Promise.allSettled([
            apiFetch(`/api/tasks?group_id=${groupId}&assigned_to=me&status=pending`, {}, true),
            apiFetch(`/api/meals?group_id=${groupId}&date=${dateStr}`, {}, true)
        ]);

        const tasksEl = document.getElementById('staffTasks');
        if (tasksRes.status === 'fulfilled' && tasksRes.value.success) {
            const tasks = tasksRes.value.data || [];
            tasksEl.innerHTML = tasks.length
                ? tasks.slice(0, 5).map(t =>
                    `<div class="d-flex justify-content-between align-items-center border-bottom py-1">
                        <span class="small">${esc(t.title)} <span class="badge bg-secondary ms-1">${esc(t.category)}</span></span>
                        <button class="btn btn-sm btn-outline-success" onclick="completeStaffTask(${t.task_id})">Done</button>
                    </div>`).join('') + (tasks.length > 5 ? `<div class="small text-muted mt-1">+${tasks.length - 5} more</div>` : '')
                : '<div class="text-muted small">No pending tasks. Enjoy the day!</div>';
        }

        const headEl = document.getElementById('staffHeadcount');
        if (mealsRes.status === 'fulfilled' && mealsRes.value.success) {
            const meals = mealsRes.value.data || [];
            const lunch = meals.filter(m => m.meal_type === 'lunch' && m.is_attending).reduce((n, m) => n + 1 + Number(m.guest_count || 0), 0);
            const dinner = meals.filter(m => m.meal_type === 'dinner' && m.is_attending).reduce((n, m) => n + 1 + Number(m.guest_count || 0), 0);
            headEl.innerHTML = `<div>Lunch plates: <strong>${lunch}</strong></div><div>Dinner plates: <strong>${dinner}</strong></div>`;
        }
    } catch (error) {
        console.error('Staff home load failed', error);
    }
}

async function completeStaffTask(taskId) {
    try {
        await apiFetch(`/api/tasks/${taskId}/status`, { method: 'PATCH', body: { status: 'done' } });
        requestDashboardData(true);
    } catch (error) {
        alert(error.message || 'Failed to complete task');
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
